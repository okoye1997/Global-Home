'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function ConversationComposer({ id }: { id: string }) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function send(event: React.FormEvent) {
    event.preventDefault(); if (!body.trim()) return;
    setPending(true); setError('');
    try { const response = await fetch(`/api/conversations/${id}/messages`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ body }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Unable to send message'); setBody(''); router.refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to send message'); }
    finally { setPending(false); }
  }
  return <form onSubmit={send} className="form"><label>Message<textarea value={body} onChange={event => setBody(event.target.value)} maxLength={10000} rows={4}/></label><button className="button" disabled={pending}>{pending ? 'Sending…' : 'Send message'}</button>{error && <p role="alert" className="notice">{error}</p>}</form>;
}
