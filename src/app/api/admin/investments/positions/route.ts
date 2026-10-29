import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { currentUser } from '@/lib/auth';
import { AuditEvent, FxRate, IdentityVerification, InvestmentOffering, InvestmentPosition, InvestorProfile, Property, User } from '@/lib/models';
import { realPropertyFilter as publicPropertyFilter } from '@/lib/property-publication';
import { INVESTMENT_MONTHLY_PROJECTED_RATE, validateLocalPrice } from '@/lib/pricing';

const schema = z.object({
  userId: z.string().refine(mongoose.isValidObjectId),
  offeringId: z.string().refine(mongoose.isValidObjectId),
  amountMinor: z.number().int().positive().safe(),
  signedTermsReference: z.string().trim().min(8).max(500),
}).strict();

export async function POST(request: NextRequest) {
  const admin = await currentUser();
  if (!admin || admin.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid position' }, { status: 400 });
  const [owner, identity, profile, offering] = await Promise.all([
    User.findById(parsed.data.userId).select('emailVerifiedAt').lean(),
    IdentityVerification.findOne({ userId: parsed.data.userId, status: 'approved' }).select('_id').lean(),
    InvestorProfile.findOne({ userId: parsed.data.userId, riskAcknowledgedAt: { $ne: null } }).select('_id').lean(),
    InvestmentOffering.findOne({ _id: parsed.data.offeringId, status: 'approved' }).lean(),
  ]);
  if (!owner?.emailVerifiedAt || !identity || !profile || !offering?.termsReference || !offering.termsVersion || offering.projectedMonthlyRate !== INVESTMENT_MONTHLY_PROJECTED_RATE) return NextResponse.json({ error: 'Verified investor and approved signed terms are required' }, { status: 409 });
  const property = await Property.findOne({ _id: offering.propertyId, purpose: 'invest', ...publicPropertyFilter }).select('currencyCode').lean();
  if (!property) return NextResponse.json({ error: 'Offering property is unavailable' }, { status: 409 });
  const fx = await FxRate.findOne({ baseCurrency: 'USD', quoteCurrency: property.currencyCode, approved: true, effectiveAt: { $lte: new Date() } }).sort({ effectiveAt: -1 }).lean();
  if (!fx) return NextResponse.json({ error: 'Approved FX snapshot required' }, { status: 409 });
  let price;
  try { price = validateLocalPrice('invest', parsed.data.amountMinor, property.currencyCode, { baseCurrency: 'USD', quoteCurrency: property.currencyCode, rate: fx.rate, provider: fx.provider, effectiveAt: fx.effectiveAt, fetchedAt: fx.fetchedAt }); }
  catch { return NextResponse.json({ error: 'Investment amount or FX snapshot is invalid' }, { status: 400 }); }
  const position = await InvestmentPosition.create({ userId: owner._id, offeringId: offering._id, amountMinor: parsed.data.amountMinor, currencyCode: property.currencyCode, usdReferenceEquivalent: price.usdEquivalent, fxRate: price.fxRate, fxEffectiveAt: price.fxEffectiveAt, fxProvider: price.fxProvider, termsVersion: offering.termsVersion, signedTermsReference: parsed.data.signedTermsReference, status: 'pending', createdBy: admin._id });
  await AuditEvent.create({ actorId: admin._id, action: 'investment.position_recorded', targetType: 'InvestmentPosition', targetId: position._id });
  return NextResponse.json({ id: position.id, status: position.status }, { status: 201 });
}
