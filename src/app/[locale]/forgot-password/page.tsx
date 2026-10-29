'use client';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { isLocale } from '@/lib/i18n';
import { msg } from '@/lib/messages';
export default function ForgotPasswordPage() {
  const params = useParams<{ locale: string }>();
  const locale = isLocale(params.locale) ? params.locale : 'en';
  const [message, setMessage] = useState('');
  return <main className="section wrap"><div className="panel" style={{ maxWidth: 510, margin: 'auto' }}><h1>{msg(locale, 'auth', 'forgotPassword')}</h1><form className="form" onSubmit={async event => { event.preventDefault(); const form = new FormData(event.currentTarget); const response = await fetch('/api/auth/forgot', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(Object.fromEntries(form)) }); setMessage(response.ok ? msg(locale, 'auth', 'checkEmail') : msg(locale, 'marketplace', 'unavailable')); }}><label>{msg(locale, 'auth', 'email')}<input name="email" type="email" required autoComplete="email" /></label><button className="button">{msg(locale, 'auth', 'resetPassword')}</button>{message && <p role="status">{message}</p>}</form></div></main>;
}
