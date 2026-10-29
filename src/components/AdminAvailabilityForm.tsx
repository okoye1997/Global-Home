'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function AdminAvailabilityForm({ id, initial }: { id: string; initial: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const response = await fetch(`/api/properties/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ availabilityStatus: value }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Availability update failed');
      setMessage('Availability updated.'); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Availability update failed'); }
    finally { setBusy(false); }
  }
  return <form className="form panel" onSubmit={save}><h2>Customer-facing availability</h2><label>Availability<select value={value} onChange={event => setValue(event.target.value)}>{['available','reserved','unavailable','sold','rented','leased'].map(status => <option key={status} value={status}>{status.replace('_', ' ')}</option>)}</select></label><button className="button" disabled={busy}>Update availability</button>{message && <p role="status">{message}</p>}</form>;
}
