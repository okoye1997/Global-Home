'use client';

import { useState } from 'react';

export function AdminPropertyImportForm({ countries }: { countries: { code: string; name: string }[] }) {
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>, commit: boolean) {
    event.preventDefault();
    setBusy(true); setResult(null);
    try {
      const data = new FormData(event.currentTarget);
      data.set('authorizedSourceConfirmed', data.has('authorizedSourceConfirmed') ? 'true' : 'false');
      data.set('commit', String(commit));
      const response = await fetch('/api/admin/property-imports', { method: 'POST', body: data });
      const value = await response.json();
      setResult(response.ok ? value : { error: value.error || 'Import failed' });
    } catch { setResult({ error: 'Import failed' }); }
    finally { setBusy(false); }
  }
  return <form className="form panel" onSubmit={event => submit(event, false)}>
    <h2>Authorized bulk import</h2><p>Upload up to 5,000 authorized records per file. All accepted records enter draft review; none publish automatically. Upload rights-cleared images separately before verification and publication.</p>
    <p>Download an empty template: <a href="/templates/property-import/properties.csv" download>CSV</a> · <a href="/templates/property-import/properties.xlsx" download>XLSX</a> · <a href="/templates/property-import/properties.json" download>JSON</a></p>
    <label>Country<select name="countryCode" required>{countries.map(country => <option value={country.code} key={country.code}>{country.name} ({country.code})</option>)}</select></label>
    <label>Authorized source/provider<input name="sourceProvider" minLength={3} maxLength={120} required placeholder="Agency or inventory source"/></label>
    <label>CSV, XLSX or JSON file<input name="file" type="file" accept=".csv,.xlsx,.json" required/></label>
    <label><input name="authorizedSourceConfirmed" type="checkbox" required/> I confirm authorization to use and verify this inventory.</label>
    <div className="filters"><button className="button button-secondary" disabled={busy}>Preview validation</button><button className="button" type="button" disabled={busy} onClick={event => { const form=event.currentTarget.form; if (form?.reportValidity()) void submit({ preventDefault() {}, currentTarget: form } as React.FormEvent<HTMLFormElement>, true); }}>Import as drafts</button></div>
    {result && <div role="status"><pre className="import-result">{JSON.stringify(result, null, 2)}</pre></div>}
  </form>;
}
