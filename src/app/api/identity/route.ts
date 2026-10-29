import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { identityFileLimit, identityKinds, detectedIdentityMime, validIdentityExtension } from '@/lib/identity-files';
import { AuditEvent, Document, IdentityVerification } from '@/lib/models';
import { consumeRateLimit } from '@/lib/rate-limit';
import { putPrivateObject } from '@/lib/storage';
import { notifyAccount } from '@/lib/notification-service';

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const verification = await IdentityVerification.findOne({ userId: user._id }).select('status documentIds reviewedAt reviewNote').lean();
  return NextResponse.json({ verification: verification || { status: 'not_started', documentIds: [] } }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!user.emailVerifiedAt) return NextResponse.json({ error: 'Verify your email first' }, { status: 403 });
  if (!await consumeRateLimit('identity-submit', String(user._id), 3, 24 * 60 * 60_000)) return NextResponse.json({ error: 'Too many submissions' }, { status: 429 });
  const existing = await IdentityVerification.findOne({ userId: user._id });
  if (existing && !['not_started', 'rejected', 'resubmission_required'].includes(existing.status)) return NextResponse.json({ error: 'Submission is already in review' }, { status: 409 });
  const form = await request.formData();
  const kind = String(form.get('kind') || '');
  const file = form.get('file');
  if (!identityKinds.includes(kind as typeof identityKinds[number]) || !(file instanceof File) || file.size < 100 || file.size > identityFileLimit) return NextResponse.json({ error: 'Invalid document' }, { status: 400 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mimeType = detectedIdentityMime(bytes);
  if (!mimeType || mimeType !== file.type || !validIdentityExtension(file.name, mimeType)) return NextResponse.json({ error: 'Unsupported document content' }, { status: 400 });
  const objectKey = `identity/${user._id}/${randomUUID()}`;
  try {
    await putPrivateObject(objectKey, bytes, mimeType);
    const document = await Document.create({ ownerId: user._id, objectKey, kind, mimeType, sizeBytes: bytes.length, visibility: 'private', scanStatus: 'pending' });
    const verification = await IdentityVerification.findOneAndUpdate({ userId: user._id, status: { $in: ['not_started', 'rejected', 'resubmission_required'] } }, { $set: { status: 'submitted', documentIds: [document._id] }, $unset: { reviewedBy: 1, reviewedAt: 1, reviewNote: 1 } }, { new: true });
    if (!verification && !existing) await IdentityVerification.create({ userId: user._id, status: 'submitted', documentIds: [document._id] });
    else if (!verification) return NextResponse.json({ error: 'Submission is already in review' }, { status: 409 });
    await AuditEvent.create({ actorId: user._id, action: 'identity.submit', targetType: 'IdentityVerification', targetId: verification?._id || document._id });
    await notifyAccount({ userId: String(user._id), email: user.email, locale: user.preferredLocale || 'en', key: 'identity.submitted', emailKind: 'identitySubmitted' });
    return NextResponse.json({ status: 'submitted' }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Document submission failed' }, { status: 503 });
  }
}
