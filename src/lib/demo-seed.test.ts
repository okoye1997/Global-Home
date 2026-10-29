import { describe, expect, it } from 'vitest';
import registry from '@/data/countries.json';
import { assertFixtureDatabase } from './fixture-guard';
import { publicPropertyFilter } from './property-publication';
import { buildDemoProperty, DEFAULT_DEMO_COUNT, DEFAULT_DEMO_TYPES, DEMO_SOURCE, parseDemoSeedOptions, seedDemoCountry } from './demo-seed';
import { usdBounds, validateLocalPrice, type FxSnapshot } from './pricing';
import { Property } from './models';

const rates = { USD: 1, NGN: 1500, JPY: 150 } as const;
function fx(currency: keyof typeof rates): FxSnapshot { return { baseCurrency: 'USD', quoteCurrency: currency, rate: rates[currency], provider: 'isolated-test-only', effectiveAt: new Date(), fetchedAt: new Date() }; }
type Row = ReturnType<typeof buildDemoProperty>;
class MemoryStore {
  rows: Row[] = [];
  deleted: Record<string, unknown>[] = [];
  async deleteMany(filter: Record<string, unknown>) { this.deleted.push(filter); this.rows = this.rows.filter(row => !Object.entries(filter).every(([key, value]) => row[key as keyof Row] === value)); }
  async updateOne(filter: Record<string, unknown>, update: Record<string, unknown>) {
    if (this.rows.some(row => Object.entries(filter).every(([key, value]) => row[key as keyof Row] === value))) return;
    const incoming = update.$setOnInsert as Row;
    if (this.rows.some(row => row.slug === incoming.slug)) throw new Error('Duplicate slug; existing record was not changed');
    this.rows.push(incoming);
  }
  async countDocuments(filter: Record<string, unknown>) { return this.rows.filter(row => Object.entries(filter).every(([key, value]) => row[key as keyof Row] === value)).length; }
}

