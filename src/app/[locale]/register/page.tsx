'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { CountrySelector } from '@/components/CountrySelector';
import { isLocale } from '@/lib/i18n';
import { msg } from '@/lib/messages';

export default function RegisterPage() {
  const params = useParams<{ locale: string }>();
  const locale = isLocale(params.locale) ? params.locale : 'en';
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  return <main className="section wrap"><div className="panel" style={{ maxWidth: 550, margin: 'auto' }}><h1>{msg(locale, 'auth', 'createAccount')}</h1><form className="form" onSubmit={async event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = { ...Object.fromEntries(form), termsConsent: form.has('termsConsent'), locale };
    if (form.get('password') !== form.get('confirmPassword')) { setFailed(true); setMessage(msg(locale, 'auth', 'confirmPassword')); return; }
    const response = await fetch('/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
    const result = await response.json();
    setFailed(!response.ok);
    setMessage(response.ok ? msg(locale, 'auth', 'accountCreated') : result.error || msg(locale, 'auth', 'invalidCredentials'));
  }}>
    <label>{msg(locale, 'auth', 'fullName')}<input name="fullName" required autoComplete="name" /></label>
    <label>{msg(locale, 'auth', 'email')}<input name="email" type="email" required autoComplete="email" /></label>
    <label>{msg(locale, 'auth', 'phone')}<input name="phone" type="tel" required autoComplete="tel" /></label>
    <label>{msg(locale, 'auth', 'residence')}<CountrySelector name="countryCode" label={msg(locale,'auth','residence')} allowEmpty={false}/></label>
    <label>{msg(locale, 'auth', 'password')}<input name="password" type="password" minLength={12} required autoComplete="new-password" /></label>
    <label>{msg(locale, 'auth', 'confirmPassword')}<input name="confirmPassword" type="password" minLength={12} required autoComplete="new-password" /></label>
    <label className="checkbox-label"><input name="termsConsent" type="checkbox" required />{msg(locale, 'auth', 'terms')}</label><p className="muted"><Link href={`/${locale}/terms`}>Terms</Link> · <Link href={`/${locale}/privacy`}>Privacy</Link></p>
    <button className="button" type="submit">{msg(locale, 'auth', 'createAccount')}</button>
    {message && <p role={failed ? 'alert' : 'status'}>{message}</p>}
  </form><p><Link href={`/${locale}/login`}>{msg(locale, 'auth', 'signIn')}</Link></p></div></main>;
}
