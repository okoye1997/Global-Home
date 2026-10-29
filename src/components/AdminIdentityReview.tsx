'use client';

import { useState } from 'react';

export function AdminIdentityReview({ id }: { id: string }) {
  const [status, setStatus] = useState('');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');
  async function decide(next: string) {
    const response = await fetch(`/api/admin/identity/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: next, note }) });
    const result = await response.json();
    setMessage(response.ok ? `Decision recorded: ${result.status}` : result.error || 'Review failed');
    if (response.ok) setStatus(result.status);
  }
  return <div><label>Review note<textarea value={note} onChange={event => setNote(event.target.value)} maxLength={1000}/></label><div className="filters"><button onClick={() => decide('under_review')} disabled={!!status}>Mark under review</button><button onClick={() => decide('approved')} disabled={!!status}>Approve</button><button onClick={() => decide('resubmission_required')} disabled={!!status}>Request resubmission</button><button onClick={() => decide('rejected')} disabled={!!status}>Reject</button></div>{message && <p role="status">{message}</p>}</div>;
}
