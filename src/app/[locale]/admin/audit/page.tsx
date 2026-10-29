import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { isLocale } from '@/lib/i18n';
import { AuditEvent } from '@/lib/models';

export default async function AuditPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ page?: string; action?: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const admin = await currentUser();
  if (!admin) redirect(`/${locale}/login`);
  if (admin.role !== 'admin') notFound();
  const query = await searchParams;
  const page = Math.max(1, Math.min(10000, Number(query.page) || 1));
  const action = (query.action || '').trim().slice(0, 100);
  const filter = action ? { action } : {};
  const [events, total] = await Promise.all([AuditEvent.find(filter).select('actorId action targetType targetId createdAt').sort({ createdAt: -1 }).skip((page - 1) * 50).limit(50).lean(), AuditEvent.countDocuments(filter)]);
  return <main className="section wrap"><p><Link href={`/${locale}/admin`}>← Admin dashboard</Link></p><h1>Audit events</h1><form className="filters"><label>Action<input name="action" defaultValue={action} maxLength={100} placeholder="Exact action"/></label><button className="button">Filter</button></form>{events.length ? <div className="country-table-wrap"><table className="country-table"><thead><tr><th>Time</th><th>Action</th><th>Actor ID</th><th>Target</th></tr></thead><tbody>{events.map(event => <tr key={String(event._id)}><td>{new Date(event.createdAt).toLocaleString(locale)}</td><td>{event.action}</td><td>{String(event.actorId || 'system')}</td><td>{event.targetType} {String(event.targetId || '')}</td></tr>)}</tbody></table></div> : <p className="empty">No audit events match this filter.</p>}<nav className="pagination">{page > 1 && <Link href={`?action=${encodeURIComponent(action)}&page=${page - 1}`}>Previous</Link>}<span>{page} / {Math.ceil(total / 50) || 1}</span>{page * 50 < total && <Link href={`?action=${encodeURIComponent(action)}&page=${page + 1}`}>Next</Link>}</nav></main>;
}
