'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function ClearRecentViews() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  async function clear() {
    setBusy(true); setError('');
    try { const response = await fetch('/api/recent-views', { method: 'DELETE' }); if (!response.ok) throw new Error(); router.refresh(); }
    catch { setError('Unable to clear recent history. Please try again.'); }
    finally { setBusy(false); }
  }
  return <div><button className="button button-secondary" type="button" disabled={busy} onClick={clear}>Clear recently viewed</button>{error && <p role="alert" className="notice">{error}</p>}</div>;
}
