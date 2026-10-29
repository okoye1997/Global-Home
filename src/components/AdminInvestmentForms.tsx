'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Option = { id: string; label: string };
function toIso(value: FormDataEntryValue | null) { const date = new Date(String(value || '')); return Number.isFinite(date.getTime()) ? date.toISOString() : ''; }
export function AdminInvestmentForms({ properties, offerings, investors, positions }: { properties: Option[]; offerings: Option[]; investors: Option[]; positions: (Option & { status: string; currencyCode: string })[] }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();
  async function send(event: React.FormEvent<HTMLFormElement>, endpoint: string, method: 'POST' | 'PATCH', body: Record<string, unknown>) {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const response = await fetch(endpoint, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Update failed');
      setMessage('Record saved.'); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Update failed'); }
    finally { setBusy(false); }
  }
  return <div className="dashboard-records">
    <form className="panel form" onSubmit={event => { const data = new FormData(event.currentTarget); void send(event, '/api/admin/investments/offerings', 'POST', { propertyId: data.get('propertyId'), termsVersion: data.get('termsVersion'), termsReference: data.get('termsReference'), assumptions: data.get('assumptions'), riskDisclosure: data.get('riskDisclosure') }); }}><h2>Approve an offering</h2><label>Published investment property<select name="propertyId" required>{properties.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><label>Terms version<input name="termsVersion" required/></label><label>Signed terms reference<input name="termsReference" minLength={8} required/></label><label>Projection assumptions<textarea name="assumptions" minLength={20} required/></label><label>Risk disclosure<textarea name="riskDisclosure" minLength={20} required/></label><button className="button" disabled={busy || !properties.length}>Approve 30% offering terms</button></form>
    <form className="panel form" onSubmit={event => { const data = new FormData(event.currentTarget); void send(event, '/api/admin/investments/positions', 'POST', { userId: data.get('userId'), offeringId: data.get('offeringId'), amountMinor: Number(data.get('amountMinor')), signedTermsReference: data.get('signedTermsReference') }); }}><h2>Record a pending position</h2><p>Only verified investors with a risk acknowledgement are eligible. Record the actual local-currency amount in minor units.</p><label>Investor<select name="userId" required>{investors.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><label>Approved offering<select name="offeringId" required>{offerings.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><label>Local amount in minor units<input name="amountMinor" type="number" min="1" step="1" required/></label><label>Signed terms evidence reference<input name="signedTermsReference" minLength={8} required/></label><button className="button" disabled={busy || !investors.length || !offerings.length}>Record pending position</button></form>
    {positions.filter(item => item.status === 'pending').map(position => <form className="panel form" key={position.id} onSubmit={event => { const data = new FormData(event.currentTarget); void send(event, `/api/admin/investments/positions/${position.id}`, 'PATCH', { action: 'activate', settlementReference: data.get('settlementReference') }); }}><h2>Activate {position.label}</h2><label>Confirmed settlement reference<input name="settlementReference" minLength={8} required/></label><button className="button" disabled={busy}>Confirm funded position</button></form>)}
    {positions.filter(item => item.status === 'active').map(position => <form className="panel form" key={position.id} onSubmit={event => { const data = new FormData(event.currentTarget); void send(event, '/api/admin/investments/distributions', 'POST', { positionId: position.id, amountMinor: Number(data.get('amountMinor')), period: data.get('period'), paymentReference: data.get('paymentReference'), paidAt: toIso(data.get('paidAt')) }); }}><h2>Record paid distribution for {position.label}</h2><p>Enter only a payment that has actually occurred in {position.currencyCode}. A projected amount is not a distribution.</p><label>Paid amount in minor units<input name="amountMinor" type="number" min="1" step="1" required/></label><label>Period<input name="period" type="month" required/></label><label>Payment reference<input name="paymentReference" minLength={8} required/></label><label>Paid date and time<input name="paidAt" type="datetime-local" required/></label><button className="button" disabled={busy}>Record paid distribution</button></form>)}
    {message && <p className="notice" role="status">{message}</p>}
  </div>;
}
