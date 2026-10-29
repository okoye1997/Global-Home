import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { AdminSettingsForm } from '@/components/AdminSettingsForm';
import { currentUser } from '@/lib/auth';
import { isLocale } from '@/lib/i18n';
import { AdminSettings } from '@/lib/models';

export default async function AdminSettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const user = await currentUser();
  if (!user) redirect(`/${locale}/login`);
  if (user.role !== 'admin') notFound();
  const settings = await AdminSettings.findOne({ key: 'global' }).lean();
  return <main className="section wrap"><p><Link href={`/${locale}/admin`}>← Admin dashboard</Link></p><h1>Public contact settings</h1><p className="muted">These details appear on published property pages. Provider credentials remain in server environment settings.</p><AdminSettingsForm initial={{ displayName: settings?.displayName || process.env.ADMIN_DISPLAY_NAME || 'GlobalHome Admin', supportEmail: settings?.supportEmail || process.env.ADMIN_SUPPORT_EMAIL || '', whatsAppNumber: settings?.whatsAppNumber || process.env.ADMIN_WHATSAPP_NUMBER || '', supportHours: settings?.supportHours || '' }}/></main>;
}
