import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { isLocale, money } from '@/lib/i18n';
import { Property } from '@/lib/models';
import { CountryBadge } from '@/components/CountryBadge';
import { AdminPropertyCreateForm } from '@/components/AdminPropertyCreateForm';

export default async function AdminProperties({params,searchParams}:{params:Promise<{locale:string}>;searchParams:Promise<{page?:string}>}){
  const {locale}=await params;if(!isLocale(locale))notFound();const user=await currentUser();if(!user)redirect(`/${locale}/login`);if(user.role!=='admin')notFound();
  const {page='1'}=await searchParams;const current=Math.max(1,Math.min(10000,Number(page)||1));
  const [items,total]=await Promise.all([Property.find().select('title slug status verificationStatus isDemo countryCode currencyCode localPriceMinor city').sort({createdAt:-1}).skip((current-1)*30).limit(30).lean(),Property.countDocuments()]);
  return <main className="section wrap"><h1>Property management</h1><div className="detail"><section><h2>All records</h2><div className="dashboard-records">{items.map(item=><Link className="panel" key={String(item._id)} href={`/${locale}/admin/properties/${item._id}`}><strong>{item.title}</strong><p><CountryBadge code={item.countryCode} city={item.city} compact/> · {money(item.localPriceMinor,item.currencyCode,locale)}</p><small>{item.status} · {item.isDemo ? 'illustrative' : item.verificationStatus}</small></Link>)}</div><nav className="pagination">{current>1&&<Link href={`?page=${current-1}`}>Previous</Link>}<span>{current} / {Math.ceil(total/30)||1}</span>{current*30<total&&<Link href={`?page=${current+1}`}>Next</Link>}</nav></section><aside className="panel"><AdminPropertyCreateForm/></aside></div></main>;
}
