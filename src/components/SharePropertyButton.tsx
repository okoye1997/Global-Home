'use client';

import { useState } from 'react';

export function SharePropertyButton({ title, label, copiedLabel, errorLabel }: { title: string; label: string; copiedLabel: string; errorLabel: string }) {
  const [message, setMessage] = useState('');
  async function share() {
    setMessage('');
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title, url });
      else { await navigator.clipboard.writeText(url); setMessage(copiedLabel); }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setMessage(errorLabel);
    }
  }
  return <div><button type="button" className="button button-secondary" onClick={share}>{label}</button>{message && <span role="status">{message}</span>}</div>;
}
