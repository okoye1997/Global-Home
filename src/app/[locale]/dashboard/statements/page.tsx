import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { isLocale, money } from '@/lib/i18n';
import { InvestmentDistribution, InvestmentOffering, InvestmentPosition, Property } from '@/lib/models';

export default async function StatementsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const user = await currentUser();
  if (!user) redirect(`/${locale}/login`);
  const positions = await InvestmentPosition.find({ userId: user._id }).select('offeringId').lean();
  const distributions = await InvestmentDistribution.find({ positionId: { $in: positions.map(item => item._id) } }).select('positionId period paidAt amountMinor currencyCode').sort({ paidAt: -1 }).limit(200).lean();
  const offerings = await InvestmentOffering.find({ _id: { $in: positions.map(item => item.offeringId) } }).select('propertyId').lean();
  const properties = await Property.find({ _id: { $in: offerings.map(item => item.propertyId) } }).select('title').lean();
  const offeringById = new Map(offerings.map(item => [String(item._id), item]));
  const propertyById = new Map(properties.map(item => [String(item._id), item]));
  const propertyByPosition = new Map(positions.map(item => [String(item._id), propertyById.get(String(offeringById.get(String(item.offeringId))?.propertyId))?.title || 'Property investment']));
  return <main className="section wrap"><p><Link href={`/${locale}/dashboard`}>← Dashboard</Link></p><h1>Statements</h1><p>Only recorded paid investment distributions appear here. Pending positions and projections are excluded.</p>{distributions.length ? <div className="country-table-wrap"><table className="country-table"><thead><tr><th>Date</th><th>Description</th><th>Property</th><th>Period</th><th>Amount</th><th>Status</th></tr></thead><tbody>{distributions.map(item => <tr key={String(item._id)}><td>{new Date(item.paidAt).toLocaleDateString(locale)}</td><td>Investment distribution</td><td>{propertyByPosition.get(String(item.positionId))}</td><td>{item.period}</td><td>{money(item.amountMinor, item.currencyCode, locale)}</td><td>Recorded paid</td></tr>)}</tbody></table></div> : <p className="empty">No paid financial activity has been recorded.</p>}</main>;
}
