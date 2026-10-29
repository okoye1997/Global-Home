'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { sourceMessages } from '@/lib/messages';

export function AdminLanguageForms({ locales }: { locales: { code: string; name: string; nativeName: string; direction: string; enabled: boolean }[] }) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function save(event: React.FormEvent<HTMLFormElement>, endpoint: string, body: Record<string, unknown>) {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const response = await fetch(endpoint, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Update failed');
      setMessage('Saved.'); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Update failed'); }
    finally { setBusy(false); }
  }
  return <div className="dashboard-records">
    {locales.map(locale => <form className="panel form" key={locale.code} onSubmit={event => { const form = new FormData(event.currentTarget); void save(event, '/api/admin/languages', { localeCode: locale.code, languageName: form.get('languageName'), nativeName: form.get('nativeName'), direction: form.get('direction'), enabled: form.get('enabled') === 'on', fallbackLocale: 'en' }); }}><h2>{locale.code}</h2><label>Language name<input name="languageName" defaultValue={locale.name} minLength={2} required/></label><label>Native name<input name="nativeName" defaultValue={locale.nativeName} minLength={2} required/></label><label>Direction<select name="direction" defaultValue={locale.direction}><option value="ltr">LTR</option><option value="rtl">RTL</option></select></label><label><input type="checkbox" name="enabled" defaultChecked={locale.enabled}/> Enabled</label><button className="button" disabled={busy}>Save locale</button></form>)}
    <form className="panel form" onSubmit={event => { const form = new FormData(event.currentTarget); void save(event, '/api/admin/translations', { localeCode: form.get('localeCode'), namespace: form.get('namespace'), key: form.get('key'), value: form.get('value'), status: form.get('status') }); }}><h2>Review a translation</h2><label>Locale<select name="localeCode">{locales.map(locale => <option key={locale.code} value={locale.code}>{locale.nativeName}</option>)}</select></label><label>Namespace<select name="namespace">{Object.keys(sourceMessages).map(namespace => <option key={namespace} value={namespace}>{namespace}</option>)}</select></label><label>Key<input name="key" placeholder="Existing translation key" required/></label><label>Translated value<textarea name="value" maxLength={10000} required/></label><label>Status<select name="status"><option value="draft">Draft</option><option value="approved">Approved after review</option></select></label><button className="button" disabled={busy}>Save translation</button></form>
    {message && <p className="notice" role="status">{message}</p>}
  </div>;
}
