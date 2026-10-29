import { NextRequest, NextResponse } from 'next/server';
import { connectDb } from '@/lib/db';
import { Country, EmailToken, User } from '@/lib/models';
import { hashPassword, newToken, tokenHash } from '@/lib/auth';
import { registerSchema } from '@/lib/validation';
import { sendEmail } from '@/lib/mail';
import { consumeRateLimit } from '@/lib/rate-limit';
import { authEmail } from '@/lib/email-templates';

export async function POST(req: NextRequest) {
  const parsed = registerSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid registration details' }, { status: 400 });
  if (!process.env.SMTP_HOST || !process.env.SMTP_PORT || !process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.EMAIL_FROM || !process.env.APP_BASE_URL) {
    return NextResponse.json({ error: 'Email service is not configured' }, { status: 503 });
  }

  try {
    const data = parsed.data;
    await connectDb();
    if (!await consumeRateLimit('register', data.email, 3, 60 * 60_000)) return NextResponse.json({ error: 'Too many attempts' }, { status: 429 });
    if (!await Country.exists({ code: data.countryCode, enabled: true })) return NextResponse.json({ error: 'Invalid country' }, { status: 400 });
    if (await User.exists({ email: data.email.toLowerCase() })) return NextResponse.json({ error: 'Email already registered' }, { status: 409 });

    const user = await User.create({ fullName: data.fullName, email: data.email.toLowerCase(), phone: data.phone, countryCode: data.countryCode, passwordHash: await hashPassword(data.password), preferredLocale: data.locale, termsAcceptedAt: new Date() });
    const token = newToken();
    await EmailToken.create({ userId: user._id, tokenHash: tokenHash(token), purpose: 'verify', expiresAt: new Date(Date.now() + 24 * 3600000) });
    const email = authEmail('verify', data.locale, `${process.env.APP_BASE_URL}/api/auth/verify?token=${token}`);
    try {
      await sendEmail(user.email, email.subject, email.body);
    } catch {
      // The account exists. A later resend can deliver a fresh verification token.
      return NextResponse.json({ error: 'Verification email could not be sent. Request a new verification link.' }, { status: 503 });
    }
    return NextResponse.json({ message: 'Registration received. Check your email to verify your account.' }, { status: 201 });
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Registration is temporarily unavailable' }, { status: 503 });
  }
}
