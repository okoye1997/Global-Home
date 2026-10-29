import Link from 'next/link';
import mongoose from 'mongoose';
import { notFound, redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { isLocale, money } from '@/lib/i18n';
import { Property, PropertyMedia } from '@/lib/models';
import { CountryBadge } from '@/components/CountryBadge';
import { AdminPropertyWorkflow } from '@/components/AdminPropertyWorkflow';
import { AdminAvailabilityForm } from '@/components/AdminAvailabilityForm';
import { AdminPropertyEditForm } from '@/components/AdminPropertyEditForm';
import { AdminLifecycleActions } from '@/components/AdminLifecycleActions';
import { AdminMediaManager } from '@/components/AdminMediaManager';

export default async function AdminProperty({params}:{params:Promise<{locale:string;id:string}>}){
  const {locale,id}=await params;if(!isLocale(locale)||!mongoose.isValidObjectId(id))notFound();const user=await currentUser();if(!user)redirect(`/${locale}/login`);if(user.role!=='admin')notFound();
  const property=await Property.findById(id).lean();if(!property)notFound();
  const media=await PropertyMedia.find({propertyId:id}).select('alt status isCover sortOrder').sort({isCover:-1,sortOrder:1,createdAt:1}).lean();
  return <main className="section wrap"><p><Link href={`/${locale}/admin/properties`}>← Property management</Link></p><h1>{property.title}</h1><p><CountryBadge code={property.countryCode} city={property.city}/> · {money(property.localPriceMinor,property.currencyCode,locale)}</p><p>Purpose: {property.purpose} · Type: {property.propertyType} · Verification: {property.isDemo ? 'illustrative' : property.verificationStatus}</p><AdminPropertyEditForm property={{id,title:property.title,description:property.description||'',region:property.region||'',city:property.city,addressText:property.addressText||'',latitude:property.location?.coordinates?.[1]||0,longitude:property.location?.coordinates?.[0]||0,localPriceMinor:property.localPriceMinor,currencyCode:property.currencyCode,bedrooms:property.bedrooms,bathrooms:property.bathrooms,landAreaSqm:property.landAreaSqm,buildingAreaSqm:property.buildingAreaSqm,amenities:property.amenities||[]}}/><AdminAvailabilityForm id={id} initial={property.availabilityStatus || 'available'}/><AdminLifecycleActions id={id} status={property.status}/><AdminPropertyWorkflow id={id} status={property.status} isDemo={property.isDemo} media={media.map(item=>({id:String(item._id),alt:item.alt,status:item.status,isCover:item.isCover}))}/><AdminMediaManager propertyId={id} items={media.map(item=>({id:String(item._id),alt:item.alt,status:item.status,isCover:item.isCover,sortOrder:item.sortOrder||0}))} videoUrl={property.videoUrl||''} virtualTourUrl={property.virtualTourUrl||''}/></main>;
}


