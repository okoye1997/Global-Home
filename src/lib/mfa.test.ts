import { describe, expect, it } from 'vitest';
import { createMfaSecret, decryptMfaSecret, encryptMfaSecret, totp, verifyTotp } from './mfa';
describe('admin MFA', () => {
  it('creates a secret and validates its time-based code', () => { const secret = createMfaSecret(); const at = Date.UTC(2026, 9, 26, 10, 0); const code = totp(secret, at); expect(secret).toMatch(/^[A-Z2-7]{32}$/); expect(verifyTotp(secret, code, at)).toBe(true); expect(verifyTotp(secret, 'not-a-code', at)).toBe(false); });
  it('encrypts the secret at rest', () => { process.env.ADMIN_MFA_ENCRYPTION_KEY = 'unit-test-secret-with-over-thirty-two-characters'; const secret = createMfaSecret(); const encrypted = encryptMfaSecret(secret); expect(encrypted).not.toContain(secret); expect(decryptMfaSecret(encrypted)).toBe(secret); });
});
