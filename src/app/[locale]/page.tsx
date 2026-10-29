import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Castle, Earth, Headset, House, ShieldCheck, TrendingUp } from 'lucide-react';
import { CountrySelector } from '@/components/CountrySelector';
import { CategoryIcon } from '@/components/CategoryIcon';
import { isLocale, number, t } from '@/lib/i18n';
import { landingText as copy } from '@/lib/landing-copy';
import { propertyTypes } from '@/lib/property-types';
import { inventoryStats } from '@/lib/inventory-stats';
import { cookies } from 'next/headers';

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const selectedCountry = (await cookies()).get('gh_country')?.value || '';
  let stats: { enabledCountries: number; publishedProperties: number } | null = null;
  if (process.env.MONGODB_URI && process.env.GH_BUILD_OFFLINE !== '1') {
    try { stats = await inventoryStats(); } catch (error) {
      const cause = error as { name?: string; code?: string };
      console.error('Landing inventory query failed', { name: cause.name || 'Error', code: cause.code || 'unknown' });
    }
  }
  const categories = [
    { key: 'houses', detail: 'housesDetail', href: `/${locale}/properties?type=house` },
    { key: 'lands', detail: 'landsDetail', href: `/${locale}/lands` },
    { key: 'apartments', detail: 'apartmentsDetail', href: `/${locale}/properties?type=apartment` },
    { key: 'hotels', detail: 'hotelsDetail', href: `/${locale}/hotels` },
    { key: 'events', detail: 'eventsDetail', href: `/${locale}/event-centres` },
    { key: 'investment', detail: 'investmentDetail', href: `/${locale}/invest` },
  ] as const;
  const trust = [
    { icon: Earth, value: stats === null ? '—' : number(stats.enabledCountries, locale), label: copy(locale, 'countriesCount') },
    { icon: Castle, value: stats === null ? '—' : number(stats.publishedProperties, locale), label: stats === null ? copy(locale, 'listingsUnavailable') : copy(locale, 'propertyCount') },
    { icon: ShieldCheck, value: copy(locale, 'verifiedListings'), label: copy(locale, 'verifiedDetail') },
    { icon: Headset, value: copy(locale, 'adminSupport'), label: copy(locale, 'supportDetail') },
    { icon: TrendingUp, value: copy(locale, 'globalOpportunities'), label: copy(locale, 'opportunitiesDetail') },
  ];
  return <main className="landing">
    <section className="hero"><div className="wrap hero-wrap"><div className="hero-content">
      <h1><span>{copy(locale, 'heroLineOne')}</span> <strong>{copy(locale, 'heroLineTwo')}</strong> <span>{copy(locale, 'heroLineThree')}</span></h1>
      <p>{copy(locale, 'heroDescription')}</p>
      <form className="hero-search" action={`/${locale}/properties`} method="get">
        <label><span>{copy(locale, 'country')}</span><CountrySelector name="country" value={selectedCountry} label={t(locale, 'selectCountry')} /></label>
        <label><span>{copy(locale, 'propertyType')}</span><select name="type" defaultValue="" aria-label={copy(locale, 'propertyType')}><option value="">{copy(locale, 'anyType')}</option>{propertyTypes.map(type => <option key={type} value={type}>{type.replaceAll('-', ' ')}</option>)}</select></label>
        <label><span>{copy(locale, 'purpose')}</span><select name="purpose" defaultValue="buy" aria-label={copy(locale, 'purpose')}>{(['buy', 'rent', 'lease', 'invest'] as const).map(purpose => <option key={purpose} value={purpose}>{t(locale, purpose)}</option>)}</select></label>
        <button className="button" type="submit">{copy(locale, 'searchProperties')}</button>
      </form>
    </div></div></section>
    <section className="landing-categories wrap" aria-label={t(locale, 'browseByCategory')}><div className="category-grid">{categories.map(category => <Link className="category-tile" key={category.key} href={category.href}><CategoryIcon kind={category.key}/><strong>{copy(locale, category.key)}</strong><span>{copy(locale, category.detail)}</span></Link>)}</div></section>
    <section className="landing-cta" aria-labelledby="landing-cta-heading"><div className="wrap landing-cta-panel">
      <div className="landing-cta-intro"><span className="landing-cta-accent" aria-hidden="true"/><h2 id="landing-cta-heading">Your Trusted Partner in <span>Global Real Estate</span></h2><p>At GlobalHome Real Estate Worldwide, we make it easier to discover and access quality real estate opportunities across the world. Whether you&apos;re looking to buy, rent, lease, sell, or invest, our platform connects you with verified properties across the world.</p></div>
      <div className="landing-cta-reasons"><h3>Why Choose <span>GlobalHome?</span></h3><div className="landing-cta-benefits">
        <div><ShieldCheck aria-hidden="true"/><p><strong>Verified Listings</strong><span>Quality and trusted properties</span></p></div>
        <div><Earth aria-hidden="true"/><p><strong>Worldwide Access</strong><span>Properties across countries worldwide</span></p></div>
        <div><House aria-hidden="true"/><p><strong>Wide Property Options</strong><span>Houses, lands, apartments, hotels, events and more</span></p></div>
        <div><Headset aria-hidden="true"/><p><strong>Dedicated Support</strong><span>Get assistance anytime, anywhere</span></p></div>
      </div><div className="landing-cta-actions"><Link href={`/${locale}/properties`}>Explore Properties <span aria-hidden="true">→</span></Link><Link href={`/${locale}/invest`}>Start Investing <span aria-hidden="true">→</span></Link></div></div>
    </div></section>
    <section className="stats" aria-label={copy(locale, 'globalOpportunities')}><div className="wrap stats-inner">{trust.map((item, index) => <div className="stat" key={index}><item.icon aria-hidden="true" size={28} strokeWidth={1.7}/><div><strong>{item.value}</strong><span>{item.label}</span></div></div>)}</div></section>
  </main>;
}
