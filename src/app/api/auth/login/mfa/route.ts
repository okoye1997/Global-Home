import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { User } from '@/lib/models';
import { connectDb } from '@/lib/db';
import { adminMfaChallengeCookie, authCookie, issueSession, verifyAdminMfaChallenge } from '@/lib/auth';
import { adminMfaSchema } from '@/lib/validation';
import { decryptMfaSecret, verifyTotp } from '@/lib/mfa';
import { consumeRateLimit } from '@/lib/rate-limit';
import { enabledLocales } from '@/lib/locale-registry';

export async function POST(req: NextRequest) {
  const parsed = adminMfaSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid authenticator code' }, { status: 400 });
  const token = (await cookies()).get(adminMfaChallengeCookie)?.value;
  if (!token) return NextResponse.json({ error: 'MFA challenge expired' }, { status: 401 });
  let challenge: Awaited<ReturnType<typeof verifyAdminMfaChallenge>>;
  try { challenge = await verifyAdminMfaChallenge(token); }
  catch { return NextResponse.json({ error: 'MFA challenge expired' }, { status: 401 }); }
  await connectDb();
  if (!await consumeRateLimit('admin-mfa', challenge.userId, 5, 15 * 60_000)) return NextResponse.json({ error: 'Too many attempts' }, { status: 429 });
  const user = await User.findById(challenge.userId).select('+mfaSecretEncrypted');
  if (!user || user.role !== 'admin' || !user.emailVerifiedAt || !user.mfaEnabledAt || !user.mfaSecretEncrypted || (user.sessionVersion || 0) !== challenge.sessionVersion) return NextResponse.json({ error: 'MFA challenge expired' }, { status: 401 });
  let valid = false;
  try { valid = verifyTotp(decryptMfaSecret(user.mfaSecretEncrypted), parsed.data.mfaCode); } catch { /* Fail closed. */ }
  if (!valid) return NextResponse.json({ error: 'Invalid authenticator code' }, { status: 401 });
  const enabled = await enabledLocales();
  const preferredLocale = enabled.some(item => item.code === user.preferredLocale) ? user.preferredLocale : 'en';
  const response = NextResponse.json({ user: { id: user.id, fullName: user.fullName, role: user.role }, preferredLocale });
  response.cookies.set(adminMfaChallengeCookie, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/api/auth', maxAge: 0 });
  response.cookies.set(authCookie, await issueSession(user.id, user.role, user.sessionVersion || 0, true), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 7 * 24 * 3600 });
  response.cookies.set('gh_locale', preferredLocale, { sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 365 });
  return response;
}
