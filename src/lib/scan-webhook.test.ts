import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifyScanWebhook } from './scan-webhook';

describe('identity scan webhook authentication', () => {
  const secret = 'a-long-secret-for-the-private-scanner-webhook';
  const body = JSON.stringify({ documentId: '507f1f77bcf86cd799439011', status: 'clean' });
  const timestamp = '1760000000';
  const signature = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
  it('accepts a fresh authentic body', () => expect(verifyScanWebhook(body, timestamp, signature, secret, Number(timestamp) * 1000)).toBe(true));
  it('rejects tampering and replay', () => {
    expect(verifyScanWebhook(`${body} `, timestamp, signature, secret, Number(timestamp) * 1000)).toBe(false);
    expect(verifyScanWebhook(body, timestamp, signature, secret, (Number(timestamp) + 301) * 1000)).toBe(false);
  });
});
