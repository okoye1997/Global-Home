import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { z } from 'zod';
import { currentUser } from '@/lib/auth';
import { AuditEvent, Property, PropertyMedia } from '@/lib/models';
import { deletePrivateObject } from '@/lib/storage';

const updateSchema = z.object({ status: z.enum(['approved','rejected']).optional(), isCover: z.boolean().optional(), sortOrder: z.number().int().min(0).max(10000).optional(), alt: z.string().trim().min(1).max(200).optional() }).strict();

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const parsed = updateSchema.safeParse(await req.json());
  if (!mongoose.isValidObjectId(id) || !parsed.success || !Object.keys(parsed.data).length) return NextResponse.json({ error: 'Invalid media' }, { status: 400 });
  const media = await PropertyMedia.findById(id);
  if (!media) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const nextStatus=parsed.data.status||media.status;
  if(parsed.data.isCover&&nextStatus!=='approved')return NextResponse.json({error:'Only approved images can be covers'},{status:400});
  if((parsed.data.status==='rejected'||parsed.data.isCover===false)&&media.isCover&&await Property.exists({_id:media.propertyId,status:'published'}))return NextResponse.json({error:'Select a replacement cover before removing the published cover'},{status:409});
  if (parsed.data.isCover && nextStatus === 'approved') await PropertyMedia.updateMany({ propertyId: media.propertyId, _id:{$ne:media._id} }, { $set: { isCover: false } });
  await PropertyMedia.updateOne({ _id: id }, { $set: { ...parsed.data, reviewedBy: user._id, reviewedAt: new Date() } });
  await AuditEvent.create({ actorId: user._id, action: 'media.update', targetType: 'PropertyMedia', targetId: media._id, metadata: { fields:Object.keys(parsed.data) } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req:NextRequest,{params}:{params:Promise<{id:string}>}){
  const user=await currentUser();
  if(!user||user.role!=='admin')return NextResponse.json({error:'Forbidden'},{status:403});
  const {id}=await params;
  if(!mongoose.isValidObjectId(id))return NextResponse.json({error:'Invalid media'},{status:400});
  const media=await PropertyMedia.findById(id).select('+objectKey');
  if(!media)return NextResponse.json({error:'Not found'},{status:404});
  if(media.isCover&&await Property.exists({_id:media.propertyId,status:'published'}))return NextResponse.json({error:'Select a replacement cover before deleting the published cover'},{status:409});
  try{await deletePrivateObject(media.objectKey);}catch{return NextResponse.json({error:'Storage deletion failed'},{status:503});}
  await PropertyMedia.deleteOne({_id:id});
  await AuditEvent.create({actorId:user._id,action:'media.delete',targetType:'PropertyMedia',targetId:media._id,metadata:{propertyId:String(media.propertyId)}});
  return NextResponse.json({ok:true});
}
