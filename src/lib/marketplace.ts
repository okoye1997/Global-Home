import { connectDb } from './db';
import type { SortOrder } from 'mongoose';
import { minorFactor } from './currency';
import { AdminSettings, Country, Property, PropertyMedia } from './models';
import { propertyTypes } from './property-types';
import { purposes } from './pricing';
import { ACADEMIC_SOURCE, publicPropertyFilter } from './property-publication';

export type MarketplaceFilters = {
  country?: string; region?: string; city?: string; search?: string; purpose?: string; type?: string; availability?: string;
  minPrice?: number; maxPrice?: number; bedrooms?: number; bathrooms?: number;
  minLandArea?: number; minBuildingArea?: number; amenities?: string[];
  verifiedOnly?: boolean; investmentOnly?: boolean;
  sort?: 'newest' | 'price-asc' | 'price-desc'; page?: number;
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const finiteNonnegative = (value: number | undefined) => value !== undefined && Number.isFinite(value) && value >= 0;

export function buildPropertyQuery(filters: MarketplaceFilters, currencyCode?: string) {
  const query: Record<string, unknown> = { ...publicPropertyFilter };
  if (filters.country) query.countryCode = filters.country.toUpperCase();
  if (filters.purpose && purposes.includes(filters.purpose as typeof purposes[number])) query.purpose = filters.purpose;
  if (filters.type === 'land') query.propertyType = { $in: ['land','residential-land','commercial-land','agricultural-land'] };
  else if (filters.type === 'commercial') query.propertyType = { $in: ['commercial','office','warehouse','retail'] };
  else if (filters.type && propertyTypes.includes(filters.type as typeof propertyTypes[number])) query.propertyType = filters.type;
  if (filters.availability && ['available','reserved','unavailable','sold','rented','leased'].includes(filters.availability)) query.availabilityStatus = filters.availability;
  if (filters.region?.trim()) query.region = new RegExp(`^${escapeRegex(filters.region.trim())}$`, 'i');
  if (filters.city?.trim()) query.city = new RegExp(`^${escapeRegex(filters.city.trim())}$`, 'i');
  if (finiteNonnegative(filters.bedrooms)) query.bedrooms = { $gte: filters.bedrooms };
  if (finiteNonnegative(filters.bathrooms)) query.bathrooms = { $gte: filters.bathrooms };
  if (finiteNonnegative(filters.minLandArea)) query.landAreaSqm = { $gte: filters.minLandArea };
  if (finiteNonnegative(filters.minBuildingArea)) query.buildingAreaSqm = { $gte: filters.minBuildingArea };
  if (filters.amenities?.length) query.amenities = { $all: filters.amenities.slice(0, 10) };
  if (filters.verifiedOnly) query.verificationStatus = 'verified';
  if (filters.investmentOnly) query.purpose = 'invest';
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    if (!currencyCode) throw new Error('Select a country before filtering by local price.');
    const price: Record<string, number> = {};
    if (finiteNonnegative(filters.minPrice)) price.$gte = Math.round(filters.minPrice! * minorFactor(currencyCode));
    if (finiteNonnegative(filters.maxPrice)) price.$lte = Math.round(filters.maxPrice! * minorFactor(currencyCode));
    if (Object.keys(price).length) query.localPriceMinor = price;
  }
  return query;
}

export async function listCountries() {
  await connectDb();
  return Country.find({ enabled: true }).sort({ name: 1 }).lean();
}

