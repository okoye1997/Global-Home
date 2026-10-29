'use client';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { isLocale, t } from '@/lib/i18n';
import { msg } from '@/lib/messages';

export default function LoginPage() {
  const params = useParams<{ locale: string }>();
  const locale = isLocale(params.locale) ? params.locale : 'en';
  const router = useRouter();
  const search = useSearchParams();
  const [error, setError] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);

  function finishLogin(preferredLocale: unknown, role: unknown) {
    const preferred = typeof preferredLocale === 'string' && isLocale(preferredLocale) ? preferredLocale : locale;
    const requested = search.get('next');
    const destination = requested?.startsWith(`/${locale}/`) && !requested.startsWith('//')
      ? requested.replace(`/${locale}/`, `/${preferred}/`) : `/${preferred}/${role === 'admin' ? 'admin' : 'dashboard'}`;
    router.push(destination);
    router.refresh();
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNeedsVerification(false);
    const form = new FormData(event.currentTarget);
    const response = await fetch(mfaRequired ? '/api/auth/login/mfa' : '/api/auth/login', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(mfaRequired ? { mfaCode: form.get('mfaCode') } : { email: form.get('email'), password: form.get('password') }),
    });
    const result = await response.json();
    if (response.ok && result.mfaRequired) { setMfaRequired(true); return; }
    if (response.ok) { finishLogin(result.preferredLocale, result.user?.role); return; }
    if (mfaRequired && result.error === 'MFA challenge expired') setMfaRequired(false);
    if (result.error === 'Email verification required') setNeedsVerification(true);
    setError(result.error === 'Email verification required' ? msg(locale, 'auth', 'verificationRequired')
      : result.error === 'Admin MFA enrollment required' ? msg(locale, 'auth', 'mfaEnrollmentRequired')
        : mfaRequired ? msg(locale, 'auth', 'invalidMfaCode') : msg(locale, 'auth', 'invalidCredentials'));
  }

  return <main className="section wrap"><div className="panel" style={{ maxWidth: 530, margin: 'auto' }}>
    <h1>{mfaRequired ? msg(locale, 'auth', 'mfaHeading') : msg(locale, 'auth', 'signIn')}</h1>
    <form className="form" onSubmit={submit}>
      {mfaRequired ? <>
        <p>{msg(locale, 'auth', 'mfaInstructions')}</p>
        <label>{msg(locale, 'auth', 'mfaCode')}<input name="mfaCode" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required autoComplete="one-time-code" autoFocus /></label>
        <button className="button" type="submit">{msg(locale, 'auth', 'verifyMfa')}</button>
        <button type="button" onClick={() => { setMfaRequired(false); setError(''); }}>{msg(locale, 'auth', 'backToSignIn')}</button>
      </> : <>
        <label>{msg(locale, 'auth', 'email')}<input name="email" type="email" required autoComplete="email" /></label>
        <label>{msg(locale, 'auth', 'password')}<input name="password" type="password" required autoComplete="current-password" /></label>
        <button className="button" type="submit">{msg(locale, 'auth', 'signIn')}</button>
      </>}
      {error && <p role="alert">{error}</p>}
    </form>
    {!mfaRequired && <><p><Link href={`/${locale}/forgot-password`}>{msg(locale, 'auth', 'forgotPassword')}</Link></p>{needsVerification && <p><Link href={`/${locale}/resend-verification`}>{msg(locale, 'auth', 'resendVerification')}</Link></p>}<p><Link href={`/${locale}/register`}>{t(locale, 'register')}</Link></p></>}
  </div></main>;
}
