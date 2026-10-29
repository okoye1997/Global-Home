import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { currentUser } from '@/lib/auth';
import { AuditEvent, InvestmentDistribution, InvestmentPosition } from '@/lib/models';

const schema = z.object({
  positionId: z.string().refine(mongoose.isValidObjectId),
  amountMinor: z.number().int().positive().safe(),
  period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  paymentReference: z.string().trim().min(8).max(500),
  paidAt: z.iso.datetime(),
}).strict();

export async function POST(request: NextRequest) {
  const admin = await currentUser();
  if (!admin || admin.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid distribution record' }, { status: 400 });
  const position = await InvestmentPosition.findOne({ _id: parsed.data.positionId, status: 'active' }).select('currencyCode').lean();
  if (!position) return NextResponse.json({ error: 'Active position required' }, { status: 409 });
  const paidAt = new Date(parsed.data.paidAt);
  if (paidAt.getTime() > Date.now()) return NextResponse.json({ error: 'Future payments cannot be recorded as paid' }, { status: 400 });
  let distribution;
  try {
    distribution = await InvestmentDistribution.create({ positionId: position._id, amountMinor: parsed.data.amountMinor, currencyCode: position.currencyCode, period: parsed.data.period, paymentReference: parsed.data.paymentReference, paidAt, recordedBy: admin._id });
  } catch { return NextResponse.json({ error: 'Payment reference already recorded or invalid' }, { status: 409 }); }
  await AuditEvent.create({ actorId: admin._id, action: 'investment.distribution_recorded', targetType: 'InvestmentDistribution', targetId: distribution._id, metadata: { positionId: String(position._id), period: parsed.data.period } });
  return NextResponse.json({ id: distribution.id }, { status: 201 });
}