export async function listProperties(filters: MarketplaceFilters = {}) {
  await connectDb();
  const country = filters.country ? await Country.findOne({ code: filters.country.toUpperCase(), enabled: true }).lean() : null;
  if (filters.country && !country) return { items: [], total: 0, page: 1, currencyCode: undefined };
  const query = buildPropertyQuery(filters, country?.currencyCode);
  if (!country) {
    const enabledCodes = await Country.find({ enabled: true }).distinct('code');
    query.countryCode = { $in: enabledCodes };
  }
  if (filters.search?.trim()) {
    const terms = filters.search.trim().slice(0, 80).split(/\s+/).filter(term => term.length > 1 && !['in', 'at', 'the', 'a', 'property', 'properties'].includes(term.toLowerCase())).slice(0, 8);
    const countries = await Country.find({ enabled: true }).select('code iso3 name officialName currencyCode currencyName').lean();
    if (terms.length) query.$and = terms.map(term => {
      const regex = new RegExp(escapeRegex(term), 'i');
      const countryCodes = countries.filter(item => [item.code, item.iso3, item.name, item.officialName, item.currencyCode, item.currencyName]
        .some(value => value && regex.test(value))).map(item => item.code);
      return { $or: [
        { title: regex }, { city: regex }, { region: regex }, { propertyType: regex }, { purpose: regex }, { description: regex },
        ...(term.toLowerCase() === 'sale' ? [{ purpose: 'buy' }] : term.toLowerCase() === 'investment' ? [{ purpose: 'invest' }] : []),
        { countryCode: { $in: countryCodes } },
      ] };
    });
  }
  const page = Number.isSafeInteger(filters.page) ? Math.min(10000, Math.max(1, filters.page!)) : 1;
  const sort: Record<string, SortOrder> = filters.sort === 'price-asc' ? { localPriceMinor: 1, _id: 1 }
    : filters.sort === 'price-desc' ? { localPriceMinor: -1 as const, _id: -1 as const }
    : { createdAt: -1 as const, _id: -1 as const };
  const [items, total] = await Promise.all([
    Property.find(query).select('title slug propertyType purpose countryCode region city addressText location currencyCode localPriceMinor bedrooms bathrooms landAreaSqm buildingAreaSqm amenities description available availabilityStatus verificationStatus status createdAt isDemo sourceProvider media').sort(sort).skip((page - 1) * 24).limit(24).lean(),
    Property.countDocuments(query),
  ]);
  const media = await PropertyMedia.find({ propertyId: { $in: items.map(item => item._id) }, status: 'approved' })
    .select('propertyId alt isCover').sort({ isCover: -1, createdAt: 1 }).lean();
  const covers = new Map<string, { id?: string; url?: string; alt: string }>();
  for (const image of media) {
    const id = String(image.propertyId);
    if (!covers.has(id)) covers.set(id, { id: String(image._id), alt: image.alt });
  }
  return { items: items.map(item => {
    const { isDemo, sourceProvider, media: illustrativeMedia, verificationStatus, ...publicItem } = item;
    const academicCover = isDemo && sourceProvider === ACADEMIC_SOURCE && illustrativeMedia?.[0]?.url?.startsWith('/images/academic/')
      ? { url: illustrativeMedia[0].url, alt: illustrativeMedia[0].alt || 'Illustrative property image' } : undefined;
    return { ...publicItem,
      addressText: isDemo ? publicItem.addressText?.replace(/academic/gi, 'illustrative') : publicItem.addressText,
      description: isDemo ? publicItem.description?.replace(/academic/gi, 'illustrative') : publicItem.description,
      verificationStatus: isDemo ? undefined : verificationStatus,
      cover: covers.get(String(item._id)) || academicCover,
    };
  }), total, page, currencyCode: country?.currencyCode };
}

export async function publicAdminContact() {
  await connectDb();
  const settings = await AdminSettings.findOne({ key: 'global' }).lean();
  return {
    displayName: settings?.displayName || process.env.ADMIN_DISPLAY_NAME || 'GlobalHome Admin',
    supportEmail: settings?.supportEmail || process.env.ADMIN_SUPPORT_EMAIL || '',
    whatsAppNumber: settings?.whatsAppNumber || process.env.ADMIN_WHATSAPP_NUMBER || '',
  };
}

export function mapsUrl(latitude?: number, longitude?: number, address?: string) {
  const valid = Number.isFinite(latitude) && Number.isFinite(longitude) && latitude! >= -90 && latitude! <= 90 && longitude! >= -180 && longitude! <= 180 && (latitude !== 0 || longitude !== 0);
  const location = valid ? `${latitude},${longitude}` : address?.trim();
  return location ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}` : null;
}
