import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { currentUser } from '@/lib/auth';
import { AuditEvent, LocaleConfig } from '@/lib/models';

export async function GET() {
  const user = await currentUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json({ items: await LocaleConfig.find().sort({ localeCode: 1 }).lean() });
}

export async function PUT(req: NextRequest) {
  const user = await currentUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const parsed = z.object({ localeCode: z.string().regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/), languageName: z.string().min(2), nativeName: z.string().min(2), direction: z.enum(['ltr', 'rtl']), enabled: z.boolean(), fallbackLocale: z.string().default('en') }).safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid locale' }, { status: 400 });
  if (parsed.data.localeCode === 'en' && !parsed.data.enabled) return NextResponse.json({ error: 'English fallback must remain enabled' }, { status: 400 });
  await LocaleConfig.updateOne({ localeCode: parsed.data.localeCode }, { $set: parsed.data, $inc: { translationVersion: 1 } }, { upsert: true });
  await AuditEvent.create({ actorId: user._id, action: 'locale.update', targetType: 'LocaleConfig', metadata: { localeCode: parsed.data.localeCode, enabled: parsed.data.enabled } });
  return NextResponse.json({ ok: true });
}
