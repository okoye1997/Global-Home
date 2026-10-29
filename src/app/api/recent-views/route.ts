import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { RecentView } from '@/lib/models';

export async function DELETE() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await RecentView.deleteMany({ userId: user._id });
  return NextResponse.json({ ok: true });
}
