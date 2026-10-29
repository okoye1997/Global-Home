import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { isLocale, money } from '@/lib/i18n';
import { Property, RecentView } from '@/lib/models';
import { publicPropertyFilter } from '@/lib/property-publication';
import { CountryBadge } from '@/components/CountryBadge';
import { ClearRecentViews } from '@/components/ClearRecentViews';

export default async function RecentPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const user = await currentUser();
  if (!user) redirect(`/${locale}/login`);
  const views = await RecentView.find({ userId: user._id }).sort({ viewedAt: -1 }).limit(50).select('propertyId viewedAt').lean();
  const properties = await Property.find({ _id: { $in: views.map(view => view.propertyId) }, ...publicPropertyFilter }).select('title slug city countryCode localPriceMinor currencyCode').lean();
  const byId = new Map(properties.map(property => [String(property._id), property]));
  return <main className="section wrap"><p><Link href={`/${locale}/dashboard`}>← Dashboard</Link></p><h1>Recently viewed properties</h1>{views.length > 0 && <ClearRecentViews/>}{properties.length ? <div className="dashboard-records">{views.map(view => { const property = byId.get(String(view.propertyId)); return property && <article className="panel" key={String(view._id)}><Link href={`/${locale}/properties/${property.slug}`}><strong>{property.title}</strong></Link><p><CountryBadge code={property.countryCode} city={property.city}/> · {money(property.localPriceMinor, property.currencyCode, locale)}</p><small>Viewed {new Date(view.viewedAt).toLocaleDateString(locale)}</small></article>; })}</div> : <p className="empty">No currently published properties in your recent history.</p>}</main>;
}
