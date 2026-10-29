import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isLocale, t } from '@/lib/i18n';
import { CountryBadge } from '@/components/CountryBadge';
import { CountryDirectorySearch } from '@/components/CountryDirectorySearch';
import { listCountries } from '@/lib/marketplace';

export default async function CountriesPage({params,searchParams}:{params:Promise<{locale:string}>;searchParams:Promise<{q?:string}>}){
  const {locale}=await params;
  if(!isLocale(locale))notFound();
  const {q=''}=await searchParams;
  const search=q.trim().toLowerCase();
  const countries=await listCountries();
  const matches=countries.filter(country=>!search||[country.name,country.code,country.iso3,country.currencyName,country.currencyCode].some(value=>value?.toLowerCase().includes(search)));
  return <main className="section wrap"><h1>{t(locale,'countries')}</h1><CountryDirectorySearch initial={q}/><div className="cards">{matches.map(country=><Link className="panel" key={country.code} href={`/${locale}/countries/${country.code.toLowerCase()}`}><CountryBadge code={country.code}/></Link>)}</div>{!matches.length&&<p className="empty">{t(locale,'noResults')}</p>}</main>;
}
