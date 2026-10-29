import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { z } from 'zod';
import { currentUser } from '@/lib/auth';
import { Notification } from '@/lib/models';

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const items = await Notification.find({ userId: user._id }).select('key payload readAt createdAt').sort({ createdAt: -1 }).limit(100).lean();
  return NextResponse.json({ items });
}

export async function PATCH(request: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => null);
  const parsed = z.object({ id: z.string().refine(mongoose.isValidObjectId), read: z.boolean() }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid notification' }, { status: 400 });
  const result = await Notification.updateOne({ _id: parsed.data.id, userId: user._id }, { $set: { readAt: parsed.data.read ? new Date() : null } });
  if (!result.matchedCount) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
