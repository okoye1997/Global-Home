import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { Property, PropertyMedia } from '@/lib/models';
import { signedPrivateDownload } from '@/lib/storage';
import { publicPropertyFilter } from '@/lib/property-publication';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const media = await PropertyMedia.findOne({ _id: id, status: 'approved' }).select('+objectKey').lean();
  if (!media || !await Property.exists({ _id: media.propertyId, ...publicPropertyFilter })) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.redirect(await signedPrivateDownload(media.objectKey));
}
