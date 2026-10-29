import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { isLocale, money } from '@/lib/i18n';
import { InvestmentDistribution, InvestmentOffering, InvestmentPosition, InvestorProfile, Property, User } from '@/lib/models';
import { realPropertyFilter as publicPropertyFilter } from '@/lib/property-publication';
import { AdminInvestmentForms } from '@/components/AdminInvestmentForms';

export default async function AdminInvestmentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const admin = await currentUser();
  if (!admin) redirect(`/${locale}/login`);
  if (admin.role !== 'admin') notFound();
  const [properties, offerings, profiles, positions] = await Promise.all([
    Property.find({ purpose: 'invest', ...publicPropertyFilter }).select('title currencyCode').sort({ createdAt: -1 }).limit(200).lean(),
    InvestmentOffering.find({ status: 'approved' }).select('propertyId termsVersion').sort({ createdAt: -1 }).limit(200).lean(),
    InvestorProfile.find({ riskAcknowledgedAt: { $ne: null } }).select('userId').limit(200).lean(),
    InvestmentPosition.find().select('userId offeringId amountMinor currencyCode status createdAt').sort({ createdAt: -1 }).limit(100).lean(),
  ]);
  const users = await User.find({ _id: { $in: [...profiles.map(item => item.userId), ...positions.map(item => item.userId)] } }).select('fullName email').lean();
  const [offeringCount, positionCount, distributionCount] = await Promise.all([InvestmentOffering.countDocuments({ status: 'approved' }), InvestmentPosition.countDocuments(), InvestmentDistribution.countDocuments()]);
  const userById = new Map(users.map(user => [String(user._id), user]));
  const propertyById = new Map(properties.map(property => [String(property._id), property]));
  return <main className="section wrap"><p><Link href={`/${locale}/admin`}>← Admin dashboard</Link></p><h1>Investment management</h1><p className="notice">Record only signed terms, confirmed funding, and distributions actually paid. No public payment checkout is available.</p>
    <div className="cards"><div className="panel"><h2>Approved offerings</h2><p>{offeringCount}</p></div><div className="panel"><h2>Recorded positions</h2><p>{positionCount}</p></div><div className="panel"><h2>Paid distribution records</h2><p>{distributionCount}</p></div></div>
    <section className="section"><h2>Recent positions</h2>{positions.length ? <div className="dashboard-records">{positions.map(position => <div className="panel" key={String(position._id)}><strong>{userById.get(String(position.userId))?.fullName || 'Investor'}</strong><p>{position.status} · {money(position.amountMinor, position.currencyCode, locale)}</p><small>Position ID: {String(position._id)}</small></div>)}</div> : <p className="empty">No investment positions have been recorded.</p>}</section>
    <section className="section"><h2>Manage records</h2><AdminInvestmentForms properties={properties.map(item => ({ id: String(item._id), label: `${item.title} (${item.currencyCode})` }))} offerings={offerings.map(item => ({ id: String(item._id), label: `${propertyById.get(String(item.propertyId))?.title || 'Property'} · ${item.termsVersion}` }))} investors={profiles.map(item => ({ id: String(item.userId), label: userById.get(String(item.userId))?.fullName || String(item.userId) }))} positions={positions.map(item => ({ id: String(item._id), label: userById.get(String(item.userId))?.fullName || String(item._id), status: item.status, currencyCode: item.currencyCode }))}/></section>
  </main>;
}
