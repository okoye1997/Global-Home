'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function InvestorProfileForm({ suitability, eligibilityInformation }: { suitability?: string; eligibilityInformation?: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/investor-profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ suitability: form.get('suitability'), eligibilityInformation: form.get('eligibilityInformation'), riskAcknowledged: form.get('riskAcknowledged') === 'on' }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to save investor profile');
      setMessage('Investor profile saved.'); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save investor profile'); }
    finally { setBusy(false); }
  }
  return <form className="form panel" onSubmit={submit}><h2>Investor profile</h2><label>Suitability and investment experience<textarea name="suitability" minLength={10} maxLength={1000} defaultValue={suitability} required/></label><label>Eligibility information<textarea name="eligibilityInformation" minLength={10} maxLength={1000} defaultValue={eligibilityInformation} required/></label><label><input type="checkbox" name="riskAcknowledged" required/> I acknowledge the investment risks and understand that a projection is not a payment or guarantee.</label><button className="button" disabled={busy}>Save investor profile</button>{message && <p role="status" className="notice">{message}</p>}</form>;
}
