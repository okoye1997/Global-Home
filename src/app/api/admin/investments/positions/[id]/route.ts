import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { currentUser } from '@/lib/auth';
import { AuditEvent, IdentityVerification, InvestmentPosition } from '@/lib/models';

const schema = z.object({ action: z.enum(['activate', 'close']), settlementReference: z.string().trim().min(8).max(500).optional() }).strict();

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await currentUser();
  if (!admin || admin.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: 'Invalid position' }, { status: 400 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid update' }, { status: 400 });
  const position = await InvestmentPosition.findById(id).select('userId status').lean();
  if (!position) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (parsed.data.action === 'activate') {
    if (position.status !== 'pending' || !parsed.data.settlementReference) return NextResponse.json({ error: 'Pending position and settlement reference required' }, { status: 409 });
    if (!await IdentityVerification.exists({ userId: position.userId, status: 'approved' })) return NextResponse.json({ error: 'Approved identity verification required' }, { status: 403 });
    try {
      const updated = await InvestmentPosition.findOneAndUpdate({ _id: id, status: 'pending' }, { $set: { status: 'active', settlementReference: parsed.data.settlementReference, activatedAt: new Date() } }, { new: true }).select('status').lean();
      if (!updated) return NextResponse.json({ error: 'Position changed; refresh and retry' }, { status: 409 });
    } catch { return NextResponse.json({ error: 'Settlement reference already recorded or invalid' }, { status: 409 }); }
  } else {
    const updated = await InvestmentPosition.findOneAndUpdate({ _id: id, status: 'active' }, { $set: { status: 'closed' } }, { new: true }).select('status').lean();
    if (!updated) return NextResponse.json({ error: 'Only active positions can close' }, { status: 409 });
  }
  await AuditEvent.create({ actorId: admin._id, action: `investment.position_${parsed.data.action}`, targetType: 'InvestmentPosition', targetId: position._id });
  return NextResponse.json({ status: parsed.data.action === 'activate' ? 'active' : 'closed' });
}
