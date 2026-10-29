'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { msg } from '@/lib/messages';

export function SavePropertyButton({ propertyId, initiallySaved, locale }: { propertyId: string; initiallySaved: boolean; locale: string }) {
  const [saved, setSaved] = useState(initiallySaved);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function toggle() {
    setBusy(true);
    try {
      const response = await fetch('/api/favourites', { method: saved ? 'DELETE' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ propertyId }) });
      if (response.status === 401) { router.push(`/${locale}/login`); return; }
      if (!response.ok) throw new Error('Unable to update saved properties');
      setSaved(!saved);
    } catch { window.alert(msg(locale, 'marketplace', 'saveError')); }
    finally { setBusy(false); }
  }
  return <button className="button button-secondary" type="button" aria-pressed={saved} disabled={busy} onClick={toggle}>{saved ? msg(locale, 'marketplace', 'saved') : msg(locale, 'marketplace', 'save')}</button>;
}
