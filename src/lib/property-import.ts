import { parse as parseCsv } from 'csv-parse/sync';
import { readSheet } from 'read-excel-file/node';
import { z } from 'zod';
import { propertyTypes } from './property-types';
import { purposes } from './pricing';
import { INVESTMENT_MONTHLY_PROJECTED_RATE, validateLocalPrice, type FxSnapshot } from './pricing';
import { safeMediaUrl } from './media-url';

const optionalNumber = z.preprocess(value => value === '' || value === null ? undefined : value, z.coerce.number().finite().optional());
const safeText = (maximum: number) => z.string().trim().max(maximum).refine(value => !/^[\s\u0000-\u001f]*[=+@-]/.test(value), 'Spreadsheet formula-like text is not allowed');
const optionalMediaUrl = z.string().trim().max(1000).refine(value => !value || !!safeMediaUrl(value), 'Use a valid HTTPS URL without credentials').optional();
export const importRowSchema = z.object({
  sourceReference: safeText(200).min(1),
  title: safeText(200).min(3),
  slug: z.string().trim().regex(/^[a-z0-9-]+$/).max(220),
  propertyType: z.enum(propertyTypes), purpose: z.enum(purposes),
  countryCode: z.string().trim().regex(/^[A-Z]{2}$/),
  currencyCode: z.string().trim().regex(/^[A-Z]{3}$/),
  region: safeText(120).optional(), city: safeText(120).min(1),
  addressText: safeText(500).optional(),
  latitude: optionalNumber.pipe(z.number().min(-90).max(90).optional()),
  longitude: optionalNumber.pipe(z.number().min(-180).max(180).optional()),
  localPriceMinor: z.union([z.number(), z.string().trim().transform(Number)]).pipe(z.number().int().safe().positive()),
  bedrooms: optionalNumber.pipe(z.number().int().nonnegative().optional()),
  bathrooms: optionalNumber.pipe(z.number().int().nonnegative().optional()),
  landAreaSqm: optionalNumber.pipe(z.number().nonnegative().optional()),
  buildingAreaSqm: optionalNumber.pipe(z.number().nonnegative().optional()),
  description: safeText(10000).optional(),
  amenities: z.union([z.array(safeText(100)), z.string().transform(value => value.split('|').map(item => item.trim()).filter(Boolean)).pipe(z.array(safeText(100)))]).pipe(z.array(safeText(100)).max(50)).optional(),
  videoUrl: optionalMediaUrl, virtualTourUrl: optionalMediaUrl,
  availabilityStatus: z.preprocess(value => value === '' || value === null ? undefined : value, z.enum(['available','reserved','unavailable','sold','rented','leased']).optional()),
}).strict().refine(value => (value.latitude === undefined) === (value.longitude === undefined), { message: 'Latitude and longitude must be supplied together' });

export type ImportRow = z.infer<typeof importRowSchema>;
export type ImportIssue = { row: number; reason: string };

export function prepareImportRows(rows: unknown[], countryCode: string, currencyCode: string, sourceProvider: string, fx: FxSnapshot, adminId: unknown) {
  const errors: ImportIssue[] = [];
  const warnings: ImportIssue[] = [];
  const prepared: { row: number; data: Record<string, unknown> }[] = [];
  const seenRefs = new Set<string>();
  const seenSlugs = new Set<string>();
  for (const [index, raw] of rows.entries()) {
    const rowNumber = index + 2;
    const parsed = importRowSchema.safeParse(raw);
    if (!parsed.success) { errors.push({ row: rowNumber, reason: parsed.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ').slice(0, 500) }); continue; }
    const row = parsed.data;
    if (row.countryCode !== countryCode || row.currencyCode !== currencyCode) { errors.push({ row: rowNumber, reason: 'Country or local currency mismatch' }); continue; }
    if (seenRefs.has(row.sourceReference) || seenSlugs.has(row.slug)) { errors.push({ row: rowNumber, reason: 'Duplicate source reference or slug in file' }); continue; }
    seenRefs.add(row.sourceReference); seenSlugs.add(row.slug);
    try {
      const price = validateLocalPrice(row.purpose, row.localPriceMinor, row.currencyCode, fx);
      const { latitude, longitude, ...fields } = row;
      const availabilityStatus = row.availabilityStatus || 'unavailable';
      prepared.push({ row: rowNumber, data: { ...fields, ...price, location: { type: 'Point', coordinates: [longitude ?? 0, latitude ?? 0] }, status: 'draft', verificationStatus: 'pending', isDemo: false, available: availabilityStatus === 'available', availabilityStatus, sourceType: 'import', sourceProvider, adminVendorId: adminId, createdBy: adminId, investmentMonthlyProjectedRate: row.purpose === 'invest' ? INVESTMENT_MONTHLY_PROJECTED_RATE : undefined } });
      if (latitude === undefined) warnings.push({ row: rowNumber, reason: 'No coordinates; map marker unavailable until reviewed coordinates are supplied' });
      if (!row.addressText) warnings.push({ row: rowNumber, reason: 'No public address supplied' });
    } catch (error) { errors.push({ row: rowNumber, reason: error instanceof Error ? error.message : 'Invalid price' }); }
  }
  return { prepared, errors, warnings };
}

export async function parseImportFile(fileName: string, bytes: Buffer): Promise<unknown[]> {
  const extension = fileName.toLowerCase().split('.').pop();
  if (extension === 'json') {
    const data: unknown = JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, ''));
    if (!Array.isArray(data)) throw new Error('JSON root must be an array');
    return data;
  }
  if (extension === 'csv') return parseCsv(bytes.toString('utf8'), { columns: true, bom: true, skip_empty_lines: true, relax_quotes: false, trim: true }) as unknown[];
  if (extension === 'xlsx') {
    const rows = await readSheet(bytes);
    const [header, ...values] = rows;
    if (!header) return [];
    const keys = header.map(value => String(value || '').trim());
    return values.filter(row => row.some(value => value !== null && value !== '')).map(row => Object.fromEntries(keys.map((key, index) => [key, row[index] ?? undefined])));
  }
  throw new Error('Use a .csv, .xlsx or .json file');
}
