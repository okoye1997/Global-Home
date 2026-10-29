'use client';

import { useState } from 'react';

export function IdentitySubmission({ initialStatus }: { initialStatus: string }) {
  const [status, setStatus] = useState(initialStatus);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/identity', { method: 'POST', body: new FormData(event.currentTarget) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Submission failed');
      setStatus(result.status);
      setMessage('Your document was submitted for review.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Submission failed'); }
    finally { setBusy(false); }
  }
  return <div className="panel"><p>Current status: <strong>{status.replaceAll('_', ' ')}</strong></p>{['not_started', 'rejected', 'resubmission_required'].includes(status) && <form className="form" onSubmit={submit}><label>Identity document type<select name="kind" required><option value="passport">Passport</option><option value="national_id">National ID</option><option value="drivers_licence">Driver&apos;s licence</option></select></label><label>Identity document (PDF, JPEG or PNG; up to 8 MiB)<input name="file" type="file" accept="application/pdf,image/jpeg,image/png" required/></label><button className="button" disabled={busy}>{busy ? 'Submitting…' : 'Submit for review'}</button></form>}{message && <p role="status">{message}</p>}</div>;
}
