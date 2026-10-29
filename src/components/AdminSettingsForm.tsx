'use client';

import { useState } from 'react';

type Settings = { displayName: string; supportEmail: string; whatsAppNumber: string; supportHours: string };

export function AdminSettingsForm({ initial }: { initial: Settings }) {
  const [values, setValues] = useState(initial);
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState('');
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState('saving');
    setError('');
    try {
      const response = await fetch('/api/admin/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to save contact settings');
      setState('saved');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save contact settings');
      setState('error');
    }
  }
  return <form className="form panel" onSubmit={save}>
    <label>Public display name<input required minLength={2} maxLength={100} value={values.displayName} onChange={event => setValues({ ...values, displayName: event.target.value })}/></label>
    <label>Support email<input required type="email" value={values.supportEmail} onChange={event => setValues({ ...values, supportEmail: event.target.value })}/></label>
    <label>WhatsApp number in international format<input required type="tel" pattern="\+?[1-9][0-9]{7,14}" value={values.whatsAppNumber} onChange={event => setValues({ ...values, whatsAppNumber: event.target.value })}/></label>
    <label>Support hours<input maxLength={100} value={values.supportHours} onChange={event => setValues({ ...values, supportHours: event.target.value })}/></label>
    <button className="button" disabled={state === 'saving'}>{state === 'saving' ? 'Saving…' : 'Save contact settings'}</button>
    {state === 'saved' && <p role="status">Contact settings saved.</p>}
    {state === 'error' && <p role="alert">{error}</p>}
  </form>;
}
