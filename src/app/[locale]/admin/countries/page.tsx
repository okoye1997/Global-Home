import { notFound, redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { connectDb } from '@/lib/db';
import { isLocale } from '@/lib/i18n';
import { Country, Property } from '@/lib/models';
import { CountryBadge } from '@/components/CountryBadge';
import { CountryAvailabilityButton } from '@/components/CountryAvailabilityButton';

export default async function AdminCountries({params,searchParams}:{params:Promise<{locale:string}>;searchParams:Promise<{q?:string;page?:string}>}){
  const {locale}=await params;if(!isLocale(locale))notFound();
  const user=await currentUser();if(!user)redirect(`/${locale}/login`);if(user.role!=='admin')notFound();
  await connectDb();const {q='',page='1'}=await searchParams;const current=Math.max(1,Math.min(25,Number(page)||1));
  const query=q.trim()?{$or:[{name:{$regex:q.trim().replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),$options:'i'}},{code:q.trim().toUpperCase()},{iso3:q.trim().toUpperCase()},{currencyCode:q.trim().toUpperCase()},{currencyName:{$regex:q.trim().replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),$options:'i'}}]}:{};
  const [countries,total,counts]=await Promise.all([Country.find(query).sort({name:1}).skip((current-1)*25).limit(25).lean(),Country.countDocuments(query),Property.aggregate([{$group:{_id:'$countryCode',count:{$sum:1}}}])]);
  const propertyCounts=new Map(counts.map(item=>[item._id,item.count]));
  return <main className="section wrap"><h1>Countries &amp; currencies</h1><form className="filters"><input type="search" name="q" defaultValue={q} placeholder="Country, ISO code or currency"/><button className="button">Search</button></form><div className="country-table-wrap"><table className="country-table"><thead><tr><th>Country</th><th>ISO2 / ISO3</th><th>Currency</th><th>Properties</th><th>Status</th><th>Action</th></tr></thead><tbody>{countries.map(country=><tr key={country.code}><td><CountryBadge code={country.code} compact/></td><td>{country.code} / {country.iso3}</td><td>{country.currencyName} · {country.currencyCode} ({country.currencySymbol})</td><td>{propertyCounts.get(country.code)||0}</td><td>{country.enabled?'Active':'Disabled'}</td><td><CountryAvailabilityButton code={country.code} enabled={country.enabled}/></td></tr>)}</tbody></table></div><p>{current} / {Math.ceil(total/25)||1}</p><nav className="pagination">{current>1&&<a href={`?q=${encodeURIComponent(q)}&page=${current-1}`}>Previous</a>}{current*25<total&&<a href={`?q=${encodeURIComponent(q)}&page=${current+1}`}>Next</a>}</nav></main>;
}
