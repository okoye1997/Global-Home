import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { IdentityVerification } from '@/lib/models';

export async function GET() {
  const user = await currentUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const items = await IdentityVerification.find({ status: { $in: ['submitted', 'under_review'] } }).select('userId status documentIds createdAt').sort({ createdAt: 1 }).limit(100).populate('userId', 'fullName email').lean();
  return NextResponse.json({ items }, { headers: { 'Cache-Control': 'no-store' } });
}
