import { notFound } from 'next/navigation';
import { isLocale, locales } from '@/lib/i18n';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import { enabledLocales, localeDirection } from '@/lib/locale-registry';
import { publicAdminContact } from '@/lib/marketplace';
import { currentUser } from '@/lib/auth';
import { landingText as copy } from '@/lib/landing-copy';
import { BrandLogo } from '@/components/BrandLogo';
export const dynamic = 'force-dynamic';
export function generateStaticParams() { return locales.map(locale => ({ locale })); }
export async function generateMetadata({params}:{params:Promise<{locale:string}>}):Promise<Metadata>{const {locale}=await params;if(!isLocale(locale))return {};const base=process.env.APP_BASE_URL||'http://localhost:3000';const available=await enabledLocales();return {title:'GlobalHome | REAL ESTATE WORLDWIDE',alternates:{canonical:`${base}/${locale}`,languages:Object.fromEntries(available.map(item=>[item.code,`${base}/${item.code}`]))}}}
export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params; if (!isLocale(locale)) notFound();
  const available = await enabledLocales();
  if (!available.some(item => item.code === locale)) notFound();
  const contact = { supportEmail: process.env.ADMIN_SUPPORT_EMAIL || '', whatsAppNumber: process.env.ADMIN_WHATSAPP_NUMBER || '' };
  if (process.env.MONGODB_URI && process.env.GH_BUILD_OFFLINE !== '1') {
    try { Object.assign(contact, await publicAdminContact()); } catch { /* Public routes remain available when contact settings cannot be loaded. */ }
  }
  const authenticated = Boolean(await currentUser());
  const whatsApp = contact.whatsAppNumber ? `https://wa.me/${contact.whatsAppNumber.replace(/\D/g, '')}` : '';
  const footerLinks = [
    { href: `/${locale}/properties`, label: copy(locale, 'properties') }, { href: `/${locale}/countries`, label: copy(locale, 'countries') },
    { href: `/${locale}/about`, label: copy(locale, 'about') }, { href: `/${locale}/contact`, label: copy(locale, 'contact') },
    { href: `/${locale}/terms`, label: copy(locale, 'terms') }, { href: `/${locale}/privacy`, label: copy(locale, 'privacy') },
  ];
  return <div className="site-shell" lang={locale} dir={await localeDirection(locale)}><Suspense><SiteHeader locale={locale} availableLocales={available} contact={contact} authenticated={authenticated} /></Suspense>{children}<footer className="footer"><div className="wrap footer-inner"><div><BrandLogo /><p>© {new Date().getFullYear()} GlobalHome</p></div><nav aria-label="Footer navigation">{footerLinks.map(link => <Link key={link.href} href={link.href}>{link.label}</Link>)}</nav><div className="footer-contact">{contact.supportEmail && <a href={`mailto:${contact.supportEmail}`}>{contact.supportEmail}</a>}{whatsApp && <a href={whatsApp} target="_blank" rel="noopener noreferrer">WhatsApp</a>}</div></div></footer></div>;
}
