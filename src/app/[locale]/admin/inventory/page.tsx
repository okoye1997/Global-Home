import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { AdminPropertyImportForm } from '@/components/AdminPropertyImportForm';
import { CountryBadge } from '@/components/CountryBadge';
import { currentUser } from '@/lib/auth';
import { isLocale } from '@/lib/i18n';
import { Country, ImportBatch, Property } from '@/lib/models';
import { ACADEMIC_SOURCE, academicInventoryEnabled, realPropertyFilter as publicPropertyFilter } from '@/lib/property-publication';
import { countryInventoryTarget, MINIMUM_COUNTRY_INVENTORY } from '@/lib/inventory-target';

const minimumTarget = MINIMUM_COUNTRY_INVENTORY;
export default async function InventoryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const user = await currentUser();
  if (!user) redirect(`/${locale}/login`);
  if (user.role !== 'admin') notFound();
  const showAcademicInventory = academicInventoryEnabled();
  const [countries, counts, batches, academicCounts] = await Promise.all([
    Country.find({ enabled: true }).select('code name currencyCode minimumInventoryTarget').sort({ name: 1 }).lean(),
    Property.aggregate([{ $match: { isDemo: false } }, { $group: { _id: '$countryCode', total: { $sum: 1 }, available: { $sum: { $cond: [{ $and: [{ $eq: ['$status', publicPropertyFilter.status] }, { $eq: ['$verificationStatus', publicPropertyFilter.verificationStatus] }, { $ne: ['$verifiedAt', null] }, { $eq: [{ $ifNull: ['$availabilityStatus', 'available'] }, 'available'] }] }, 1, 0] } }, pending: { $sum: { $cond: [{ $in: ['$status', ['draft', 'pending_verification']] }, 1, 0] } }, published: { $sum: { $cond: [{ $and: [{ $eq: ['$status', publicPropertyFilter.status] }, { $eq: ['$verificationStatus', publicPropertyFilter.verificationStatus] }, { $ne: ['$verifiedAt', null] }] }, 1, 0] } } } }]),
    ImportBatch.find().sort({ createdAt: -1 }).limit(20).select('countryCode sourceProvider fileName totalRows inserted skipped failed status createdAt rowErrors').lean(),
    showAcademicInventory ? Property.aggregate<{ _id: string; total: number }>([
      { $match: { isDemo: true, sourceProvider: ACADEMIC_SOURCE, academicVisible: true, verificationStatus: 'sample' } },
      { $group: { _id: '$countryCode', total: { $sum: 1 } } },
    ]) : Promise.resolve([]),
  ]);
  const byCountry = new Map(counts.map(row => [row._id as string, row]));
  const academicByCountry = new Map(academicCounts.map(row => [row._id, row.total]));
  return <main className="section wrap"><p><Link href={`/${locale}/admin`}>← Admin dashboard</Link></p><h1>Worldwide inventory</h1><p className="muted">Minimum target: {minimumTarget} legitimate published properties per enabled country. No upper limit. Imported records remain unpublished until reviewed.</p>{showAcademicInventory && <p className="notice">Illustrative inventory is shown separately for development browsing. It does not count toward legitimate published inventory or the production target.</p>}<div className="country-table-wrap"><table className="country-table"><thead><tr><th>Country</th><th>Currency</th>{showAcademicInventory && <th>Illustrative catalogue</th>}<th>Real total</th><th>Available</th><th>Pending verification</th><th>Published</th><th>Target</th><th>Remaining</th></tr></thead><tbody>{countries.map(country => { const count = byCountry.get(country.code); const published = count?.published || 0; const { target, remaining, achieved } = countryInventoryTarget(published,country.minimumInventoryTarget); return <tr key={country.code}><td><CountryBadge code={country.code}/></td><td>{country.currencyCode}</td>{showAcademicInventory && <td>{academicByCountry.get(country.code) || 0}</td>}<td>{count?.total || 0}</td><td>{count?.available || 0}</td><td>{count?.pending || 0}</td><td>{published}</td><td>{target}</td><td>{achieved ? 'Target achieved' : remaining}</td></tr>; })}</tbody></table></div><section className="section"><AdminPropertyImportForm countries={countries.map(country => ({ code: country.code, name: country.name }))}/></section><section className="section"><h2>Recent import batches</h2>{batches.length ? <div className="dashboard-records">{batches.map(batch => <details className="panel" key={String(batch._id)}><summary>{batch.fileName} · {batch.countryCode} · {batch.sourceProvider} · {batch.status}</summary><p>{batch.inserted || 0} inserted · {batch.skipped || 0} skipped · {batch.failed || 0} failed</p>{batch.rowErrors?.length ? <pre className="import-result">{JSON.stringify(batch.rowErrors, null, 2)}</pre> : null}</details>)}</div> : <p className="empty">No imports yet.</p>}</section></main>;
}


