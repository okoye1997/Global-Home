import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { currentUser } from '@/lib/auth';
import { AuditEvent, Document, IdentityVerification, User } from '@/lib/models';
import { notifyAccount } from '@/lib/notification-service';

const reviewSchema = z.object({ status: z.enum(['under_review', 'approved', 'rejected', 'resubmission_required']), note: z.string().trim().max(1000).default('') });

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: 'Invalid verification' }, { status: 400 });
  const parsed = reviewSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid decision' }, { status: 400 });
  const verification = await IdentityVerification.findById(id);
  if (!verification || !['submitted', 'under_review'].includes(verification.status)) return NextResponse.json({ error: 'Verification is not reviewable' }, { status: 409 });
  const { status, note } = parsed.data;
  if (status === 'approved') {
    const documents = await Document.find({ _id: { $in: verification.documentIds }, ownerId: verification.userId, visibility: 'private' }).select('scanStatus').lean();
    if (!documents.length || documents.length !== verification.documentIds.length || documents.some(document => document.scanStatus !== 'clean')) return NextResponse.json({ error: 'All documents require a clean malware scan before approval' }, { status: 409 });
  }
  if (['rejected', 'resubmission_required'].includes(status) && note.length < 10) return NextResponse.json({ error: 'Provide a review reason' }, { status: 400 });
  verification.status = status;
  verification.reviewNote = note;
  verification.reviewedBy = user._id;
  verification.reviewedAt = new Date();
  await verification.save();
  await AuditEvent.create({ actorId: user._id, action: `identity.${status}`, targetType: 'IdentityVerification', targetId: verification._id });
  const owner = await User.findById(verification.userId).select('email preferredLocale').lean();
  if (owner) await notifyAccount({ userId: String(owner._id), email: owner.email, locale: owner.preferredLocale || 'en', key: 'identity.decision', emailKind: 'identityDecision', payload: { status } });
  return NextResponse.json({ status });
}
