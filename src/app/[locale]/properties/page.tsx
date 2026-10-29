import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isLocale, money, t } from '@/lib/i18n';
import { listProperties, mapsUrl } from '@/lib/marketplace';
import { CountrySelector } from '@/components/CountrySelector';
import { CountryBadge } from '@/components/CountryBadge';
import { publicAvailabilityLabel } from '@/lib/property-status';
import { currentUser } from '@/lib/auth';
import { Favourite } from '@/lib/models';
import { SavePropertyButton } from '@/components/SavePropertyButton';
import { PropertyMap } from '@/components/PropertyMap';
import { validCoordinates } from '@/lib/map-points';
import { msg } from '@/lib/messages';
import academicImages from '@/data/academic-images.json';

const academicCredits = new Map(academicImages.map(image => [image.url, image]));

type Search = Record<string, string | string[] | undefined>;
const value = (query: Search, key: string) => typeof query[key] === 'string' ? query[key] as string : '';
const number = (query: Search, key: string) => value(query, key) ? Number(value(query, key)) : undefined;

export default async function PropertiesPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Search> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const q = await searchParams;
  let result: Awaited<ReturnType<typeof listProperties>> = { items: [], total: 0, page: 1, currencyCode: undefined };
  let error = '';
  try {
    result = await listProperties({
      country: value(q, 'country'), region: value(q, 'region'), city: value(q, 'city'), search: value(q,'q'),
      purpose: value(q, 'purpose'), type: value(q, 'type'), availability: value(q, 'availability'), minPrice: number(q, 'minPrice'), maxPrice: number(q, 'maxPrice'),
      bedrooms: number(q, 'bedrooms'), bathrooms: number(q, 'bathrooms'), minLandArea: number(q, 'minLandArea'),
      minBuildingArea: number(q, 'minBuildingArea'), amenities: value(q, 'amenities').split(',').map(s => s.trim()).filter(Boolean),
      verifiedOnly: value(q, 'verified') === 'true', investmentOnly: value(q, 'investment') === 'true',
      sort: value(q, 'sort') as 'newest' | 'price-asc' | 'price-desc', page: number(q, 'page') || 1,
    });
  } catch { error = msg(locale, 'marketplace', 'unavailable'); }
  const user = await currentUser();
  const savedIds = new Set(user && result.items.length ? (await Favourite.find({ userId: user._id, propertyId: { $in: result.items.map(item => item._id) } }).select('propertyId').lean()).map(item => String(item.propertyId)) : []);
  const view = value(q, 'view') === 'list' ? 'list' : value(q, 'view') === 'map' ? 'map' : 'grid';
  const mapPoints = result.items.flatMap(item => {
    const coordinates = validCoordinates(item.location?.coordinates);
    const mapUrl = coordinates && mapsUrl(coordinates.latitude, coordinates.longitude);
    return coordinates && mapUrl ? [{ id: String(item._id), title: item.title, href: `/${locale}/properties/${item.slug}`, mapUrl, ...coordinates }] : [];
  });
  const pageUrl = (page: number, mode = view) => { const query = new URLSearchParams(); for (const [key, raw] of Object.entries(q)) if (key !== 'page' && key !== 'view' && typeof raw === 'string' && raw) query.set(key, raw); query.set('page', String(page)); query.set('view', mode); return `?${query}`; };
  return <main className="section wrap">
    <h1>{t(locale, 'properties')}</h1>
    <form className="filters marketplace-filters" method="get">
      <label>{t(locale,'search')}<input name="q" type="search" defaultValue={value(q,'q')} placeholder="Property, location or category"/></label>
      <label>{t(locale, 'country')}<CountrySelector name="country" value={value(q,'country')} label={t(locale,'selectCountry')}/></label>
      {(['purpose','type','investment'] as const).map(key => value(q,key) && <input key={key} type="hidden" name={key} value={value(q,key)}/>)}
      <input type="hidden" name="view" value={view}/><button className="button">{t(locale, 'search')}</button>
    </form>
    <div className="marketplace-toolbar"><span>{result.total} {t(locale, 'properties')}{result.currencyCode ? ` · ${result.currencyCode}` : ''}</span><span><Link href={pageUrl(result.page,'grid')}>{t(locale,'gridView')}</Link> · <Link href={pageUrl(result.page,'list')}>{t(locale,'listView')}</Link> · <Link href={pageUrl(result.page,'map')}>{t(locale,'mapView')}</Link></span></div>
    {!error && view === 'map' && <PropertyMap points={mapPoints} browserKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY} mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID} locale={locale}/>}
    {error ? <p className="notice">{error}</p> : result.items.length ? <div className={view === 'list' ? 'cards cards-list' : 'cards'}>{result.items.map((p, index) => <article className="card" key={String(p._id)}><Link href={`/${locale}/properties/${p.slug}`} className="card-image">{p.cover ? <Image src={p.cover.url || `/api/property-media/${p.cover.id}`} alt={p.cover.alt} fill sizes="(max-width: 620px) 100vw, (max-width: 850px) 50vw, 33vw" loading={index < 3 ? 'eager' : 'lazy'} unoptimized={!p.cover.url}/> : <span aria-hidden>⌂</span>}</Link><div className="card-body"><span className="badge">{publicAvailabilityLabel(p.purpose,p.availabilityStatus || 'available')}</span><h3>{p.title}</h3><div className="muted">{p.propertyType.replaceAll('-',' ')} · <CountryBadge code={p.countryCode} city={p.city} compact/></div><div className="price" dir="ltr">{money(p.localPriceMinor,p.currencyCode,locale)} {['rent','lease'].includes(p.purpose) && <small>{t(locale,'perMonth')}</small>}</div><div className="card-meta">{p.bedrooms != null && <span>{p.bedrooms} beds</span>}{p.bathrooms != null && <span>{p.bathrooms} baths</span>}{p.landAreaSqm != null && <span>{p.landAreaSqm} m²</span>}</div><div className="card-actions"><Link className="button" href={`/${locale}/properties/${p.slug}`}>{t(locale,'viewDetails')}</Link><SavePropertyButton propertyId={String(p._id)} initiallySaved={savedIds.has(String(p._id))} locale={locale}/></div>{p.cover?.url && academicCredits.has(p.cover.url) && <small className="card-image-credit">Photo: <a href={academicCredits.get(p.cover.url)!.sourceUrl} target="_blank" rel="noopener noreferrer">{academicCredits.get(p.cover.url)!.author}</a> · {academicCredits.get(p.cover.url)!.license}</small>}</div></article>)}</div> : <p className="empty">{t(locale,'noResults')}</p>}
    {result.total > 24 && <nav className="pagination" aria-label="Pagination">{result.page > 1 && <Link href={pageUrl(result.page-1)}>{t(locale,'previous')}</Link>}<span>{result.page} / {Math.ceil(result.total/24)}</span>{result.page * 24 < result.total && <Link href={pageUrl(result.page+1)}>{t(locale,'next')}</Link>}</nav>}
  </main>;
}
