import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isValidPhoneNumber } from 'libphonenumber-js';
import { currentUser } from '@/lib/auth';
import { AuditEvent, Country, User } from '@/lib/models';

const schema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().regex(/^\+[1-9]\d{7,14}$/).refine(isValidPhoneNumber),
  countryCode: z.string().regex(/^[A-Z]{2}$/),
}).strict();

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ fullName: user.fullName, email: user.email, phone: user.phone, countryCode: user.countryCode, preferredLocale: user.preferredLocale, emailVerified: Boolean(user.emailVerifiedAt) }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PATCH(request: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid profile fields' }, { status: 400 });
  if (!await Country.exists({ code: parsed.data.countryCode, enabled: true })) return NextResponse.json({ error: 'Country unavailable' }, { status: 400 });
  await User.updateOne({ _id: user._id }, { $set: parsed.data });
  await AuditEvent.create({ actorId: user._id, action: 'account.profile.update', targetType: 'User', targetId: user._id, metadata: { fields: Object.keys(parsed.data) } });
  return NextResponse.json({ ok: true });
}
