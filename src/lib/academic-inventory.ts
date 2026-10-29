import { createHash } from 'node:crypto';
import type { Types } from 'mongoose';
import cities from '../data/academic-cities.json';
import fxData from '../data/academic-fx.json';
import imageLibrary from '../data/academic-images.json';
import countryRegistry from '../data/countries.json';
import { minorFactor } from './currency';
import { ACADEMIC_SOURCE } from './property-publication';
import { propertyTypes } from './property-types';
import { INVESTMENT_MONTHLY_PROJECTED_RATE, localMinorFromUsd, purposes, usdBounds, validateLocalPrice } from './pricing';

export const ACADEMIC_MINIMUM_PER_COUNTRY = 100;
export const academicImageAssetCount = imageLibrary.length;
export type AcademicCountry = { code: string; name: string; currencyCode: string };
type Location = { city: string; latitude: number; longitude: number; region: string };
const locationsByCode = cities as Record<string, Location[]>;
const academicRates = fxData.rates as Record<string, number>;
const imageCategoryByType: Record<string, string> = {
  house: 'house', apartment: 'apartment', duplex: 'townhouse', 'luxury-home': 'villa',
  land: 'land', 'residential-land': 'land', 'commercial-land': 'commercial-land', 'agricultural-land': 'land',
  hotel: 'hotel', resort: 'resort', 'event-centre': 'event-centre', commercial: 'commercial',
  office: 'office', warehouse: 'warehouse', retail: 'retail', 'new-development': 'condominium',
  'investment-property': 'condominium',
};
const featuredGeneratedCovers: Record<string, string> = Object.fromEntries(
  ['house', 'apartment', 'villa', 'townhouse', 'condominium', 'land', 'commercial-land', 'commercial', 'office', 'hotel', 'resort', 'event-centre']
    .map(category => [category, `/images/academic/${category}.webp`]),
);
const imagePools = new Map<string, string[]>();
const countryImagePools = new Map<string, string[]>();
function eligibleImage(image: { category: string; countryCode?: string; title: string }) {
  const title = image.title.toLowerCase();
  if (/\b(toilet|pupils|eucalypts|president|vice president|politician|election|protest|mural|advert|sketch|drawing|diagram|ruin|derelict|dilapidated|abandoned|destroyed|demolished|bad house|construction|building site|eisenhower|white house|government|parliament|capitol|museum|school|college|church|temple|monastery)\b/.test(title)) return false;
  if (image.countryCode && !/\b(house|houses|home|residence|villa|townhouse|dwelling)\b/.test(title)) return false;
  if (image.category === 'villa' && !/\b(villa|mansion)\b/.test(title)) return false;
  return true;
}
for (const image of imageLibrary as { category: string; countryCode?: string; url: string; title: string }[]) {
  if (!eligibleImage(image)) continue;
  if (image.countryCode) countryImagePools.set(image.countryCode, [...(countryImagePools.get(image.countryCode) || []), image.url]);
  else imagePools.set(image.category, [...(imagePools.get(image.category) || []), image.url]);
}
const imagePlans = new Map<string, string[][]>();
function academicImagePlan(countryCode: string) {
  if (!imagePlans.size) {
    const categoryOffsets = new Map<string, number>();
    for (const country of [...countryRegistry].filter(item => item.enabled).sort((a, b) => a.code.localeCompare(b.code))) {
      const seed = createHash('sha256').update(country.code).digest().readUInt32BE(0);
      const usedCovers = new Set<string>();
      const usedFeatured = new Set<string>();
      const localPool = countryImagePools.get(country.code) || [];
      let localOffset = 0;
      const plan = Array.from({ length: ACADEMIC_MINIMUM_PER_COUNTRY }, (_, index) => {
        const type = propertyTypes[(index * 7 + seed) % propertyTypes.length];
        const category = imageCategoryByType[type];
        const pool = imagePools.get(category) || [];
        if (pool.length < 3) throw new Error(`Academic image category ${category} needs at least 3 distinct images`);
        const featured = !usedFeatured.has(category) ? featuredGeneratedCovers[category] : undefined;
        const useCountryImage = !featured && (category === 'house' || category === 'townhouse') && localOffset < localPool.length;
        const position = (categoryOffsets.get(category) || 0) % pool.length;
        const cover = featured || (useCountryImage ? localPool[localOffset++] : pool[position]);
        if (featured) usedFeatured.add(category);
        if (!featured && !useCountryImage) categoryOffsets.set(category, (categoryOffsets.get(category) || 0) + 1);
        if (usedCovers.has(cover)) throw new Error(`Insufficient unique ${category} covers for ${country.code}`);
        usedCovers.add(cover);
        if (featured && category === 'villa') {
          return [cover, featuredGeneratedCovers.house, featuredGeneratedCovers.townhouse];
        }
        return [cover, pool[(position + (featured || useCountryImage ? 0 : 1)) % pool.length], pool[(position + (featured || useCountryImage ? 1 : 2)) % pool.length]];
      });
      imagePlans.set(country.code, plan);
    }
  }
  const plan = imagePlans.get(countryCode);
  if (!plan) throw new Error(`No image plan for ${countryCode}`);
  return plan;
}
const adjectives = ['Modern','Contemporary','Elegant','Spacious','Premium','Bright','Refined','Executive','Distinctive','Well-Appointed','Urban','Landmark'];
const features = ['Central','Garden','City','Open-Plan','Terrace','Courtyard','Corner','Flexible','Signature','Spacious','Bright','Contemporary'];
const labels: Record<string,string> = { house:'Family House',apartment:'Apartment',duplex:'Duplex Residence','luxury-home':'Luxury Villa',land:'Development Land','residential-land':'Residential Land','commercial-land':'Commercial Land','agricultural-land':'Agricultural Land',hotel:'Boutique Hotel',resort:'Resort Property','event-centre':'Event Centre',commercial:'Commercial Building',office:'Office Property',warehouse:'Warehouse',retail:'Retail Property','new-development':'New Development','investment-property':'Investment Property' };
const residential = new Set(['house','apartment','duplex','luxury-home']);
const land = new Set(['land','residential-land','commercial-land','agricultural-land']);

