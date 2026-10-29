import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db', () => ({ connectDb: vi.fn() }));
vi.mock('@/lib/models', () => ({ Country: { exists: vi.fn() }, User: { exists: vi.fn(), create: vi.fn() }, EmailToken: { create: vi.fn() } }));
vi.mock('@/lib/auth', () => ({ hashPassword: vi.fn().mockResolvedValue('hash'), newToken: () => 'token', tokenHash: () => 'hashed' }));
vi.mock('@/lib/mail', () => ({ sendEmail: vi.fn() }));
vi.mock('@/lib/rate-limit', () => ({ consumeRateLimit: vi.fn().mockResolvedValue(true) }));

import { connectDb } from '@/lib/db';
import { Country, EmailToken, User } from '@/lib/models';
import { sendEmail } from '@/lib/mail';
import { consumeRateLimit } from '@/lib/rate-limit';
import { POST } from './route';

const body = { fullName: 'Test User', email: 'test@example.com', phone: '+14155552671', countryCode: 'US', password: 'safe-password-123', confirmPassword: 'safe-password-123', termsConsent: true, locale: 'en' };
const request = (value: string) => new NextRequest('http://localhost/api/auth/register', { method: 'POST', body: value, headers: { 'content-type': 'application/json' } });

describe('registration failure handling', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.SMTP_HOST = 'smtp.test'; process.env.SMTP_PORT = '587'; process.env.SMTP_USER = 'test'; process.env.SMTP_PASS = 'test'; process.env.EMAIL_FROM = 'noreply@example.com'; process.env.APP_BASE_URL = 'http://localhost';
    vi.mocked(Country.exists).mockResolvedValue({ _id: 'country' } as never);
    vi.mocked(consumeRateLimit).mockResolvedValue(true);
    vi.mocked(User.exists).mockResolvedValue(null);
    vi.mocked(User.create).mockResolvedValue({ _id: 'user', email: body.email } as never);
    vi.mocked(EmailToken.create).mockResolvedValue({} as never);
  });

  it('rejects malformed JSON without exposing parser details', async () => {
    const response = await POST(request('{'));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Invalid registration details' });
  });

  it('does not disclose database errors', async () => {
    vi.mocked(connectDb).mockRejectedValueOnce(new Error('private database connection string'));
    const response = await POST(request(JSON.stringify(body)));
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain('private database');
  });

  it('explains the recovery action when delivery fails after account creation', async () => {
    vi.mocked(sendEmail).mockRejectedValueOnce(new Error('private SMTP credentials'));
    const response = await POST(request(JSON.stringify(body)));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'Verification email could not be sent. Request a new verification link.' });
    expect(User.create).toHaveBeenCalledOnce();
  });
});
