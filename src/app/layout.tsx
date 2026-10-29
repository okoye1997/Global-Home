import './globals.css';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { isLocale } from '@/lib/i18n';
import { localeDirection } from '@/lib/locale-registry';
export const metadata: Metadata = { title: 'GlobalHome | REAL ESTATE WORLDWIDE', description: 'Worldwide property marketplace' };
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { const value=(await headers()).get('x-gh-locale')||'en';const locale=isLocale(value)?value:'en';return <html lang={locale} dir={await localeDirection(locale)}><body>{children}</body></html>; }
