import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { currentUser } from '@/lib/auth';
import { canChangeDealStatus, dealStatuses, type DealStatus } from '@/lib/deal-status';
import { AuditEvent, Enquiry, User } from '@/lib/models';
import { notifyAccount } from '@/lib/notification-service';

const updateSchema = z.object({
  status: z.enum(dealStatuses),
  note: z.string().trim().max(1000).optional(),
  agreedAmountMinor: z.number().int().positive().safe().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: 'Invalid enquiry' }, { status: 400 });
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid deal update' }, { status: 400 });
  const enquiry = await Enquiry.findById(id).lean();
  if (!enquiry) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (actor.role !== 'admin' && String(enquiry.userId) !== String(actor._id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const role = actor.role === 'admin' ? 'admin' : 'user';
  if (!canChangeDealStatus(enquiry.status as DealStatus, parsed.data.status, role)) return NextResponse.json({ error: 'Invalid deal transition' }, { status: 409 });
  if (role === 'user' && (parsed.data.note || parsed.data.agreedAmountMinor)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (parsed.data.status === 'agreed' && !parsed.data.agreedAmountMinor && !enquiry.agreedAmountMinor) return NextResponse.json({ error: 'Agreed amount is required' }, { status: 400 });
  const updated = await Enquiry.findOneAndUpdate({ _id: id, status: enquiry.status }, { $set: {
    status: parsed.data.status, updatedBy: actor._id,
    ...(parsed.data.note !== undefined ? { statusNote: parsed.data.note } : {}),
    ...(parsed.data.agreedAmountMinor !== undefined ? { agreedAmountMinor: parsed.data.agreedAmountMinor } : {}),
    ...(['completed', 'cancelled', 'closed'].includes(parsed.data.status) ? { closedAt: new Date() } : {}),
  } }, { new: true }).lean();
  if (!updated) return NextResponse.json({ error: 'Deal changed; refresh and retry' }, { status: 409 });
  await AuditEvent.create({ actorId: actor._id, action: 'enquiry.status_changed', targetType: 'Enquiry', targetId: enquiry._id, metadata: { from: enquiry.status, to: parsed.data.status } });
  if (role === 'admin') {
    const owner = await User.findById(enquiry.userId).select('email preferredLocale').lean();
    if (owner) await notifyAccount({ userId: String(owner._id), email: owner.email, locale: owner.preferredLocale || 'en', key: 'enquiry.updated', payload: { enquiryId: id, status: parsed.data.status } });
  }
  return NextResponse.json({ status: updated.status, agreedAmountMinor: updated.agreedAmountMinor || null });
}
