'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function NotificationReadButton({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function markRead() {
    setBusy(true);
    try {
      const response = await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, read: true }) });
      if (!response.ok) throw new Error();
      router.refresh();
    } catch { setBusy(false); }
  }
  return <button type="button" className="button button-secondary" disabled={busy} onClick={markRead}>Mark as read</button>;
}
