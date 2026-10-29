import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { isLocale } from '@/lib/i18n';
import { privateDocumentKinds } from '@/lib/document-files';
import { Document } from '@/lib/models';
import { AdminDocumentUpload } from '@/components/AdminDocumentUpload';

export default async function AdminDocumentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const user = await currentUser();
  if (!user) redirect(`/${locale}/login`);
  if (user.role !== 'admin') notFound();
  const documents = await Document.find({ kind: { $in: privateDocumentKinds }, visibility: 'private' }).select('title kind ownerId propertyId scanStatus createdAt').sort({ createdAt: -1 }).limit(100).lean();
  return <main className="section wrap"><p><Link href={`/${locale}/admin`}>← Admin dashboard</Link></p><h1>Private documents</h1><div className="detail"><section><h2>Recent documents</h2>{documents.length ? <div className="dashboard-records">{documents.map(item => <div className="panel" key={String(item._id)}><strong>{item.title || item.kind}</strong><p>{item.kind} · {item.scanStatus} · {new Date(item.createdAt).toLocaleDateString(locale)}</p><small>Owner: {String(item.ownerId || 'Admin only')} · Property: {String(item.propertyId || 'None')}</small>{item.scanStatus === 'clean' && <p><a href={`/api/documents/${item._id}`}>Download</a></p>}</div>)}</div> : <p className="empty">No documents have been uploaded.</p>}</section><aside><AdminDocumentUpload/></aside></div></main>;
}
