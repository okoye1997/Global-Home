import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { isLocale } from '@/lib/i18n';
import { FxRate } from '@/lib/models';
import { AdminFxForm } from '@/components/AdminFxForm';
import { AdminFxDecisionButton } from '@/components/AdminFxDecisionButton';

export default async function AdminFxRates({params}:{params:Promise<{locale:string}>}){const {locale}=await params;if(!isLocale(locale))notFound();const user=await currentUser();if(!user)redirect(`/${locale}/login`);if(user.role!=='admin')notFound();const items=await FxRate.find().sort({effectiveAt:-1}).limit(100).lean();return <main className="section wrap"><p><Link href={`/${locale}/admin`}>← Admin dashboard</Link></p><h1>FX rates</h1><div className="detail"><section className="country-table-wrap"><table className="country-table"><thead><tr><th>Pair</th><th>Rate</th><th>Source</th><th>Effective</th><th>Status</th><th>Decision</th></tr></thead><tbody>{items.map(item=><tr key={String(item._id)}><td>{item.baseCurrency}/{item.quoteCurrency}</td><td>{item.rate}</td><td><span>{item.provider}</span><br/><small>{item.sourceReference||'No reference recorded'}</small></td><td>{new Date(item.effectiveAt).toLocaleString(locale)}</td><td>{item.approved?'Approved':'Pending'}</td><td><AdminFxDecisionButton id={String(item._id)} approved={item.approved}/></td></tr>)}</tbody></table></section><aside className="panel"><AdminFxForm/></aside></div></main>}
