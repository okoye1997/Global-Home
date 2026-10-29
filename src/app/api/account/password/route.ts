import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { authCookie, checkPassword, currentUser, hashPassword } from '@/lib/auth';
import { AuditEvent, Notification, User } from '@/lib/models';
import { consumeRateLimit } from '@/lib/rate-limit';
import { sendEmail } from '@/lib/mail';
import { accountEmail } from '@/lib/email-templates';

const schema = z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(12).max(128) }).strict();

export async function POST(request: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!await consumeRateLimit('change-password', String(user._id), 5, 60 * 60_000)) return NextResponse.json({ error: 'Too many attempts' }, { status: 429 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success || parsed.data.currentPassword === parsed.data.newPassword) return NextResponse.json({ error: 'Invalid password change' }, { status: 400 });
  const account = await User.findById(user._id).select('+passwordHash');
  if (!account || !await checkPassword(parsed.data.currentPassword, account.passwordHash)) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 403 });
  account.passwordHash = await hashPassword(parsed.data.newPassword);
  account.sessionVersion = (account.sessionVersion || 0) + 1;
  await account.save();
  (await cookies()).delete(authCookie);
  await Promise.all([
    AuditEvent.create({ actorId: user._id, action: 'account.password.change', targetType: 'User', targetId: user._id }),
    Notification.create({ userId: user._id, key: 'account.password.changed' }),
  ]);
  try { const email = accountEmail('passwordChanged', user.preferredLocale || 'en'); await sendEmail(user.email, email.subject, email.body); } catch { /* Account change remains valid; in-app notification is stored. */ }
  return NextResponse.json({ ok: true, signedOut: true });
}
