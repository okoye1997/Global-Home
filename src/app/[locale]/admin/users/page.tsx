import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { isLocale } from '@/lib/i18n';
import { User } from '@/lib/models';
import { CountryBadge } from '@/components/CountryBadge';

export default async function UsersPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ page?: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const admin = await currentUser();
  if (!admin) redirect(`/${locale}/login`);
  if (admin.role !== 'admin') notFound();
  const page = Math.max(1, Math.min(10000, Number((await searchParams).page) || 1));
  const [users, total] = await Promise.all([User.find().select('fullName email countryCode role emailVerifiedAt createdAt').sort({ createdAt: -1 }).skip((page - 1) * 50).limit(50).lean(), User.countDocuments()]);
  return <main className="section wrap"><p><Link href={`/${locale}/admin`}>← Admin dashboard</Link></p><h1>Users</h1><p>{total} registered accounts. Admin roles are provisioned through the controlled MFA setup process.</p>{users.length ? <div className="country-table-wrap"><table className="country-table"><thead><tr><th>Name</th><th>Email</th><th>Country</th><th>Role</th><th>Email status</th><th>Registered</th></tr></thead><tbody>{users.map(user => <tr key={String(user._id)}><td>{user.fullName}</td><td>{user.email}</td><td><CountryBadge code={user.countryCode} compact/></td><td>{user.role}</td><td>{user.emailVerifiedAt ? 'Verified' : 'Pending'}</td><td>{new Date(user.createdAt).toLocaleDateString(locale)}</td></tr>)}</tbody></table></div> : <p className="empty">No users are registered.</p>}<nav className="pagination">{page > 1 && <Link href={`?page=${page - 1}`}>Previous</Link>}<span>{page} / {Math.ceil(total / 50) || 1}</span>{page * 50 < total && <Link href={`?page=${page + 1}`}>Next</Link>}</nav></main>;
}
