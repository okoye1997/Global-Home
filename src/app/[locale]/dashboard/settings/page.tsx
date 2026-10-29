import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { AccountSettingsForm } from '@/components/AccountSettingsForm';
import { currentUser } from '@/lib/auth';
import { isLocale } from '@/lib/i18n';

export default async function AccountSettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const user = await currentUser();
  if (!user) redirect(`/${locale}/login`);
  return <main className="section wrap"><p><Link href={`/${locale}/dashboard`}>← Dashboard</Link></p><h1>Account settings</h1><AccountSettingsForm initial={{ fullName: user.fullName, phone: user.phone, countryCode: user.countryCode, email: user.email }} locale={locale}/></main>;
}
