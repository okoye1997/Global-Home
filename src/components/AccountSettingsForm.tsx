'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CountrySelector } from './CountrySelector';
import { msg } from '@/lib/messages';

export function AccountSettingsForm({ initial, locale }: { initial: { fullName: string; phone: string; countryCode: string; email: string }; locale: string }) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/account', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fullName: form.get('fullName'), phone: form.get('phone'), countryCode: form.get('countryCode') }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || msg(locale, 'settings', 'profileError'));
      setMessage(msg(locale, 'settings', 'profileSaved')); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : msg(locale, 'settings', 'profileError')); }
    finally { setBusy(false); }
  }
  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage('');
    const form = new FormData(event.currentTarget);
    if (form.get('newPassword') !== form.get('confirmPassword')) { setMessage(msg(locale, 'settings', 'passwordsMismatch')); setBusy(false); return; }
    try {
      const response = await fetch('/api/account/password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword: form.get('currentPassword'), newPassword: form.get('newPassword') }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || msg(locale, 'settings', 'passwordError'));
      router.push(`/${locale}/login`);
    } catch (error) { setMessage(error instanceof Error ? error.message : msg(locale, 'settings', 'passwordError')); }
    finally { setBusy(false); }
  }
  return <div className="dashboard-records"><form className="form panel" onSubmit={save}><h2>{msg(locale,'settings','profile')}</h2><label>{msg(locale,'settings','fullName')}<input name="fullName" defaultValue={initial.fullName} minLength={2} required/></label><label>{msg(locale,'settings','email')}<input value={initial.email} readOnly type="email"/></label><label>{msg(locale,'settings','phone')}<input name="phone" defaultValue={initial.phone} type="tel" required/></label><label>{msg(locale,'settings','residence')}<CountrySelector name="countryCode" value={initial.countryCode} allowEmpty={false}/></label><button className="button" disabled={busy}>{msg(locale,'settings','saveProfile')}</button></form><form className="form panel" onSubmit={changePassword}><h2>{msg(locale,'settings','changePassword')}</h2><label>{msg(locale,'settings','currentPassword')}<input name="currentPassword" type="password" autoComplete="current-password" required/></label><label>{msg(locale,'settings','newPassword')}<input name="newPassword" type="password" autoComplete="new-password" minLength={12} required/></label><label>{msg(locale,'settings','confirmPassword')}<input name="confirmPassword" type="password" autoComplete="new-password" minLength={12} required/></label><p className="muted">{msg(locale,'settings','passwordSignOut')}</p><button className="button button-secondary" disabled={busy}>{msg(locale,'settings','changePassword')}</button></form>{message && <p role="status" className="notice">{message}</p>}</div>;
}
