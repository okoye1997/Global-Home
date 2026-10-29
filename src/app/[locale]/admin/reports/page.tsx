import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { isLocale } from '@/lib/i18n';
import { Country, Enquiry, IdentityVerification, InvestmentDistribution, InvestmentPosition, Notification, Property, User } from '@/lib/models';
import { CountryBadge } from '@/components/CountryBadge';
import { publicPropertyFilter } from '@/lib/property-publication';

type CountRow = { _id: string; count: number };
const countBy = (field: string) => [{ $group: { _id: `$${field}`, count: { $sum: 1 } } }, { $sort: { count: -1 as const } }];

function CountTable({ title, rows }: { title: string; rows: CountRow[] }) {
  return <section className="panel"><h2>{title}</h2>{rows.length ? <div className="country-table-wrap"><table className="country-table"><thead><tr><th>Group</th><th>Count</th></tr></thead><tbody>{rows.map(row => <tr key={String(row._id)}><td>{String(row._id || 'Unspecified').replaceAll('_', ' ')}</td><td>{row.count}</td></tr>)}</tbody></table></div> : <p className="empty">No records yet.</p>}</section>;
}

export default async function ReportsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const admin = await currentUser();
  if (!admin) redirect(`/${locale}/login`);
  if (admin.role !== 'admin') notFound();
  const [countries, publishedByCountry, propertyPurpose, propertyType, propertyStatus, availability, identities, deals, positions, registrations, notificationActivity, paidCount] = await Promise.all([
    Country.find({ enabled: true }).select('code currencyCode minimumInventoryTarget').sort({ name: 1 }).lean(),
    Property.aggregate<CountRow>([{ $match: publicPropertyFilter }, ...countBy('countryCode')]),
    Property.aggregate<CountRow>(countBy('purpose')),
    Property.aggregate<CountRow>(countBy('propertyType')),
    Property.aggregate<CountRow>(countBy('status')),
    Property.aggregate<CountRow>(countBy('availabilityStatus')),
    IdentityVerification.aggregate<CountRow>(countBy('status')),
    Enquiry.aggregate<CountRow>(countBy('status')),
    InvestmentPosition.aggregate<CountRow>(countBy('status')),
    User.aggregate<CountRow>([{ $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } }, { $sort: { _id: -1 } }, { $limit: 24 }]),
    Notification.aggregate<CountRow>(countBy('key')),
    InvestmentDistribution.countDocuments(),
  ]);
  const published = new Map(publishedByCountry.map(row => [row._id, row.count]));
  return <main className="section wrap"><p><Link href={`/${locale}/admin`}>← Admin dashboard</Link></p><h1>Reports</h1><p>All figures come from stored records. A report is not a statement of verified financial performance.</p>
    <section className="section"><h2>Published inventory targets</h2><div className="country-table-wrap"><table className="country-table"><thead><tr><th>Country</th><th>Currency</th><th>Published</th><th>Target</th><th>Remaining</th></tr></thead><tbody>{countries.map(country => { const count = published.get(country.code) || 0; const target = country.minimumInventoryTarget || 100; return <tr key={country.code}><td><CountryBadge code={country.code} compact/></td><td>{country.currencyCode}</td><td>{count}</td><td>{target}</td><td>{Math.max(0, target - count)}</td></tr>; })}</tbody></table></div></section>
    <div className="dashboard-records"><CountTable title="Properties by purpose" rows={propertyPurpose}/><CountTable title="Properties by type" rows={propertyType}/><CountTable title="Publication status" rows={propertyStatus}/><CountTable title="Availability" rows={availability}/><CountTable title="User registrations by month" rows={registrations}/><CountTable title="Identity verification" rows={identities}/><CountTable title="Deal status" rows={deals}/><CountTable title="Investment position status" rows={positions}/><CountTable title="Notification activity" rows={notificationActivity}/><div className="panel"><h2>Recorded paid distributions</h2><p>{paidCount}</p></div></div>
  </main>;
}
