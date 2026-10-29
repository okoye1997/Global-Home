import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import sharp from 'sharp';
import { currentUser } from '@/lib/auth';
import { AuditEvent, Property, PropertyMedia } from '@/lib/models';
import { putPrivateObject } from '@/lib/storage';

export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const form = await req.formData();
  const propertyId = String(form.get('propertyId') || '');
  const alt = String(form.get('alt') || '').trim();
  const rightsConfirmed = form.get('rightsConfirmed') === 'true';
  const file = form.get('file');
  if (!mongoose.isValidObjectId(propertyId) || !await Property.exists({ _id: propertyId }) || !alt || alt.length > 200 || !rightsConfirmed || !(file instanceof File)) return NextResponse.json({ error: 'Invalid media request' }, { status: 400 });
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024 || file.size < 100) return NextResponse.json({ error: 'Unsupported image' }, { status: 400 });
  try {
    const input = Buffer.from(await file.arrayBuffer());
    const metadata = await sharp(input, { limitInputPixels: 30_000_000 }).metadata();
    if (!['jpeg', 'png', 'webp'].includes(metadata.format || '')) throw new Error('Unsupported image');
    const image = await sharp(input).rotate().resize({ width: 1600, height: 1200, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
    const objectKey = `properties/${propertyId}/${randomUUID()}.webp`;
    await putPrivateObject(objectKey, image.data, 'image/webp');
    const media = await PropertyMedia.create({ propertyId, objectKey, alt, mimeType: 'image/webp', sizeBytes: image.data.length, width: image.info.width, height: image.info.height, rightsConfirmedAt: new Date(), uploadedBy: user._id, status: 'pending' });
    await AuditEvent.create({ actorId: user._id, action: 'media.upload', targetType: 'PropertyMedia', targetId: media._id });
    return NextResponse.json({ id: media.id, status: media.status }, { status: 201 });
  } catch { return NextResponse.json({ error: 'Image upload failed' }, { status: 400 }); }
}
