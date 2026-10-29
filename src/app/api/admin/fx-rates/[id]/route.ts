import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { currentUser } from '@/lib/auth';
import { AuditEvent, Country, FxRate } from '@/lib/models';

const decisionSchema = z.object({ approved: z.boolean() }).strict();

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: 'Invalid FX rate' }, { status: 400 });
  const parsed = decisionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid decision' }, { status: 400 });
  const rate = await FxRate.findById(id);
  if (!rate) return NextResponse.json({ error: 'FX rate not found' }, { status: 404 });
  if (parsed.data.approved) {
    if (!await Country.exists({ currencyCode: rate.quoteCurrency, enabled: true })) return NextResponse.json({ error: 'Currency is not enabled' }, { status: 400 });
    if (rate.effectiveAt.getTime() > Date.now() || Date.now() - rate.effectiveAt.getTime() > 48 * 60 * 60 * 1000) return NextResponse.json({ error: 'FX snapshot is stale' }, { status: 400 });
  }
  await FxRate.updateOne({ _id: rate._id }, { $set: { approved: parsed.data.approved, approvedBy: parsed.data.approved ? user._id : null, approvedAt: parsed.data.approved ? new Date() : null } });
  await AuditEvent.create({ actorId: user._id, action: parsed.data.approved ? 'fx.approve' : 'fx.revoke', targetType: 'FxRate', targetId: rate._id });
  return NextResponse.json({ ok: true, approved: parsed.data.approved });
}
