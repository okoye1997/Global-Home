import { demoPlan } from './demo';
import { INVESTMENT_MONTHLY_PROJECTED_RATE, purposes, type FxSnapshot, type Purpose } from './pricing';
import { propertyTypes, type PropertyType } from './property-types';

export const DEFAULT_DEMO_COUNT = 100;
export const DEMO_SOURCE = 'globalhome-dev-fixtures';
export const DEFAULT_DEMO_TYPES = ['house', 'apartment', 'duplex', 'land', 'hotel', 'event-centre', 'office', 'warehouse', 'commercial', 'resort', 'new-development'] as const satisfies readonly PropertyType[];

export type DemoSeedOptions = { countryCode?: string; count: number; resetDemo: boolean; categories: PropertyType[]; purposes: Purpose[] };
export function parseDemoSeedOptions(args: string[]): DemoSeedOptions {
  const allowed = new Set(['country', 'count', 'categories', 'purposes', 'reset-demo']);
  for (const arg of args) {
    const match = /^--([a-z-]+)(?:=(.*))?$/.exec(arg);
    if (!match || !allowed.has(match[1]) || (match[1] !== 'reset-demo' && !match[2])) throw new Error(`Unknown or incomplete seed option: ${arg}`);
  }
  const option = (name: string) => args.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3);
  const countryCode = option('country')?.toUpperCase();
  if (countryCode && !/^[A-Z]{2}$/.test(countryCode)) throw new Error('country must be an ISO alpha-2 code');
  const count = option('count') === undefined ? DEFAULT_DEMO_COUNT : Number(option('count'));
  if (!Number.isSafeInteger(count) || count < 1 || count > 10_000) throw new Error('count must be 1..10000');
  const categories = option('categories')?.split(',') as PropertyType[] | undefined || [...DEFAULT_DEMO_TYPES];
  const selectedPurposes = option('purposes')?.split(',') as Purpose[] | undefined || [...purposes];
  if (!categories.length || categories.some(type => !propertyTypes.includes(type))) throw new Error(`categories must be drawn from: ${propertyTypes.join(', ')}`);
  if (!selectedPurposes.length || selectedPurposes.some(purpose => !purposes.includes(purpose))) throw new Error(`purposes must be drawn from: ${purposes.join(', ')}`);
  return { countryCode, count, resetDemo: args.includes('--reset-demo'), categories, purposes: selectedPurposes };
}

export type DemoCountry = { code: string; currencyCode: string };
export function demoIdentity(countryCode: string, index: number) {
  return { countryCode, isDemo: true, verificationStatus: 'sample', sourceProvider: DEMO_SOURCE, sourceReference: `${countryCode}-${index + 1}` };
}
export function buildDemoProperty(country: DemoCountry, fx: FxSnapshot, adminId: unknown, index: number, options: DemoSeedOptions) {
  const price = demoPlan(index, country.currencyCode, fx, options.categories, options.purposes);
  const identity = demoIdentity(country.code, index);
  const residential = ['house', 'apartment', 'duplex'].includes(price.propertyType);
  const land = price.propertyType.includes('land') || price.propertyType === 'land';
  return {
    ...identity, slug: `dev-sample-${country.code.toLowerCase()}-${String(index + 1).padStart(5, '0')}`,
    title: `Sample ${price.propertyType.replaceAll('-', ' ')} ${index + 1}`,
    propertyType: price.propertyType, purpose: price.purpose, currencyCode: country.currencyCode,
    localPriceMinor: price.localPriceMinor, usdReferenceEquivalent: price.usdEquivalent,
    fxRate: price.fxRate, fxEffectiveAt: price.fxEffectiveAt, fxProvider: price.fxProvider,
    region: 'Illustrative region', city: 'Illustrative city', addressText: 'Illustrative location; no real address or ownership claim',
    location: { type: 'Point' as const, coordinates: [0, 0] },
    bedrooms: residential ? 1 + index % 5 : undefined, bathrooms: residential ? 1 + index % 4 : undefined,
    landAreaSqm: land ? 300 + index * 10 : undefined, buildingAreaSqm: land ? undefined : 100 + index * 5,
    amenities: [], media: [], description: 'Development fixture only. Address, availability, ownership and title are not verified.',
    available: false, availabilityStatus: 'unavailable', status: 'draft', sourceType: 'import',
    adminVendorId: adminId, createdBy: adminId,
    investmentMonthlyProjectedRate: price.purpose === 'invest' ? INVESTMENT_MONTHLY_PROJECTED_RATE : undefined,
    riskDisclosure: price.purpose === 'invest' ? 'Illustrative 30% monthly rate configuration. No signed offering or return is represented.' : undefined,
  };
}

export type DemoSeedStore = {
  deleteMany(filter: Record<string, unknown>): Promise<unknown>;
  updateOne(filter: Record<string, unknown>, update: Record<string, unknown>, options: { upsert: true }): Promise<unknown>;
  countDocuments(filter: Record<string, unknown>): Promise<number>;
};
export async function seedDemoCountry(store: DemoSeedStore, country: DemoCountry, fx: FxSnapshot, adminId: unknown, options: DemoSeedOptions) {
  const owned = { countryCode: country.code, isDemo: true, verificationStatus: 'sample', sourceProvider: DEMO_SOURCE };
  if (options.resetDemo) await store.deleteMany(owned);
  for (let index = 0; index < options.count; index++) {
    const property = buildDemoProperty(country, fx, adminId, index, options);
    await store.updateOne({ ...demoIdentity(country.code, index), slug: property.slug }, { $setOnInsert: property }, { upsert: true });
  }
  const total = await store.countDocuments(owned);
  if (total < options.count) throw new Error(`Only ${total} of ${options.count} sample records were confirmed for ${country.code}`);
  return total;
}
