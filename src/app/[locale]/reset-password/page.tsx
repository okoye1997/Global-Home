'use client';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { isLocale } from '@/lib/i18n';
import { msg } from '@/lib/messages';
export default function ResetPasswordPage() {
  const params = useParams<{ locale: string }>();
  const locale = isLocale(params.locale) ? params.locale : 'en';
  const token = useSearchParams().get('token') || '';
  const router = useRouter();
  const [error, setError] = useState('');
  return <main className="section wrap"><div className="panel" style={{ maxWidth: 510, margin: 'auto' }}><h1>{msg(locale, 'auth', 'resetPassword')}</h1><form className="form" onSubmit={async event => { event.preventDefault(); const form = new FormData(event.currentTarget); if (form.get('password') !== form.get('confirmPassword')) { setError(msg(locale, 'auth', 'confirmPassword')); return; } const response = await fetch('/api/auth/reset', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, password: form.get('password') }) }); if (response.ok) router.push(`/${locale}/login`); else setError(msg(locale, 'auth', 'invalidCredentials')); }}><label>{msg(locale, 'auth', 'password')}<input name="password" type="password" minLength={12} required autoComplete="new-password" /></label><label>{msg(locale, 'auth', 'confirmPassword')}<input name="confirmPassword" type="password" minLength={12} required autoComplete="new-password" /></label><button className="button">{msg(locale, 'auth', 'resetPassword')}</button>{error && <p role="alert">{error}</p>}</form></div></main>;
}
