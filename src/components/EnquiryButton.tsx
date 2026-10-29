'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function EnquiryButton({ propertyId, locale, label, returnPath }: { propertyId: string; locale: string; label: string; returnPath?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function start() {
    setPending(true); setError('');
    try {
      const response = await fetch('/api/enquiries', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ propertyId }) });
      if (response.status === 401) { router.push(`/${locale}/login?next=${encodeURIComponent(returnPath || `/${locale}/properties`)}`); return; }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to start enquiry');
      router.push(`/${locale}/dashboard?conversation=${data.conversationId}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to start enquiry'); setPending(false); }
  }
  return <div><button type="button" className="button" onClick={start} disabled={pending}>{pending ? 'Opening…' : label}</button>{error && <p role="alert" className="notice">{error}</p>}</div>;
}
