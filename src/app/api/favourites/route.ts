import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { currentUser } from '@/lib/auth';
import { Favourite, Property } from '@/lib/models';
import { publicPropertyFilter } from '@/lib/property-publication';
export async function GET(){const user=await currentUser();if(!user)return NextResponse.json({error:'Unauthorized'},{status:401});const items=await Favourite.find({userId:user._id}).populate({path:'propertyId',match:publicPropertyFilter,select:'slug title countryCode currencyCode localPriceMinor city'}).lean();return NextResponse.json({items:items.filter(item=>item.propertyId)})}
export async function POST(req:NextRequest){const user=await currentUser();if(!user)return NextResponse.json({error:'Unauthorized'},{status:401});const {propertyId}=await req.json();if(!mongoose.isValidObjectId(propertyId)||!await Property.exists({_id:propertyId,...publicPropertyFilter}))return NextResponse.json({error:'Invalid property'},{status:400});await Favourite.updateOne({userId:user._id,propertyId},{$setOnInsert:{userId:user._id,propertyId}},{upsert:true});return NextResponse.json({ok:true})}
export async function DELETE(req:NextRequest){const user=await currentUser();if(!user)return NextResponse.json({error:'Unauthorized'},{status:401});const {propertyId}=await req.json();if(!mongoose.isValidObjectId(propertyId))return NextResponse.json({error:'Invalid property'},{status:400});await Favourite.deleteOne({userId:user._id,propertyId});return NextResponse.json({ok:true})}
