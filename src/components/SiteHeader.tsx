'use client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { Globe2, Mail, Menu, MessageCircle, X } from 'lucide-react';
import { isLocale, t, type Locale } from '@/lib/i18n';
import { landingText as copy } from '@/lib/landing-copy';
import type { LocaleOption } from '@/lib/locale-registry';
import { BrandLogo } from '@/components/BrandLogo';

type Contact = { supportEmail: string; whatsAppNumber: string };
export function SiteHeader({ locale, availableLocales, contact, authenticated }: { locale: Locale; availableLocales: LocaleOption[]; contact: Contact; authenticated: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const query = useSearchParams();
  const [open, setOpen] = useState(false);
  const links = [
    { href: `/${locale}`, label: t(locale, 'home') },
    { href: `/${locale}/properties`, label: t(locale, 'properties') },
    { href: `/${locale}/lands`, label: t(locale, 'lands') },
    { href: `/${locale}/rent`, label: t(locale, 'rent') },
    { href: `/${locale}/invest`, label: t(locale, 'invest') },
    { href: `/${locale}/hotels`, label: copy(locale, 'hotelsEvents') },
    { href: `/${locale}/countries`, label: t(locale, 'countries') },
    { href: `/${locale}/about`, label: t(locale, 'about') },
    { href: `/${locale}/contact`, label: t(locale, 'contact') },
  ];
  const whatsApp = contact.whatsAppNumber ? `https://wa.me/${contact.whatsAppNumber.replace(/\D/g, '')}` : '';
  async function chooseLocale(next: string) {
    if (!availableLocales.some(item => item.code === next) || !isLocale(next)) return;
    const path = pathname.replace(/^\/[a-z]{2,3}(?:-[A-Z]{2})?(?=\/|$)/, `/${next}`);
    const target = `${path}${query.size ? `?${query}` : ''}`;
    try {
      const response = await fetch('/api/preferences', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ locale: next }) });
      if (response.ok) { router.push(target); router.refresh(); setOpen(false); }
    } catch { /* Keep the current language if the preference cannot be saved. */ }
  }
  const languageControl = <label className="language-control"><Globe2 aria-hidden="true" size={17}/><span className="sr-only">{copy(locale, 'language')}</span><select aria-label={copy(locale, 'language')} value={locale} onChange={event => void chooseLocale(event.target.value)}>{availableLocales.map(item => <option key={item.code} value={item.code}>{item.nativeName}</option>)}</select></label>;
  return <header className="top">
    <div className="utility-bar"><div className="wrap utility-inner"><div className="utility-contact">
      {contact.supportEmail && <a href={`mailto:${contact.supportEmail}`}><Mail size={15} aria-hidden="true"/><span>{contact.supportEmail}</span></a>}
      {whatsApp && <a href={whatsApp} target="_blank" rel="noopener noreferrer"><MessageCircle size={15} aria-hidden="true"/><span>{contact.whatsAppNumber}</span></a>}
    </div><div className="desktop-language">{languageControl}</div></div></div>
    <div className="wrap nav"><Link className="logo" href={`/${locale}`} aria-label="GlobalHome home"><BrandLogo /></Link>
      <nav className="links" aria-label="Main navigation">{links.map(link => <Link key={link.href} href={link.href}>{link.label}</Link>)}</nav>
      <div className="header-actions">{authenticated ? <Link className="header-register" href={`/${locale}/dashboard`}>{copy(locale, 'dashboard')}</Link> : <><Link className="header-login" href={`/${locale}/login`}>{copy(locale, 'login')}</Link><Link className="header-register" href={`/${locale}/register`}>{copy(locale, 'register')}</Link></>}</div>
      <div className="mobile-controls">{languageControl}<button className="menu-toggle" type="button" aria-label={copy(locale, 'menu')} aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen(value => !value)}>{open ? <X size={23}/> : <Menu size={23}/>}</button></div>
    </div>
    <nav id="mobile-nav" className={`mobile-nav ${open ? 'open' : ''}`} aria-label="Mobile navigation">{links.map(link => <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>{link.label}</Link>)}<div className="mobile-auth">{authenticated ? <Link href={`/${locale}/dashboard`} onClick={() => setOpen(false)}>{copy(locale, 'dashboard')}</Link> : <><Link href={`/${locale}/login`} onClick={() => setOpen(false)}>{copy(locale, 'login')}</Link><Link className="header-register" href={`/${locale}/register`} onClick={() => setOpen(false)}>{copy(locale, 'register')}</Link></>}</div><div className="mobile-contact">{contact.supportEmail && <a href={`mailto:${contact.supportEmail}`}><Mail size={16}/>{contact.supportEmail}</a>}{whatsApp && <a href={whatsApp} target="_blank" rel="noopener noreferrer"><MessageCircle size={16}/>{contact.whatsAppNumber}</a>}</div></nav>
  </header>;
}
