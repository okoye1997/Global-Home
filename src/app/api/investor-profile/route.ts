import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { currentUser } from '@/lib/auth';
import { AuditEvent, IdentityVerification, InvestorProfile } from '@/lib/models';

const profileSchema = z.object({ suitability: z.string().trim().min(10).max(1000), eligibilityInformation: z.string().trim().min(10).max(1000), riskAcknowledged: z.literal(true) }).strict();

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const profile = await InvestorProfile.findOne({ userId: user._id }).select('suitability eligibilityInformation riskAcknowledgedAt createdAt updatedAt').lean();
  return NextResponse.json({ profile });
}

export async function POST(request: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const identity = await IdentityVerification.findOne({ userId: user._id, status: 'approved' }).select('_id').lean();
  if (!identity) return NextResponse.json({ error: 'Approved identity verification required' }, { status: 403 });
  const parsed = profileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid investor profile' }, { status: 400 });
  const profile = await InvestorProfile.findOneAndUpdate({ userId: user._id }, { $set: { suitability: parsed.data.suitability, eligibilityInformation: parsed.data.eligibilityInformation, riskAcknowledgedAt: new Date() } }, { upsert: true, new: true }).select('_id').lean();
  await AuditEvent.create({ actorId: user._id, action: 'investor.profile_updated', targetType: 'InvestorProfile', targetId: profile._id });
  return NextResponse.json({ ok: true });
}
