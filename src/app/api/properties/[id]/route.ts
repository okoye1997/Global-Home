import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { z } from 'zod';
import { currentUser } from '@/lib/auth';
import { AuditEvent, Country, FxRate, Property, PropertyMedia } from '@/lib/models';
import { purposes, validateLocalPrice } from '@/lib/pricing';
import { assertPublicationTransition, assertWorkflowTransition, propertyStatuses } from '@/lib/property-publication';
import { safeMediaUrl } from '@/lib/media-url';

const updateSchema=z.object({
  title:z.string().min(3).optional(),description:z.string().optional(),
  status:z.enum(propertyStatuses).optional(),localPriceMinor:z.number().int().safe().positive().optional(),
  city:z.string().min(1).optional(),region:z.string().optional(),addressText:z.string().optional(),
  bedrooms:z.number().int().min(0).max(1000).optional(),bathrooms:z.number().int().min(0).max(1000).optional(),
  landAreaSqm:z.number().finite().min(0).optional(),buildingAreaSqm:z.number().finite().min(0).optional(),
  amenities:z.array(z.string().trim().min(1).max(100)).max(50).optional(),
  latitude:z.number().min(-90).max(90).optional(),longitude:z.number().min(-180).max(180).optional(),
  availabilityStatus:z.enum(['available','reserved','unavailable','sold','rented','leased']).optional(),
  videoUrl:z.string().max(1000).optional(),virtualTourUrl:z.string().max(1000).optional(),
  verificationSource:z.enum(['admin_review','authorized_import','verified_owner']).optional(),
  verificationReference:z.string().trim().min(8).max(500).optional(),
  verificationNote:z.string().trim().max(2000).optional(),
}).strict();

export async function PATCH(req:NextRequest,{params}:{params:Promise<{id:string}>}){
  const user=await currentUser();
  if(!user||user.role!=='admin')return NextResponse.json({error:'Forbidden'},{status:403});
  const {id}=await params;
  if(!mongoose.isValidObjectId(id))return NextResponse.json({error:'Invalid property'},{status:400});
  const parsed=updateSchema.safeParse(await req.json());
  if(!parsed.success)return NextResponse.json({error:'Invalid update'},{status:400});
  const property=await Property.findById(id);
  if(!property)return NextResponse.json({error:'Not found'},{status:404});
  const data:Record<string,unknown>={...parsed.data};
  try{
    if(parsed.data.status)assertWorkflowTransition(property.status,parsed.data.status);
    if((parsed.data.latitude===undefined)!==(parsed.data.longitude===undefined))throw new Error('Latitude and longitude must be updated together');
    if(parsed.data.latitude!==undefined&&parsed.data.longitude!==undefined){data.location={type:'Point',coordinates:[parsed.data.longitude,parsed.data.latitude]};delete data.latitude;delete data.longitude;}
    for(const field of ['videoUrl','virtualTourUrl'] as const){const value=parsed.data[field];if(value!==undefined){if(value.trim()&&!safeMediaUrl(value))throw new Error('Media links must be valid HTTPS URLs without embedded credentials');data[field]=value.trim()?safeMediaUrl(value):'';}}
    if(parsed.data.availabilityStatus)data.available=parsed.data.availabilityStatus==='available';
    if(parsed.data.status!=='verified'&&(parsed.data.verificationSource||parsed.data.verificationReference||parsed.data.verificationNote))throw new Error('Verification evidence requires a verification decision');
    const materialChange=parsed.data.localPriceMinor!==undefined||['title','description','city','region','addressText','latitude','longitude','bedrooms','bathrooms','landAreaSqm','buildingAreaSqm','amenities','videoUrl','virtualTourUrl'].some(key=>parsed.data[key as keyof typeof parsed.data]!==undefined);
    if(materialChange){
      if(parsed.data.status&&!['draft','pending_verification'].includes(parsed.data.status))throw new Error('Reverify a changed price before publication');
      if(parsed.data.verificationSource||parsed.data.verificationReference)throw new Error('Submit verification after changing the price');
      Object.assign(data,{verificationStatus:'pending',status:'pending_verification'});
    }
    if(parsed.data.localPriceMinor!==undefined){
      const country=await Country.findOne({code:property.countryCode,enabled:true});
      const fx=await FxRate.findOne({baseCurrency:'USD',quoteCurrency:country?.currencyCode,approved:true,effectiveAt:{$lte:new Date()}}).sort({effectiveAt:-1});
      if(!country||!fx)throw new Error('Approved FX rate required');
      const validation=validateLocalPrice(property.purpose as typeof purposes[number],parsed.data.localPriceMinor,country.currencyCode,{baseCurrency:'USD',quoteCurrency:country.currencyCode,rate:fx.rate,provider:fx.provider,effectiveAt:fx.effectiveAt,fetchedAt:fx.fetchedAt});
      Object.assign(data,{...validation,verificationStatus:'pending',status:'pending_verification'});
    }
    if(parsed.data.status==='verified'){
      if(property.status==='published' && !parsed.data.verificationSource && !parsed.data.verificationReference){
        if(property.verificationStatus!=='verified'||!property.verifiedAt)throw new Error('Listing has no valid verification decision');
      }else{
        assertPublicationTransition({...property.toObject(),...data},'verified');
        Object.assign(data,{verificationStatus:'verified',verifiedBy:user._id,verifiedAt:new Date()});
      }
    }
    if(parsed.data.status==='published'){
      assertPublicationTransition(property.toObject(),'published');
      if(!await Country.exists({code:property.countryCode,currencyCode:property.currencyCode,enabled:true}))throw new Error('Country and currency must be enabled');
      if(!await PropertyMedia.exists({propertyId:property._id,status:'approved',isCover:true}))throw new Error('An approved cover image is required');
      Object.assign(data,{publishedBy:user._id,publishedAt:new Date()});
    }
    if(parsed.data.status==='rejected')data.verificationStatus='rejected';
    if(parsed.data.status==='pending_verification')data.verificationStatus='pending';
    if(parsed.data.status==='draft'&&property.status==='archived')data.verificationStatus='pending';
    if(Object.keys(data).length===0)return NextResponse.json({error:'Empty update'},{status:400});
    data.updatedBy=user._id;
    const unset=materialChange||['rejected','pending_verification'].includes(parsed.data.status||'')||(parsed.data.status==='draft'&&property.status==='archived')?{verifiedAt:1,verifiedBy:1,verificationSource:1,verificationReference:1}:{};
    await Property.updateOne({_id:id},{$set:data,$unset:unset});
    const action=parsed.data.status==='verified'&&property.status==='published'?'property.unpublish':parsed.data.status==='draft'&&property.status==='archived'?'property.restore':parsed.data.availabilityStatus?'property.availability':parsed.data.status?`property.${parsed.data.status}`:'property.update';
    await AuditEvent.create({actorId:user._id,action,targetType:'Property',targetId:property._id,metadata:{fields:Object.keys(data),verificationReference:parsed.data.verificationReference}});
    return NextResponse.json({ok:true,status:data.status||property.status});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Invalid update'},{status:400});}
}
