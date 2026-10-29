import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connectDb } from '@/lib/db';
import { Country, Property, PropertyMedia } from '@/lib/models';
import { publicAdminContact, mapsUrl } from '@/lib/marketplace';
import { isLocale, money, t } from '@/lib/i18n';
import { EnquiryButton } from '@/components/EnquiryButton';
import { CountryBadge } from '@/components/CountryBadge';
import { publicAvailabilityLabel } from '@/lib/property-status';
import { ACADEMIC_SOURCE, publicPropertyFilter } from '@/lib/property-publication';
import { safeMediaUrl } from '@/lib/media-url';
import { currentUser } from '@/lib/auth';
import { Favourite, RecentView } from '@/lib/models';
import { SavePropertyButton } from '@/components/SavePropertyButton';
import { PropertyMap } from '@/components/PropertyMap';
import { validCoordinates } from '@/lib/map-points';
import { msg } from '@/lib/messages';
import { SharePropertyButton } from '@/components/SharePropertyButton';
import { projectedMonthlyMinor } from '@/lib/investment';
import { INVESTMENT_MONTHLY_PROJECTED_RATE } from '@/lib/pricing';
import academicImages from '@/data/academic-images.json';

export default async function PropertyPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  await connectDb();
  const property = await Property.findOne({ slug, ...publicPropertyFilter }).lean();
  if (!property) notFound();
  if (!await Country.exists({ code: property.countryCode, enabled: true })) notFound();
  const [admin, images, similar] = await Promise.all([
    publicAdminContact(),
    PropertyMedia.find({ propertyId: property._id, status: 'approved' }).select('alt isCover sortOrder').sort({ isCover: -1, sortOrder: 1, createdAt: 1 }).limit(16).lean(),
    Property.find({ _id: { $ne: property._id }, ...publicPropertyFilter, countryCode: property.countryCode, purpose: property.purpose }).select('slug title city currencyCode localPriceMinor').limit(3).lean(),
  ]);
  const gallery: { key: string; url: string; alt: string; unoptimized: boolean }[] = images.length
    ? images.map(image => ({ key: String(image._id), url: `/api/property-media/${image._id}`, alt: image.alt, unoptimized: true }))
    : property.isDemo && property.sourceProvider === ACADEMIC_SOURCE
      ? (property.media || []).filter((item: { url?: string; alt?: string }) => item.url?.startsWith('/images/academic/')).map((item: { url: string; alt?: string }, index: number) => ({ key: String(index), url: item.url, alt: item.alt || 'Illustrative property image', unoptimized: false }))
      : [];
  const academicCredits = property.isDemo && property.sourceProvider === ACADEMIC_SOURCE
    ? gallery.map(image => academicImages.find(asset => asset.url === image.url)).filter((asset): asset is typeof academicImages[number] => Boolean(asset)) : [];
  const illustrative = property.isDemo && property.sourceProvider === ACADEMIC_SOURCE;
  const displayAddress = illustrative ? property.addressText?.replace(/academic/gi, 'illustrative') : property.addressText;
  const displayDescription = illustrative ? property.description?.replace(/academic/gi, 'illustrative') : property.description;
  const user = await currentUser();
  const saved = user ? !!(await Favourite.exists({ userId: user._id, propertyId: property._id })) : false;
  if (user) await RecentView.updateOne({ userId: user._id, propertyId: property._id }, { $set: { viewedAt: new Date() } }, { upsert: true });
  const coordinates = property.location?.coordinates || [0, 0];
  const mapCoordinates = validCoordinates(coordinates);
  const map = mapsUrl(coordinates[1], coordinates[0], property.addressText);
  const subject = encodeURIComponent(`GlobalHome enquiry: ${property.title}`);
  const email = admin.supportEmail ? `mailto:${admin.supportEmail}?subject=${subject}` : null;
  const whatsapp = admin.whatsAppNumber ? `https://wa.me/${admin.whatsAppNumber.replace(/\D/g, '')}?text=${subject}` : null;
  return <main className="section wrap">
    <p className="badge">{publicAvailabilityLabel(property.purpose,property.availabilityStatus || 'available')}</p>
    <h1>{property.title}</h1>
    <p className="muted">{property.propertyType.replaceAll('-',' ')} · {property.purpose} · <CountryBadge code={property.countryCode} city={property.city}/></p>
    <div className="detail">
      <div>
        {gallery.length ? <div className="detail-gallery"><div className="detail-photo"><Image src={gallery[0].url} alt={gallery[0].alt} fill sizes="(max-width:850px) 100vw, 60vw" unoptimized={gallery[0].unoptimized}/></div><div className="detail-gallery-side">{gallery.slice(1,3).map(image => <div className="detail-photo" key={image.key}><Image src={image.url} alt={image.alt} fill sizes="(max-width:850px) 50vw, 25vw" unoptimized={image.unoptimized}/></div>)}</div></div> : <div className="card-image" style={{height:380}} aria-label={msg(locale,'property','imageUnavailable')}>⌂</div>}
        {gallery.length>3&&<div className="property-gallery-more">{gallery.slice(3).map(image=><div className="detail-photo" key={image.key}><Image src={image.url} alt={image.alt} fill sizes="(max-width:620px) 50vw, 25vw" unoptimized={image.unoptimized}/></div>)}</div>}
        {!!academicCredits.length && <details className="image-credits"><summary>Image credits</summary>{academicCredits.map(asset => <p key={asset.pageId}><a href={asset.sourceUrl} target="_blank" rel="noopener noreferrer">{asset.author}</a> · {asset.license} · resized for display{asset.licenseUrl && <> · <a href={asset.licenseUrl} target="_blank" rel="noopener noreferrer">License</a></>}</p>)}</details>}
        {mapCoordinates && map && <PropertyMap points={[{ id: String(property._id), title: property.title, href: `/${locale}/properties/${property.slug}`, mapUrl: map, ...mapCoordinates }]} browserKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY} mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID} locale={locale}/>}
        <div className="panel">
          <h2><CountryBadge code={property.countryCode} city={property.city}/></h2>
          {displayAddress && <p>{displayAddress}</p>}
          <p>{displayDescription}</p>
          <div className="card-meta">{property.bedrooms != null && <span>{property.bedrooms} beds</span>}{property.bathrooms != null && <span>{property.bathrooms} baths</span>}{property.landAreaSqm != null && <span>{property.landAreaSqm} m² land</span>}{property.buildingAreaSqm != null && <span>{property.buildingAreaSqm} m² building</span>}</div>
          {!!property.amenities?.length && <p>{property.amenities.join(' · ')}</p>}
          {map && <p><a className="button button-secondary" href={map} target="_blank" rel="noopener noreferrer">{msg(locale,'property','maps')}</a></p>}
          {safeMediaUrl(property.videoUrl)&&<p><a href={safeMediaUrl(property.videoUrl)} target="_blank" rel="noopener noreferrer">{msg(locale,'property','video')}</a></p>}
          {safeMediaUrl(property.virtualTourUrl)&&<p><a href={safeMediaUrl(property.virtualTourUrl)} target="_blank" rel="noopener noreferrer">{msg(locale,'property','virtualTour')}</a></p>}
        </div>
      </div>
      <aside className="panel"><div className="price" dir="ltr">{money(property.localPriceMinor,property.currencyCode,locale)} {['rent','lease'].includes(property.purpose) && <small>{t(locale,'perMonth')}</small>}</div><h2>{admin.displayName}</h2><SavePropertyButton propertyId={String(property._id)} initiallySaved={saved} locale={locale}/><SharePropertyButton title={property.title} label={msg(locale,'property','share')} copiedLabel={msg(locale,'property','linkCopied')} errorLabel={msg(locale,'property','shareError')}/><EnquiryButton propertyId={String(property._id)} locale={locale} label={msg(locale,'property','contact')} returnPath={`/${locale}/properties/${property.slug}`}/><EnquiryButton propertyId={String(property._id)} locale={locale} label={msg(locale,'property','messageAdmin')} returnPath={`/${locale}/properties/${property.slug}`}/>{email && <p><a className="button button-secondary" href={email}>{msg(locale,'property','emailAdmin')}</a></p>}{whatsapp && <p><a className="button button-secondary" href={whatsapp} target="_blank" rel="noopener noreferrer">{msg(locale,'property','whatsappAdmin')}</a></p>}{property.purpose === 'invest' && (property.isDemo && property.sourceProvider === ACADEMIC_SOURCE && property.investmentMonthlyProjectedRate === INVESTMENT_MONTHLY_PROJECTED_RATE ? <p className="notice">{msg(locale,'investment','illustrativeProjection')}: {money(projectedMonthlyMinor(property.localPriceMinor),property.currencyCode,locale)}</p> : <p className="notice">{t(locale,'projected')}</p>)}</aside>
    </div>
    {!!similar.length && <section className="section similar-properties"><h2>{msg(locale,'property','similar')}</h2><div className="cards">{similar.map(item => <Link className="panel" key={String(item._id)} href={`/${locale}/properties/${item.slug}`}><strong>{item.title}</strong><p>{item.city}</p><span className="price">{money(item.localPriceMinor,item.currencyCode,locale)}</span></Link>)}</div></section>}
  </main>;
}
