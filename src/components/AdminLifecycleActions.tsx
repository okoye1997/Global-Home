'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function AdminLifecycleActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function update(next: string) {
    setBusy(true);setMessage('');
    try { const response = await fetch(`/api/properties/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: next }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Update failed'); setMessage(`Property status: ${result.status}`); router.refresh(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Update failed'); }
    finally { setBusy(false); }
  }
  return <section className="panel"><h2>Other lifecycle actions</h2><div className="filters">{status==='published'&&<button className="button button-secondary" disabled={busy} onClick={()=>void update('verified')}>Unpublish</button>}{['draft','pending_verification','verified'].includes(status)&&<button className="button button-secondary" disabled={busy} onClick={()=>void update('rejected')}>Reject</button>}{status==='archived'&&<button className="button button-secondary" disabled={busy} onClick={()=>void update('draft')}>Restore as draft</button>}</div>{message&&<p role="status">{message}</p>}</section>;
}
