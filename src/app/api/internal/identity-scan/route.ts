import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuditEvent, Document } from '@/lib/models';
import { verifyScanWebhook } from '@/lib/scan-webhook';
import { privateDocumentKinds } from '@/lib/document-files';
import { identityKinds } from '@/lib/identity-files';

const eventSchema = z.object({ documentId: z.string(), status: z.enum(['clean', 'infected', 'error']) });

export async function POST(request: NextRequest) {
  if (Number(request.headers.get('content-length') || 0) > 2048) return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  const raw = await request.text();
  if (raw.length > 2048) return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  const timestamp = request.headers.get('x-globalhome-scan-timestamp') || '';
  const signature = request.headers.get('x-globalhome-scan-signature') || '';
  if (!verifyScanWebhook(raw, timestamp, signature, process.env.IDENTITY_SCAN_WEBHOOK_SECRET || '')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let input: unknown;
  try { input = JSON.parse(raw); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const parsed = eventSchema.safeParse(input);
  if (!parsed.success || !mongoose.isValidObjectId(parsed.data.documentId)) return NextResponse.json({ error: 'Invalid scan result' }, { status: 400 });
  const document = await Document.findOneAndUpdate({ _id: parsed.data.documentId, kind: { $in: [...identityKinds, ...privateDocumentKinds] }, scanStatus: 'pending', visibility: 'private' }, { $set: { scanStatus: parsed.data.status } }, { new: true }).select('_id').lean();
  if (!document) return NextResponse.json({ error: 'Document not pending' }, { status: 409 });
  await AuditEvent.create({ action: 'identity.scan', targetType: 'Document', targetId: document._id, metadata: { status: parsed.data.status } });
  return NextResponse.json({ ok: true });
}