describe('isolated development property seed', () => {
  const defaults = parseDemoSeedOptions([]);
  it('defaults to 100 per enabled country with balanced categories and purposes', () => {
    expect(DEFAULT_DEMO_COUNT).toBeGreaterThanOrEqual(100);
    expect(defaults.count).toBe(100);
    expect(defaults.countryCode).toBeUndefined();
    expect(DEFAULT_DEMO_TYPES).toEqual(expect.arrayContaining(['house', 'apartment', 'duplex', 'land', 'hotel', 'event-centre', 'office', 'warehouse', 'commercial', 'resort', 'new-development']));
    const enabled = registry.filter(country => country.enabled);
    expect(enabled.length).toBe(243);
    expect(new Set(registry.map(country => country.code)).size).toBe(registry.length);
    for (const country of enabled) expect(country).toMatchObject({ code: expect.stringMatching(/^[A-Z]{2}$/), name: expect.any(String), currencyCode: expect.stringMatching(/^[A-Z]{3}$/), currencySymbol: expect.any(String), locale: expect.any(String), enabled: true });
    expect(enabled.length * defaults.count).toBe(24_300);
  });
  it('accepts a selected country, count and type/purpose filters', () => {
    expect(parseDemoSeedOptions(['--country=ng', '--count=500', '--categories=house,hotel', '--purposes=buy,rent'])).toMatchObject({ countryCode: 'NG', count: 500, categories: ['house', 'hotel'], purposes: ['buy', 'rent'] });
    expect(() => parseDemoSeedOptions(['--country=INVALID'])).toThrow();
  });
  for (const currency of ['USD', 'NGN', 'JPY'] as const) {
    it(`builds 100 ${currency} fixtures with valid local FX prices and sample markings`, () => {
      const country = { code: currency === 'NGN' ? 'NG' : currency === 'JPY' ? 'JP' : 'US', currencyCode: currency };
      const rows = Array.from({ length: 100 }, (_, index) => buildDemoProperty(country, fx(currency), 'test-admin', index, defaults));
      expect(new Set(rows.map(row => row.slug)).size).toBe(100);
      expect(new Set(rows.map(row => row.propertyType)).size).toBeGreaterThanOrEqual(11);
      expect(new Set(rows.map(row => row.purpose))).toEqual(new Set(['buy', 'rent', 'lease', 'invest']));
      for (const purpose of ['buy', 'rent', 'lease', 'invest']) expect(rows.filter(row => row.purpose === purpose)).toHaveLength(25);
      for (const type of DEFAULT_DEMO_TYPES) expect(rows.filter(row => row.propertyType === type).length).toBeGreaterThanOrEqual(9);
      for (const row of rows) {
        expect(row.countryCode).toBe(country.code); expect(row.currencyCode).toBe(currency);
        expect(row.isDemo).toBe(true); expect(row.verificationStatus).toBe('sample'); expect(row.status).toBe('draft');
        expect(row.sourceProvider).toBe(DEMO_SOURCE); expect(row.media).toEqual([]);
        expect(validateLocalPrice(row.purpose, row.localPriceMinor, currency, fx(currency)).usdEquivalent).toBeCloseTo(row.usdReferenceEquivalent);
        const [min, max] = usdBounds[row.purpose]; expect(row.usdReferenceEquivalent).toBeGreaterThanOrEqual(min - 0.01); expect(row.usdReferenceEquivalent).toBeLessThanOrEqual(max + 0.01);
        if (row.purpose === 'invest') expect(row.investmentMonthlyProjectedRate).toBe(0.3);
        expect(row).not.toMatchObject(publicPropertyFilter);
      }
    });
  }
  it('produces records accepted by the existing Mongoose Property schema', async () => {
    const row = buildDemoProperty({ code: 'US', currencyCode: 'USD' }, fx('USD'), '507f1f77bcf86cd799439011', 0, defaults);
    await expect(new Property(row).validate()).resolves.toBeUndefined();
  });
  it('supports all enabled countries without duplicate slugs', () => {
    const slugs = new Set<string>();
    for (const country of registry.filter(item => item.enabled)) {
      const snapshot: FxSnapshot = { ...fx('USD'), quoteCurrency: country.currencyCode };
      for (let index = 0; index < 100; index++) slugs.add(buildDemoProperty(country, snapshot, 'test-admin', index, defaults).slug);
    }
    expect(slugs.size).toBe(24_300);
  }, 20_000);
  it('reruns idempotently and reset removes only its own sample records', async () => {
    const store = new MemoryStore();
    const country = { code: 'US', currencyCode: 'USD' };
    const real = { ...buildDemoProperty(country, fx('USD'), 'admin', 0, defaults), slug: 'real-admin-property', isDemo: false, verificationStatus: 'verified', sourceProvider: 'admin' } as Row;
    const otherDemo = { ...buildDemoProperty(country, fx('USD'), 'admin', 1, defaults), slug: 'other-demo', sourceProvider: 'other-provider' };
    store.rows.push(real, otherDemo);
    expect(await seedDemoCountry(store, country, fx('USD'), 'admin', defaults)).toBe(100);
    expect(await seedDemoCountry(store, country, fx('USD'), 'admin', defaults)).toBe(100);
    expect(store.rows).toHaveLength(102);
    expect(await seedDemoCountry(store, country, fx('USD'), 'admin', { ...defaults, resetDemo: true })).toBe(100);
    expect(store.deleted).toEqual([{ countryCode: 'US', isDemo: true, verificationStatus: 'sample', sourceProvider: DEMO_SOURCE }]);
    expect(store.rows).toContain(real); expect(store.rows).toContain(otherDemo);
  });
  it('refuses to overwrite a real listing that owns a generated slug', async () => {
    const store = new MemoryStore();
    const country = { code: 'US', currencyCode: 'USD' };
    const real = { ...buildDemoProperty(country, fx('USD'), 'admin', 0, defaults), isDemo: false, verificationStatus: 'verified', sourceProvider: 'admin' } as Row;
    store.rows.push(real);
    await expect(seedDemoCountry(store, country, fx('USD'), 'admin', defaults)).rejects.toThrow('Duplicate slug');
    expect(store.rows).toEqual([real]);
  });
  it('refuses production, remote and unapproved databases before connection', () => {
    expect(() => assertFixtureDatabase('mongodb://localhost:27017/globalhome_test', 'test', 'true')).not.toThrow();
    expect(() => assertFixtureDatabase('mongodb://localhost:27017/globalhome_test', 'production', 'true')).toThrow();
    expect(() => assertFixtureDatabase('mongodb+srv://cluster.example/globalhome_test', 'development', 'true')).toThrow();
    expect(() => assertFixtureDatabase('mongodb://localhost:27017/globalhome', 'development', 'true')).toThrow();
    expect(() => assertFixtureDatabase('mongodb://localhost:27017/globalhome_test', 'development', undefined)).toThrow();
  });
});
