import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { privateDocumentKinds, privateDocumentLimit, validatePrivateDocument } from '@/lib/document-files';
import { AuditEvent, Document, Property, User } from '@/lib/models';
import { deletePrivateObject, putPrivateObject } from '@/lib/storage';

export async function POST(request: NextRequest) {
  const admin = await currentUser();
  if (!admin || admin.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: 'Invalid upload' }, { status: 400 });
  const kind = String(form.get('kind') || '');
  const title = String(form.get('title') || '').trim();
  const ownerId = String(form.get('ownerId') || '').trim();
  const propertyId = String(form.get('propertyId') || '').trim();
  const file = form.get('file');
  if (!privateDocumentKinds.includes(kind as typeof privateDocumentKinds[number]) || title.length < 3 || title.length > 200 || !file || !(file instanceof File) || file.size < 100 || file.size > privateDocumentLimit || (!ownerId && !propertyId) || (ownerId && !mongoose.isValidObjectId(ownerId)) || (propertyId && !mongoose.isValidObjectId(propertyId))) return NextResponse.json({ error: 'Invalid document metadata' }, { status: 400 });
  const [owner, property] = await Promise.all([ownerId ? User.exists({ _id: ownerId }) : null, propertyId ? Property.exists({ _id: propertyId }) : null]);
  if ((ownerId && !owner) || (propertyId && !property)) return NextResponse.json({ error: 'Document owner or property not found' }, { status: 404 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  let mimeType: string;
  try { mimeType = validatePrivateDocument(file.name, file.type, bytes); }
  catch { return NextResponse.json({ error: 'Unsupported document file' }, { status: 400 }); }
  const objectKey = `documents/${randomUUID()}`;
  try { await putPrivateObject(objectKey, bytes, mimeType); }
  catch { return NextResponse.json({ error: 'Private storage unavailable' }, { status: 503 }); }
  let document;
  try { document = await Document.create({ ownerId: ownerId || undefined, propertyId: propertyId || undefined, title, kind, objectKey, mimeType, sizeBytes: bytes.length, uploadedBy: admin._id, visibility: 'private', scanStatus: 'pending' }); }
  catch { await deletePrivateObject(objectKey).catch(() => undefined); return NextResponse.json({ error: 'Document metadata could not be stored' }, { status: 503 }); }
  await AuditEvent.create({ actorId: admin._id, action: 'document.uploaded', targetType: 'Document', targetId: document._id });
  return NextResponse.json({ id: document.id, scanStatus: document.scanStatus }, { status: 201 });
}
