import { NextRequest, NextResponse } from 'next/server';
import { connectDb } from '@/lib/db';
import { User } from '@/lib/models';
import { authCookie, adminMfaChallengeCookie, checkPassword, issueAdminMfaChallenge, issueSession } from '@/lib/auth';
import { loginSchema } from '@/lib/validation';
import { consumeRateLimit } from '@/lib/rate-limit';
import { enabledLocales } from '@/lib/locale-registry';

export async function POST(req: NextRequest) {
  const parsed = loginSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  const { email, password } = parsed.data;
  await connectDb();
  if (!await consumeRateLimit('login', email, 10, 15 * 60_000)) return NextResponse.json({ error: 'Too many attempts' }, { status: 429 });
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash +mfaSecretEncrypted');
  if (!user || !await checkPassword(password, user.passwordHash)) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  if (!user.emailVerifiedAt) return NextResponse.json({ error: 'Email verification required' }, { status: 403 });
  if (user.role === 'admin') {
    if (!user.mfaEnabledAt || !user.mfaSecretEncrypted) return NextResponse.json({ error: 'Admin MFA enrollment required' }, { status: 403 });
    const challenge = NextResponse.json({ mfaRequired: true });
    challenge.cookies.set(adminMfaChallengeCookie, await issueAdminMfaChallenge(user.id, user.sessionVersion || 0), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/api/auth', maxAge: 300 });
    return challenge;
  }
  const enabled = await enabledLocales();
  const preferredLocale = enabled.some(item => item.code === user.preferredLocale) ? user.preferredLocale : 'en';
  const response = NextResponse.json({ user: { id: user.id, fullName: user.fullName, role: user.role }, preferredLocale });
  response.cookies.set(authCookie, await issueSession(user.id, user.role, user.sessionVersion || 0, user.role === 'admin'), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 7 * 24 * 3600 });
  response.cookies.set('gh_locale', preferredLocale, { sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 365 });
  return response;
}