export function assertAcademicTarget(dbName: string | undefined, nodeEnv: string | undefined, confirmed: boolean) {
  if (dbName !== 'globalhome_dev' || nodeEnv === 'production' || !confirmed) throw new Error('Academic inventory requires explicit --populate against globalhome_dev outside production');
}

export function academicIdentity(countryCode: string, index: number) {
  const slug = `academic-${countryCode.toLowerCase()}-${String(index + 1).padStart(4, '0')}`;
  return { slug, sourceReference: `${countryCode}-${index + 1}`, sourceProvider: ACADEMIC_SOURCE };
}

export function buildAcademicProperty(country: AcademicCountry, index: number, adminId: Types.ObjectId) {
  const countryLocations = locationsByCode[country.code];
  const rate = academicRates[country.currencyCode];
  if (!countryLocations?.length) throw new Error(`Missing academic location: ${country.code}`);
  if (!Number.isFinite(rate) || rate <= 0 || !Number.isFinite(minorFactor(country.currencyCode))) throw new Error(`Missing academic FX: ${country.currencyCode}`);
  const countrySeed = createHash('sha256').update(country.code).digest().readUInt32BE(0);
  const location = countryLocations[(index + countrySeed) % countryLocations.length];
  if (!Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) throw new Error(`Invalid academic location: ${country.code}`);
  const purpose = purposes[(index + countrySeed) % purposes.length];
  const propertyType = propertyTypes[(index * 7 + countrySeed) % propertyTypes.length];
  const [minimum, maximum] = usdBounds[purpose];
  const usd = minimum + Math.round((maximum - minimum) * (0.1 + ((index * 37 + countrySeed) % 81) / 100));
  const localPriceMinor = localMinorFromUsd(usd, rate, country.currencyCode);
  const effectiveAt = new Date(fxData.fetchedAt);
  const fx = { baseCurrency: 'USD' as const, quoteCurrency: country.currencyCode, rate, provider: `academic:${country.currencyCode === 'KPW' ? 'worlddata.info' : fxData.provider}`, effectiveAt, fetchedAt: effectiveAt };
  const price = validateLocalPrice(purpose, localPriceMinor, country.currencyCode, fx, effectiveAt);
  const id = createHash('sha256').update(`${ACADEMIC_SOURCE}:${country.code}:${index}`).digest('hex').slice(0, 24);
  const media = academicImagePlan(country.code)[index]
    .map(url => ({ url, alt: `Illustrative ${propertyType.replaceAll('-', ' ')} imagery`, kind: 'image' as const }));
  const beds = residential.has(propertyType) ? 1 + (index + countrySeed) % 5 : undefined;
  const baths = residential.has(propertyType) ? 1 + (index * 3 + countrySeed) % 4 : undefined;
  const area = land.has(propertyType) ? 320 + index * 23 + countrySeed % 211 : undefined;
  const building = land.has(propertyType) ? undefined : 85 + index * 7 + countrySeed % 83;
  const amenityVariant = (index + countrySeed) % 3;
  const amenities = land.has(propertyType) ? ['Road access','Development potential',...(['Survey-ready concept','Flexible plot layout','Open site plan'].slice(amenityVariant, amenityVariant + 1))]
    : propertyType === 'event-centre' ? ['Event parking','Reception','Air conditioning',amenityVariant === 0 ? 'Flexible seating' : amenityVariant === 1 ? 'Catering area' : 'Security']
    : residential.has(propertyType) ? ['Parking','Security',amenityVariant === 0 ? 'Balcony' : amenityVariant === 1 ? 'Garden' : 'Terrace']
    : ['Parking','Security',amenityVariant === 0 ? 'Internet' : amenityVariant === 1 ? 'Reception' : 'Flexible floor plan'];
  const availabilityStatus = index % 17 === 0 ? 'reserved' : index % 29 === 0 ? purpose === 'buy' ? 'sold' : purpose === 'rent' ? 'rented' : purpose === 'lease' ? 'leased' : 'unavailable' : 'available';
  const title = `${adjectives[(index + countrySeed) % adjectives.length]} ${features[(index * 5 + (countrySeed >>> 4)) % features.length]} ${labels[propertyType]} in ${location.city}, ${country.name}`;
  const purposePhrase = purpose === 'buy' ? 'purchase' : purpose === 'invest' ? 'investment study' : `${purpose} per month`;
  const description = `${title}. An illustrative ${purposePhrase} listing in the ${location.city} area of ${country.name}${location.region ? `, ${location.region}` : ''}. ${beds ? `The concept includes ${beds} bedroom${beds === 1 ? '' : 's'} and ${baths} bathroom${baths === 1 ? '' : 's'}. ` : ''}${building ? `Indicative building area: ${building} m². ` : ''}${area ? `Indicative land area: ${area} m². ` : ''}Illustrated features: ${amenities.join(', ').toLowerCase()}. The local-currency amount uses an illustrative FX snapshot. Location, availability, imagery and price are illustrative; no actual property offer or ownership is represented.`;
  return {
    _id: id, ...academicIdentity(country.code, index), title, propertyType, purpose, countryCode: country.code,
    region: location.region, city: location.city, addressText: `${location.city} area, ${country.name} (approximate illustrative location)`,
    location: { type: 'Point' as const, coordinates: [location.longitude, location.latitude] },
    currencyCode: country.currencyCode, localPriceMinor, usdReferenceEquivalent: price.usdEquivalent,
    fxRate: rate, fxEffectiveAt: effectiveAt, fxProvider: fx.provider,
    bedrooms: beds, bathrooms: baths, landAreaSqm: area, buildingAreaSqm: building,
    amenities, description, media, mediaOrigin: 'illustrative_generated',
    available: availabilityStatus === 'available', availabilityStatus,
    status: 'published', academicVisible: true, isDemo: true, verificationStatus: 'sample', sourceType: 'import',
    adminVendorId: adminId, createdBy: adminId,
    investmentMonthlyProjectedRate: purpose === 'invest' ? INVESTMENT_MONTHLY_PROJECTED_RATE : undefined,
    riskDisclosure: purpose === 'invest' ? 'Illustrative projection only. No actual investment offering, signed terms, or paid returns.' : undefined,
  };
}
