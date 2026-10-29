import { existsSync } from 'node:fs';
import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';
import countries from '../data/countries.json';
import { academicInventoryEnabled, ACADEMIC_SOURCE, realPropertyFilter } from './property-publication';
import { academicImageAssetCount, assertAcademicTarget, buildAcademicProperty } from './academic-inventory';
import { propertyTypes } from './property-types';
import { purposes, usdBounds } from './pricing';

const enabled = countries.filter(country => country.enabled);
const adminId = new Types.ObjectId('64b000000000000000000001');

describe('academic inventory isolation and completeness', () => {
  it('refuses production, other databases, and unconfirmed writes', () => {
    expect(() => assertAcademicTarget('globalhome_dev', 'production', true)).toThrow();
    expect(() => assertAcademicTarget('sample_mflix', 'development', true)).toThrow();
    expect(() => assertAcademicTarget('globalhome_dev', 'development', false)).toThrow();
    expect(() => assertAcademicTarget('globalhome_dev', 'development', true)).not.toThrow();
    expect(academicInventoryEnabled({ NODE_ENV: 'production', MONGODB_DB_NAME: 'globalhome_dev', ACADEMIC_INVENTORY_ENABLED: 'true' })).toBe(false);
    expect(academicInventoryEnabled({ NODE_ENV: 'development', MONGODB_DB_NAME: 'globalhome_dev', ACADEMIC_INVENTORY_ENABLED: 'true' })).toBe(true);
    expect(realPropertyFilter.isDemo).toBe(false);
  });

  it('builds 100 distinct, priced, located and pictured records for every enabled country', () => {
    expect(enabled).toHaveLength(243);
    expect(academicImageAssetCount).toBeGreaterThanOrEqual(1000);
    const ids = new Set<string>();
    const slugs = new Set<string>();
    const titleLocations = new Set<string>();
    const descriptions = new Set<string>();
    for (const country of enabled) {
      const properties = Array.from({ length: 100 }, (_, index) => buildAcademicProperty(country, index, adminId));
      expect(new Set(properties.map(item => item.slug)).size).toBe(100);
      expect(new Set(properties.map(item => item.propertyType)).size).toBeGreaterThanOrEqual(12);
      expect(new Set(properties.map(item => item.purpose)).size).toBe(4);
      expect(new Set(properties.map(item => item.media[0].url)).size).toBe(100);
      for (const property of properties) {
        expect(ids.has(property._id)).toBe(false);
        ids.add(property._id);
        expect(slugs.has(property.slug)).toBe(false);
        slugs.add(property.slug);
        const titleLocation = `${property.title}\0${property.city}\0${property.countryCode}`;
        expect(titleLocations.has(titleLocation)).toBe(false);
        titleLocations.add(titleLocation);
        expect(descriptions.has(property.description)).toBe(false);
        descriptions.add(property.description);
        expect(property.countryCode).toBe(country.code);
        expect(property.currencyCode).toBe(country.currencyCode);
        expect(property.city.length).toBeGreaterThan(1);
        expect(property.addressText).toContain(country.name);
        expect(property.location.coordinates[0]).toBeGreaterThanOrEqual(-180);
        expect(property.location.coordinates[0]).toBeLessThanOrEqual(180);
        expect(property.location.coordinates[1]).toBeGreaterThanOrEqual(-90);
        expect(property.location.coordinates[1]).toBeLessThanOrEqual(90);
        expect(property.localPriceMinor).toBeGreaterThan(0);
        const [minimum, maximum] = usdBounds[property.purpose];
        expect(property.usdReferenceEquivalent).toBeGreaterThanOrEqual(minimum - 1);
        expect(property.usdReferenceEquivalent).toBeLessThanOrEqual(maximum + 1);
        expect(property.media.length).toBeGreaterThanOrEqual(3);
        expect(new Set(property.media.map(image => image.url)).size).toBe(property.media.length);
        if (property.media[0].url === '/images/academic/villa.webp') {
          expect(property.media.map(image => image.url)).toEqual([
            '/images/academic/villa.webp', '/images/academic/house.webp', '/images/academic/townhouse.webp',
          ]);
        }
        for (const image of property.media) expect(existsSync(`public${image.url}`)).toBe(true);
        expect(property.sourceProvider).toBe(ACADEMIC_SOURCE);
        expect(property.isDemo).toBe(true);
        expect(property.verificationStatus).toBe('sample');
        expect(property.academicVisible).toBe(true);
        expect(propertyTypes).toContain(property.propertyType);
        expect(purposes).toContain(property.purpose);
        if (property.propertyType.includes('land')) expect(property.bedrooms).toBeUndefined();
        if (property.purpose === 'invest') expect(property.investmentMonthlyProjectedRate).toBe(0.3);
      }
      expect(buildAcademicProperty(country, 0, adminId)).toEqual(properties[0]);
    }
    expect(ids.size).toBe(24_300);
    expect(slugs.size).toBe(24_300);
    expect(titleLocations.size).toBe(24_300);
    expect(descriptions.size).toBe(24_300);
  }, 90_000);
});
