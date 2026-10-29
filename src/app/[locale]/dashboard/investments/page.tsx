import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { money, isLocale } from '@/lib/i18n';
import { IdentityVerification, InvestmentDistribution, InvestmentOffering, InvestmentPosition, InvestorProfile, Property } from '@/lib/models';
import { projectedMonthlyMinor } from '@/lib/investment';
import { INVESTMENT_MONTHLY_PROJECTED_RATE } from '@/lib/pricing';
import { InvestorProfileForm } from '@/components/InvestorProfileForm';

export default async function InvestmentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const user = await currentUser();
  if (!user) redirect(`/${locale}/login`);
  const [identity, profile, positions] = await Promise.all([
    IdentityVerification.findOne({ userId: user._id }).select('status').lean(),
    InvestorProfile.findOne({ userId: user._id }).select('suitability eligibilityInformation riskAcknowledgedAt').lean(),
    InvestmentPosition.find({ userId: user._id }).sort({ createdAt: -1 }).limit(100).lean(),
  ]);
  const [offerings, distributions] = await Promise.all([
    InvestmentOffering.find({ _id: { $in: positions.map(position => position.offeringId) } }).select('propertyId projectedMonthlyRate termsVersion riskDisclosure').lean(),
    InvestmentDistribution.find({ positionId: { $in: positions.map(position => position._id) } }).select('positionId amountMinor currencyCode period paidAt').sort({ paidAt: -1 }).lean(),
  ]);
  const properties = await Property.find({ _id: { $in: offerings.map(offering => offering.propertyId) } }).select('title slug').lean();
  const offeringById = new Map(offerings.map(offering => [String(offering._id), offering]));
  const propertyById = new Map(properties.map(property => [String(property._id), property]));
  const distributionsByPosition = new Map<string, typeof distributions>();
  for (const distribution of distributions) {
    const key = String(distribution.positionId);
    distributionsByPosition.set(key, [...(distributionsByPosition.get(key) || []), distribution]);
  }
  return <main className="section wrap"><p><Link href={`/${locale}/dashboard`}>← Dashboard</Link></p><h1>My investments</h1>
    {identity?.status !== 'approved' ? <p className="notice">Approved identity verification is required before an investment can be recorded. <Link href={`/${locale}/dashboard/verification`}>View verification</Link></p> : <InvestorProfileForm suitability={profile?.suitability} eligibilityInformation={profile?.eligibilityInformation}/>}
    <section className="section"><h2>Recorded positions</h2>{positions.length ? <div className="dashboard-records">{positions.map(position => {
      const offering = offeringById.get(String(position.offeringId));
      const property = offering && propertyById.get(String(offering.propertyId));
      const ledger = distributionsByPosition.get(String(position._id)) || [];
      const paid = ledger.reduce((sum, item) => sum + item.amountMinor, 0);
      return <article className="panel" key={String(position._id)}><h3>{property?.title || 'Property investment'}</h3><p>Status: {position.status} · Invested: {money(position.amountMinor, position.currencyCode, locale)}</p><p>Offering terms: {position.termsVersion || 'Not recorded'}</p>{offering?.projectedMonthlyRate === INVESTMENT_MONTHLY_PROJECTED_RATE && offering.termsVersion === position.termsVersion ? <p>Projected monthly amount under the signed 30% offering terms: {money(projectedMonthlyMinor(position.amountMinor), position.currencyCode, locale)}. This is not a payment or guarantee.</p> : <p className="notice">Offering terms require administrator review before any projection is displayed.</p>}<p>Recorded paid distributions: {money(paid, position.currencyCode, locale)}</p>{offering?.riskDisclosure && <p>{offering.riskDisclosure}</p>}{ledger.length ? <table className="country-table"><thead><tr><th>Period</th><th>Paid at</th><th>Recorded amount</th></tr></thead><tbody>{ledger.map(item => <tr key={String(item._id)}><td>{item.period}</td><td>{new Date(item.paidAt).toLocaleDateString(locale)}</td><td>{money(item.amountMinor, item.currencyCode, locale)}</td></tr>)}</tbody></table> : <p className="muted">No paid distributions have been recorded.</p>}</article>;
    })}</div> : <p className="empty">No investment positions have been recorded.</p>}</section>
  </main>;
}
