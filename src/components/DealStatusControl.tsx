'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { minorFactor } from '@/lib/currency';
import { canChangeDealStatus, dealStatuses, type DealStatus } from '@/lib/deal-status';

export function DealStatusControl({ id, status, role, currencyCode }: { id: string; status: DealStatus; role: 'admin' | 'user'; currencyCode: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const choices = dealStatuses.filter(next => canChangeDealStatus(status, next, role));
  if (!choices.length) return null;
  async function update(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage('');
    const form = new FormData(event.currentTarget);
    const next = role === 'user' ? 'cancelled' : String(form.get('status'));
    const major = String(form.get('agreedAmount') || '').trim();
    const amount = major ? Math.round(Number(major) * minorFactor(currencyCode)) : undefined;
    try {
      const response = await fetch(`/api/enquiries/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: next, note: role === 'admin' ? String(form.get('note') || '') : undefined, agreedAmountMinor: role === 'admin' ? amount : undefined }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to update deal');
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to update deal'); }
    finally { setBusy(false); }
  }
  return <form className="form" onSubmit={update}>
    {role === 'admin' ? <><label>Deal status<select name="status" defaultValue={choices[0]}>{choices.map(next => <option key={next} value={next}>{next.replaceAll('_', ' ')}</option>)}</select></label><label>Agreed amount ({currencyCode}, if applicable)<input name="agreedAmount" type="number" min="0" step="any"/></label><label>Update note<textarea name="note" maxLength={1000}/></label><button className="button" disabled={busy}>Update deal</button></> : <button className="button button-secondary" disabled={busy}>Cancel enquiry</button>}
    {message && <p className="notice" role="status">{message}</p>}
  </form>;
}
