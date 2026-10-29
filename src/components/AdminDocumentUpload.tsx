'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { privateDocumentKinds } from '@/lib/document-files';

export function AdminDocumentUpload() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();
  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/admin/documents', { method: 'POST', body: new FormData(event.currentTarget) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Upload failed');
      setMessage('Document stored privately and pending a malware scan.'); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Upload failed'); }
    finally { setBusy(false); }
  }
  return <form className="form panel" onSubmit={upload}><h2>Upload a private document</h2><label>Title<input name="title" minLength={3} maxLength={200} required/></label><label>Category<select name="kind">{privateDocumentKinds.map(kind => <option key={kind} value={kind}>{kind}</option>)}</select></label><label>Owner user ID<input name="ownerId" placeholder="Required for user access"/></label><label>Property ID<input name="propertyId" placeholder="Optional reference"/></label><label>PDF, JPEG or PNG (up to 10 MiB)<input name="file" type="file" accept="application/pdf,image/jpeg,image/png" required/></label><button className="button" disabled={busy}>Upload privately</button>{message && <p role="status" className="notice">{message}</p>}</form>;
}
