import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isLocale, money, t } from '@/lib/i18n';
import { listCountries, listProperties } from '@/lib/marketplace';
import { CountryBadge } from '@/components/CountryBadge';

export default async function CountryPage({params}:{params:Promise<{locale:string;country:string}>}){
  const {locale,country:slug}=await params;
  if(!isLocale(locale))notFound();
  const countries=await listCountries();
  const country=countries.find(item=>item.code.toLowerCase()===slug.toLowerCase()||item.name.toLowerCase().replace(/[^a-z0-9]+/g,'-')===slug.toLowerCase());
  if(!country)notFound();
  const groups=['buy','rent','lease','invest'] as const;
  const results=await Promise.all(groups.map(purpose=>listProperties({country:country.code,purpose})));
  return <main className="section wrap"><h1><CountryBadge code={country.code}/></h1><p>{country.officialName} · {country.iso3} · {country.currencyName} ({country.currencyCode} · {country.currencySymbol})</p><p><Link className="button" href={`/${locale}/properties?country=${country.code}`}>{t(locale,'explore')}</Link></p>{groups.map((purpose,index)=>{const items=results[index].items;return <section className="section" key={purpose}><h2>{t(locale,purpose)}</h2>{items.length?<div className="cards">{items.slice(0,6).map(item=><Link className="card" href={`/${locale}/properties/${item.slug}`} key={String(item._id)}><div className="card-image">{item.cover?<Image src={item.cover.url || `/api/property-media/${item.cover.id}`} alt={item.cover.alt} fill sizes="(max-width:620px) 100vw, 33vw" unoptimized={!item.cover.url}/>:<span aria-hidden>⌂</span>}</div><div className="card-body"><h3>{item.title}</h3><CountryBadge code={item.countryCode} city={item.city} compact/><p className="price" dir="ltr">{money(item.localPriceMinor,item.currencyCode,locale)}</p></div></Link>)}</div>:<p className="empty">{t(locale,'noResults')}</p>}<p><Link href={`/${locale}/properties?country=${country.code}&purpose=${purpose}`}>{t(locale,'explore')} →</Link></p></section>})}</main>;
}
