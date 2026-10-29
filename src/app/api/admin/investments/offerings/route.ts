import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { currentUser } from '@/lib/auth';
import { AuditEvent, InvestmentOffering, InvestmentPosition, Property } from '@/lib/models';
import { realPropertyFilter as publicPropertyFilter } from '@/lib/property-publication';
import { INVESTMENT_MONTHLY_PROJECTED_RATE } from '@/lib/pricing';

const schema = z.object({
  propertyId: z.string().refine(mongoose.isValidObjectId),
  termsVersion: z.string().trim().min(1).max(80),
  termsReference: z.string().trim().min(8).max(500),
  assumptions: z.string().trim().min(20).max(5000),
  riskDisclosure: z.string().trim().min(20).max(5000),
}).strict();

export async function POST(request: NextRequest) {
  const admin = await currentUser();
  if (!admin || admin.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid offering terms' }, { status: 400 });
  const property = await Property.findOne({ _id: parsed.data.propertyId, purpose: 'invest', ...publicPropertyFilter }).select('_id').lean();
  if (!property) return NextResponse.json({ error: 'Published verified investment property required' }, { status: 409 });
  const existing = await InvestmentOffering.findOne({ propertyId: property._id }).select('status termsVersion').lean();
  if (existing?.status === 'closed') return NextResponse.json({ error: 'Closed offering cannot be reopened' }, { status: 409 });
  if (existing && await InvestmentPosition.exists({ offeringId: existing._id })) return NextResponse.json({ error: 'Terms cannot be changed after positions exist' }, { status: 409 });
  const offering = await InvestmentOffering.findOneAndUpdate({ propertyId: property._id }, { $set: { ...parsed.data, projectedMonthlyRate: INVESTMENT_MONTHLY_PROJECTED_RATE, status: 'approved', approvedBy: admin._id, approvedAt: new Date() } }, { upsert: true, new: true }).lean();
  await AuditEvent.create({ actorId: admin._id, action: 'investment.offering_approved', targetType: 'InvestmentOffering', targetId: offering._id, metadata: { termsVersion: parsed.data.termsVersion } });
  return NextResponse.json({ id: String(offering._id), status: offering.status }, { status: 201 });
}
