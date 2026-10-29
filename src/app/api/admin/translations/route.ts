import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { currentUser } from '@/lib/auth';
import { AuditEvent, LocaleConfig, Translation } from '@/lib/models';
import { sourceMessages } from '@/lib/messages';

export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const localeCode = req.nextUrl.searchParams.get('localeCode');
  if (!localeCode) return NextResponse.json({ error: 'Locale required' }, { status: 400 });
  return NextResponse.json({ items: await Translation.find({ localeCode }).sort({ namespace: 1, key: 1 }).lean() });
}

export async function PUT(req: NextRequest) {
  const user = await currentUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const parsed = z.object({ localeCode: z.string().min(2), namespace: z.string().min(1), key: z.string().min(1), value: z.string().min(1).max(10000), status: z.enum(['draft', 'approved']) }).safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid translation' }, { status: 400 });
  const { localeCode, namespace, key, value, status } = parsed.data;
  if (!(namespace in sourceMessages) || !(key in sourceMessages[namespace as keyof typeof sourceMessages])) return NextResponse.json({ error: 'Unknown key' }, { status: 400 });
  if (!await LocaleConfig.exists({ localeCode })) return NextResponse.json({ error: 'Unknown locale' }, { status: 400 });
  await Translation.updateOne({ localeCode, namespace, key }, { $set: { value, status, reviewedBy: status === 'approved' ? user._id : null }, $inc: { version: 1 } }, { upsert: true });
  await LocaleConfig.updateOne({ localeCode }, { $inc: { translationVersion: 1 } });
  await AuditEvent.create({ actorId: user._id, action: 'translation.update', targetType: 'Translation', metadata: { localeCode, namespace, key, status } });
  return NextResponse.json({ ok: true });
}
