'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function AdminFxDecisionButton({ id, approved }: { id: string; approved: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function decide() {
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/admin/fx-rates/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ approved: !approved }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'FX decision failed');
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'FX decision failed'); }
    finally { setBusy(false); }
  }
  return <><button type="button" className="button button-secondary" disabled={busy} onClick={decide}>{approved ? 'Revoke' : 'Approve'}</button>{error && <span role="alert">{error}</span>}</>;
}
