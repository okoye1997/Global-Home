import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const state = vi.hoisted(() => ({
  user: null as null | Record<string, unknown>, passwordValid: true, totpValid: true,
  challenge: 'signed-challenge', challengeValid: true,
}));
vi.mock('@/lib/db', () => ({ connectDb: vi.fn() }));
vi.mock('@/lib/models', () => ({ User: {
  findOne: () => ({ select: async () => state.user }),
  findById: () => ({ select: async () => state.user }),
} }));
vi.mock('@/lib/auth', () => ({
  authCookie: 'gh_session', adminMfaChallengeCookie: 'gh_admin_mfa_challenge',
  checkPassword: async () => state.passwordValid,
  issueSession: async () => 'signed-session',
  issueAdminMfaChallenge: async () => 'signed-challenge',
  verifyAdminMfaChallenge: async () => {
    if (!state.challengeValid) throw new Error('expired');
    return { userId: 'test-user', sessionVersion: 1 };
  },
}));
vi.mock('@/lib/mfa', () => ({ decryptMfaSecret: () => 'test-secret', verifyTotp: () => state.totpValid }));
vi.mock('@/lib/rate-limit', () => ({ consumeRateLimit: async () => true }));
vi.mock('@/lib/locale-registry', () => ({ enabledLocales: async () => [{ code: 'en' }] }));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => state.challenge ? { value: state.challenge } : undefined }) }));

import { POST as passwordStep } from '@/app/api/auth/login/route';
import { POST as mfaStep } from '@/app/api/auth/login/mfa/route';

function request(path: string, data: object) {
  return new NextRequest(`http://localhost${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
}
function testUser(role: 'user' | 'admin' = 'user') {
  return { id: 'test-user', fullName: 'Test Account', role, passwordHash: 'bcrypt-hash', emailVerifiedAt: new Date(), sessionVersion: 1, preferredLocale: 'en', mfaEnabledAt: role === 'admin' ? new Date() : undefined, mfaSecretEncrypted: role === 'admin' ? 'encrypted' : undefined };
}

describe('customer login and administrator second-step MFA', () => {
  beforeEach(() => { state.user = testUser(); state.passwordValid = true; state.totpValid = true; state.challenge = 'signed-challenge'; state.challengeValid = true; });
  it('signs a previously verified customer in with email and password only, including repeat login', async () => {
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await passwordStep(request('/api/auth/login', { email: 'customer@example.com', password: 'correct-password' }));
      expect(response.status).toBe(200);
      expect((await response.json()).user.role).toBe('user');
      expect(response.cookies.get('gh_session')?.value).toBe('signed-session');
      expect(response.cookies.get('gh_admin_mfa_challenge')).toBeUndefined();
    }
  });
  it('rejects invalid password and initial unverified account', async () => {
    state.passwordValid = false;
    expect((await passwordStep(request('/api/auth/login', { email: 'customer@example.com', password: 'wrong' }))).status).toBe(401);
    state.passwordValid = true;
    state.user = { ...testUser(), emailVerifiedAt: undefined };
    expect((await passwordStep(request('/api/auth/login', { email: 'customer@example.com', password: 'correct-password' }))).status).toBe(403);
  });
  it('gives an enrolled administrator a challenge without a login session', async () => {
    state.user = testUser('admin');
    const response = await passwordStep(request('/api/auth/login', { email: 'admin@example.com', password: 'correct-password' }));
    expect((await response.json()).mfaRequired).toBe(true);
    expect(response.cookies.get('gh_session')).toBeUndefined();
    expect(response.cookies.get('gh_admin_mfa_challenge')).toBeDefined();
  });
  it('rejects an administrator missing MFA enrollment', async () => {
    state.user = { ...testUser('admin'), mfaEnabledAt: undefined };
    expect((await passwordStep(request('/api/auth/login', { email: 'admin@example.com', password: 'correct-password' }))).status).toBe(403);
  });
  it('requires a valid challenge, administrator role, and correct authenticator code', async () => {
    state.user = testUser('admin');
    state.challenge = '';
    expect((await mfaStep(request('/api/auth/login/mfa', { mfaCode: '123456' }))).status).toBe(401);
    state.challenge = 'signed-challenge';
    state.totpValid = false;
    expect((await mfaStep(request('/api/auth/login/mfa', { mfaCode: '123456' }))).status).toBe(401);
    state.totpValid = true;
    state.user = testUser('user');
    expect((await mfaStep(request('/api/auth/login/mfa', { mfaCode: '123456' }))).status).toBe(401);
    state.user = testUser('admin');
    const response = await mfaStep(request('/api/auth/login/mfa', { mfaCode: '123456' }));
    expect(response.status).toBe(200);
    expect(response.cookies.get('gh_session')?.value).toBe('signed-session');
    expect(response.cookies.get('gh_admin_mfa_challenge')?.value).toBe('');
  });
});
