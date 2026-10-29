import Link from 'next/link';
import mongoose from 'mongoose';
import { notFound, redirect } from 'next/navigation';
import { AdminIdentityReview } from '@/components/AdminIdentityReview';
import { currentUser } from '@/lib/auth';
import { isLocale } from '@/lib/i18n';
import { IdentityVerification } from '@/lib/models';

export default async function AdminVerificationPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const user = await currentUser();
  if (!user) redirect(`/${locale}/login`);
  if (user.role !== 'admin') notFound();
  const rows = await IdentityVerification.find({ status: { $in: ['submitted', 'under_review'] } }).sort({ createdAt: 1 }).limit(100).populate('userId', 'fullName email').lean();
  return <main className="section wrap"><p><Link href={`/${locale}/admin`}>← Admin dashboard</Link></p><h1>ID verification review</h1><p className="notice">Approval requires every document to have a clean malware scan. Configure an approved scanning service before approving submissions.</p><div className="dashboard-records">{rows.length ? rows.map(row => <article className="panel" key={String(row._id)}><h2>{row.userId?.fullName || 'User'}</h2><p>{row.userId?.email} · {row.status}</p><ul>{row.documentIds.map((id: mongoose.Types.ObjectId) => <li key={String(id)}><a href={`/api/identity/documents/${id}`} target="_blank" rel="noopener noreferrer">Download private document</a></li>)}</ul><AdminIdentityReview id={String(row._id)}/></article>) : <p className="empty">No submissions awaiting review.</p>}</div></main>;
}
