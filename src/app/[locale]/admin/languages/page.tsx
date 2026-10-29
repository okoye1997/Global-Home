import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { isLocale } from '@/lib/i18n';
import { LocaleConfig, Translation } from '@/lib/models';
import { AdminLanguageForms } from '@/components/AdminLanguageForms';

export default async function LanguagesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const user = await currentUser();
  if (!user) redirect(`/${locale}/login`);
  if (user.role !== 'admin') notFound();
  const [rows, approved, drafts] = await Promise.all([LocaleConfig.find().sort({ localeCode: 1 }).lean(), Translation.countDocuments({ status: 'approved' }), Translation.countDocuments({ status: 'draft' })]);
  return <main className="section wrap"><p><Link href={`/${locale}/admin`}>← Admin dashboard</Link></p><h1>Languages and translations</h1><p>{approved} approved translations · {drafts} drafts. New text falls back to English until reviewed.</p><AdminLanguageForms locales={rows.map(row => ({ code: row.localeCode, name: row.languageName || row.localeCode, nativeName: row.nativeName || row.localeCode, direction: row.direction, enabled: row.enabled }))}/></main>;
}
