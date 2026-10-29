import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { IdentitySubmission } from '@/components/IdentitySubmission';
import { currentUser } from '@/lib/auth';
import { isLocale } from '@/lib/i18n';
import { IdentityVerification } from '@/lib/models';

export default async function VerificationPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const user = await currentUser();
  if (!user) redirect(`/${locale}/login`);
  const verification = await IdentityVerification.findOne({ userId: user._id }).select('status reviewNote documentIds').lean();
  return <main className="section wrap"><p><Link href={`/${locale}/dashboard`}>← Dashboard</Link></p><h1>ID verification</h1><p className="muted">Documents are stored privately and available only to you and authorized administrators.</p>{!user.emailVerifiedAt && <p className="notice">Verify your email before submitting an identity document.</p>}{verification?.reviewNote && <p className="notice">Review note: {verification.reviewNote}</p>}<IdentitySubmission initialStatus={verification?.status || 'not_started'}/>{!!verification?.documentIds?.length && <section className="section"><h2>My submitted documents</h2><ul>{verification.documentIds.map((id: unknown) => <li key={String(id)}><a href={`/api/identity/documents/${id}`}>Download private document</a></li>)}</ul></section>}</main>;
}
