import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { importRowSchema, parseImportFile, prepareImportRows } from './property-import';
import { publicAvailabilityLabel } from './property-status';

const row = { sourceReference:'owner-1', title:'Verified house', slug:'verified-house', propertyType:'house', purpose:'buy', countryCode:'NG', currencyCode:'NGN', city:'Lagos', localPriceMinor:90000000000 };
describe('authorized property import', () => {
  it('parses JSON and CSV into validated records', async () => {
    expect(importRowSchema.parse((await parseImportFile('inventory.json',Buffer.from(JSON.stringify([row]))))[0]).slug).toBe(row.slug);
    const csv = `sourceReference,title,slug,propertyType,purpose,countryCode,currencyCode,city,localPriceMinor\nowner-1,Verified house,verified-house,house,buy,NG,NGN,Lagos,90000000000`;
    expect(importRowSchema.parse((await parseImportFile('inventory.csv',Buffer.from(csv)))[0]).localPriceMinor).toBe(row.localPriceMinor);
  });
  it('requires coordinates in pairs and never uses technical labels for genuine listings', () => {
    expect(importRowSchema.safeParse({...row, latitude:6.4}).success).toBe(false);
    expect(publicAvailabilityLabel('buy','available')).toBe('For Sale');
    expect(publicAvailabilityLabel('rent','reserved')).toBe('Reserved');
  });
  it('reads each empty downloadable template without inventing a property', async () => {
    for (const extension of ['csv', 'xlsx', 'json']) {
      const bytes = readFileSync(`public/templates/property-import/properties.${extension}`);
      expect(await parseImportFile(`properties.${extension}`, bytes)).toEqual([]);
    }
  });
  it('keeps empty coordinates absent and blocks spreadsheet formulas and unsafe media links', () => {
    expect(importRowSchema.parse({ ...row, latitude: '', longitude: '' }).latitude).toBeUndefined();
    expect(importRowSchema.safeParse({ ...row, title: '=HYPERLINK("https://bad.example")' }).success).toBe(false);
    expect(importRowSchema.safeParse({ ...row, videoUrl: 'http://example.com/video' }).success).toBe(false);
  });
  it('prepares more than 1000 draft rows with per-row failures and warnings', () => {
    const rows = Array.from({ length: 1001 }, (_, index) => ({ ...row, slug: `fixture-${index}`, sourceReference: `fixture-${index}`, localPriceMinor: 50000000, currencyCode: 'USD', countryCode: 'US' }));
    rows[3] = { ...rows[3], title: '=unsafe' };
    rows[4] = { ...rows[4], slug: rows[2].slug };
    const result = prepareImportRows(rows, 'US', 'USD', 'authorized-test-source', { baseCurrency: 'USD', quoteCurrency: 'USD', rate: 1, provider: 'isolated-test-only', effectiveAt: new Date(), fetchedAt: new Date() }, 'test-admin');
    expect(result.prepared).toHaveLength(999);
    expect(result.errors).toHaveLength(2);
    expect(result.prepared.every(item => item.data.status === 'draft' && item.data.verificationStatus === 'pending' && item.data.availabilityStatus === 'unavailable')).toBe(true);
    expect(result.warnings).toHaveLength(1998);
  });
});
