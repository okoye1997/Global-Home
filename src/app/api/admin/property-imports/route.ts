import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { Country, FxRate, ImportBatch, Property, AuditEvent } from '@/lib/models';
import { parseImportFile, prepareImportRows } from '@/lib/property-import';

export async function GET() {
  const user = await currentUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const items = await ImportBatch.find().sort({ createdAt: -1 }).limit(30).lean();
  return NextResponse.json({ items }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  const user = await currentUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const form = await request.formData();
  const file = form.get('file');
  const countryCode = String(form.get('countryCode') || '').toUpperCase();
  const sourceProvider = String(form.get('sourceProvider') || '').trim();
  const commit = form.get('commit') === 'true';
  if (!(file instanceof File) || file.size < 1 || file.size > 20 * 1024 * 1024 || !/^[A-Z]{2}$/.test(countryCode) || sourceProvider.length < 3 || sourceProvider.length > 120 || /^[\s\u0000-\u001f]*[=+@-]/.test(sourceProvider) || form.get('authorizedSourceConfirmed') !== 'true') return NextResponse.json({ error: 'Invalid import request or source authorization' }, { status: 400 });
  const country = await Country.findOne({ code: countryCode, enabled: true }).lean();
  if (!country) return NextResponse.json({ error: 'Country is not enabled' }, { status: 400 });
  const fx = await FxRate.findOne({ baseCurrency: 'USD', quoteCurrency: country.currencyCode, approved: true, effectiveAt: { $lte: new Date() } }).sort({ effectiveAt: -1 }).lean();
  if (!fx) return NextResponse.json({ error: 'Approved FX snapshot required' }, { status: 400 });
  const bytes = Buffer.from(await file.arrayBuffer());
  let rows: unknown[];
  try { rows = await parseImportFile(file.name, bytes); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid file' }, { status: 400 }); }
  if (!rows.length || rows.length > 5000) return NextResponse.json({ error: 'Each file must contain 1–5000 rows; split larger inventories into batches' }, { status: 400 });
  const { prepared, errors, warnings } = prepareImportRows(rows, countryCode, country.currencyCode, sourceProvider, { baseCurrency: 'USD', quoteCurrency: country.currencyCode, rate: fx.rate, provider: fx.provider, effectiveAt: fx.effectiveAt, fetchedAt: fx.fetchedAt }, user._id);
  const duplicates = await Property.find({ $or: [{ slug: { $in: prepared.map(item => item.data.slug) } }, { sourceType: 'import', sourceProvider, sourceReference: { $in: prepared.map(item => item.data.sourceReference) } }] }).select('slug sourceReference sourceProvider').lean();
  const existingSlugs = new Set(duplicates.map(item => item.slug));
  const existingRefs = new Set(duplicates.filter(item => item.sourceProvider === sourceProvider).map(item => item.sourceReference));
  const candidates = prepared.filter(item => {
    if (existingSlugs.has(item.data.slug) || existingRefs.has(item.data.sourceReference)) { errors.push({ row: item.row, reason: 'Already imported or slug already exists' }); return false; }
    return true;
  });
  const duplicateCount = errors.filter(item => item.reason.includes('Duplicate') || item.reason.includes('Already imported')).length;
  if (!commit) return NextResponse.json({ preview: true, totalRows: rows.length, accepted: candidates.length, rejected: errors.length - duplicateCount, duplicates: duplicateCount, warnings: warnings.length, warningDetails: warnings.slice(0, 100), errors: errors.slice(0, 5000) }, { headers: { 'Cache-Control': 'no-store' } });
  const batch = await ImportBatch.create({ countryCode, sourceProvider, fileName: file.name.slice(0, 200), fileHash: createHash('sha256').update(bytes).digest('hex'), createdBy: user._id, totalRows: rows.length, inserted: 0, skipped: 0, failed: 0, rowErrors: [], status: 'processing' });
  let inserted = 0;
  for (let offset = 0; offset < candidates.length; offset += 50) {
    const chunk = candidates.slice(offset, offset + 50);
    const results = await Promise.allSettled(chunk.map(item => Property.create({ ...item.data, importBatchId: batch._id })));
    for (const [index, result] of results.entries()) {
      if (result.status === 'fulfilled') inserted++;
      else errors.push({ row: chunk[index].row, reason: result.reason && typeof result.reason === 'object' && 'code' in result.reason && result.reason.code === 11000 ? 'Duplicate record' : 'Database insertion failed' });
    }
  }
  batch.inserted = inserted;
  batch.skipped = errors.filter(item => item.reason.includes('Duplicate') || item.reason.includes('Already imported')).length;
  batch.failed = errors.length - batch.skipped;
  batch.rowErrors = errors.slice(0, 5000);
  batch.status = 'completed';
  await batch.save();
  await AuditEvent.create({ actorId: user._id, action: 'property.import', targetType: 'ImportBatch', targetId: batch._id, metadata: { countryCode, inserted, failed: batch.failed, skipped: batch.skipped } });
  return NextResponse.json({ batchId: batch.id, totalRows: rows.length, accepted: inserted, rejected: batch.failed, duplicates: batch.skipped, warnings: warnings.length, warningDetails: warnings.slice(0, 100), errors: batch.rowErrors }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
}
