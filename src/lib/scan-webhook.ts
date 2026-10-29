import { createHmac, timingSafeEqual } from 'node:crypto';

export function verifyScanWebhook(body: string, timestamp: string, signature: string, secret: string, now = Date.now()): boolean {
  const seconds = Number(timestamp);
  if (!secret || secret.length < 32 || !Number.isSafeInteger(seconds) || Math.abs(now - seconds * 1000) > 5 * 60_000) return false;
  if (!/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest();
  return timingSafeEqual(expected, Buffer.from(signature, 'hex'));
}
