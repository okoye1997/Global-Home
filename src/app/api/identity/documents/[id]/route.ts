import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { AuditEvent, Document } from '@/lib/models';
import { signedPrivateDownload } from '@/lib/storage';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const document = await Document.findOne({ _id: id, visibility: 'private', kind: { $in: ['passport', 'national_id', 'drivers_licence'] }, ...(user.role === 'admin' ? {} : { ownerId: user._id }) }).select('+objectKey').lean();
  if (!document) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  try {
    const url = await signedPrivateDownload(document.objectKey, `identity-document-${id}`);
    await AuditEvent.create({ actorId: user._id, action: 'identity.document_access', targetType: 'Document', targetId: document._id });
    return NextResponse.redirect(url, { headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
  } catch {
    return NextResponse.json({ error: 'Document storage unavailable' }, { status: 503 });
  }
}
