import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { isLocale } from '@/lib/i18n';
import { privateDocumentKinds } from '@/lib/document-files';
import { Document } from '@/lib/models';

export default async function DocumentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const user = await currentUser();
  if (!user) redirect(`/${locale}/login`);
  const documents = await Document.find({ ownerId: user._id, kind: { $in: privateDocumentKinds }, visibility: 'private' }).select('title kind mimeType sizeBytes scanStatus createdAt').sort({ createdAt: -1 }).limit(100).lean();
  return <main className="section wrap"><p><Link href={`/${locale}/dashboard`}>← Dashboard</Link></p><h1>My documents</h1><p>Private documents are available only to authorized users after a clean file scan.</p>{documents.length ? <div className="dashboard-records">{documents.map(item => <div className="panel" key={String(item._id)}><strong>{item.title || item.kind}</strong><p>{item.kind} · {new Date(item.createdAt).toLocaleDateString(locale)} · {item.scanStatus}</p>{item.scanStatus === 'clean' ? <a href={`/api/documents/${item._id}`}>Download document</a> : <span className="muted">Download available after a clean scan</span>}</div>)}</div> : <p className="empty">No documents have been shared with you.</p>}</main>;
}
