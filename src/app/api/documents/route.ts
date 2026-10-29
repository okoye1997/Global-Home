import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { Document } from '@/lib/models';
import { privateDocumentKinds } from '@/lib/document-files';

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const items = await Document.find({ ownerId: user._id, kind: { $in: privateDocumentKinds }, visibility: 'private' }).select('title kind mimeType sizeBytes scanStatus propertyId createdAt').sort({ createdAt: -1 }).limit(100).lean();
  return NextResponse.json({ items }, { headers: { 'Cache-Control': 'no-store' } });
}
