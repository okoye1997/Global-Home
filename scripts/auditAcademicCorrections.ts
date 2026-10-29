import { loadEnvConfig } from '@next/env';
import mongoose from 'mongoose';
import { connectDb } from '../src/lib/db';
import { Country, Property } from '../src/lib/models';
import { ACADEMIC_SOURCE } from '../src/lib/property-publication';
import { minorFactor } from '../src/lib/currency';
import { INVESTMENT_MONTHLY_PROJECTED_RATE, localMinorFromUsd, purposes, usdBounds } from '../src/lib/pricing';

loadEnvConfig(process.cwd());

async function main() {
  if (process.env.MONGODB_DB_NAME !== 'globalhome_dev') throw new Error('Audit restricted to globalhome_dev');
  await connectDb();
  const countries = await Country.find({ enabled: true }).select('code currencyCode').lean();
  const records = await Property.find({ sourceProvider: ACADEMIC_SOURCE, isDemo: true, academicVisible: true })
    .select('_id slug title city region countryCode currencyCode localPriceMinor usdReferenceEquivalent fxRate purpose propertyType description media location bedrooms bathrooms landAreaSqm buildingAreaSqm investmentMonthlyProjectedRate')
    .lean();
  const ids = new Set<string>(), slugs = new Set<string>(), titleLocations = new Set<string>(), identities = new Set<string>();
  const covers = new Map<string, number>(), countryCounts = new Map<string, number>();
  const titles = new Set<string>(), descriptions = new Set<string>(), citiesByCountry = new Map<string, Set<string>>();
  const typePurposeByCountry = new Map<string, Set<string>>(), pricesByCountry = new Map<string, Set<number>>(), specificationsByCountry = new Map<string, Set<string>>();
  const price = Object.fromEntries(purposes.map(purpose => [purpose, { minimum: Infinity, maximum: -Infinity, violations: 0 }]));
  const quality = { missingPrice: 0, missingCurrency: 0, missingImage: 0, missingLocation: 0, invalidProjectedRate: 0 };
  const duplicates = { ids: 0, slugs: 0, titleLocations: 0, generatedIdentities: 0 };
  for (const row of records) {
    const id = String(row._id), slug = String(row.slug), titleLocation = `${row.title}\0${row.city}\0${row.countryCode}`;
    const identity = `${row.title}\0${row.description}\0${row.propertyType}\0${row.purpose}`;
    if (ids.has(id)) duplicates.ids++; ids.add(id);
    if (slugs.has(slug)) duplicates.slugs++; slugs.add(slug);
    if (titleLocations.has(titleLocation)) duplicates.titleLocations++; titleLocations.add(titleLocation);
    if (identities.has(identity)) duplicates.generatedIdentities++; identities.add(identity);
    titles.add(row.title); descriptions.add(row.description);
    const cities = citiesByCountry.get(row.countryCode) || new Set<string>(); cities.add(row.city); citiesByCountry.set(row.countryCode, cities);
    const combinations = typePurposeByCountry.get(row.countryCode) || new Set<string>(); combinations.add(`${row.propertyType}:${row.purpose}`); typePurposeByCountry.set(row.countryCode, combinations);
    const prices = pricesByCountry.get(row.countryCode) || new Set<number>(); prices.add(row.localPriceMinor); pricesByCountry.set(row.countryCode, prices);
    const specs = specificationsByCountry.get(row.countryCode) || new Set<string>(); specs.add(`${row.bedrooms}:${row.bathrooms}:${row.landAreaSqm}:${row.buildingAreaSqm}`); specificationsByCountry.set(row.countryCode, specs);
    countryCounts.set(row.countryCode, (countryCounts.get(row.countryCode) || 0) + 1);
    if (!Number.isSafeInteger(row.localPriceMinor) || row.localPriceMinor <= 0) quality.missingPrice++;
    if (!row.currencyCode) quality.missingCurrency++;
    if (!row.media?.length || !row.media[0]?.url) quality.missingImage++;
    else covers.set(row.media[0].url, (covers.get(row.media[0].url) || 0) + 1);
    if (!row.city || !row.location?.coordinates?.length) quality.missingLocation++;
    if (row.purpose === 'invest' && row.investmentMonthlyProjectedRate !== INVESTMENT_MONTHLY_PROJECTED_RATE) quality.invalidProjectedRate++;
    const bucket = price[row.purpose];
    if (!bucket || !Number.isFinite(row.fxRate) || row.fxRate <= 0 || !row.currencyCode || !Number.isSafeInteger(row.localPriceMinor)) { if (bucket) bucket.violations++; continue; }
    const equivalent = row.localPriceMinor / minorFactor(row.currencyCode) / row.fxRate;
    bucket.minimum = Math.min(bucket.minimum, equivalent);
    bucket.maximum = Math.max(bucket.maximum, equivalent);
    const [minimum, maximum] = usdBounds[row.purpose as keyof typeof usdBounds];
    if (row.localPriceMinor < localMinorFromUsd(minimum, row.fxRate, row.currencyCode) || row.localPriceMinor > localMinorFromUsd(maximum, row.fxRate, row.currencyCode) || Math.abs(equivalent - row.usdReferenceEquivalent) > 0.01) bucket.violations++;
  }
  const report = { database: mongoose.connection.db?.databaseName, enabledCountries: countries.length, academicProperties: records.length,
    minimumPerCountry: Math.min(...countries.map(country => countryCounts.get(country.code) || 0)), countriesAtLeast100: countries.filter(country => (countryCounts.get(country.code) || 0) >= 100).length,
    countriesBelow100: countries.filter(country => (countryCounts.get(country.code) || 0) < 100).length, duplicates,
    variation: { distinctTitles: titles.size, distinctDescriptions: descriptions.size,
      countriesWithMultipleCities: [...citiesByCountry.values()].filter(cities => cities.size > 1).length,
      minimumCitiesPerCountry: Math.min(...[...citiesByCountry.values()].map(cities => cities.size)),
      minimumTypePurposeCombinationsPerCountry: Math.min(...[...typePurposeByCountry.values()].map(items => items.size)),
      minimumDistinctPricesPerCountry: Math.min(...[...pricesByCountry.values()].map(items => items.size)),
      minimumDistinctSpecificationsPerCountry: Math.min(...[...specificationsByCountry.values()].map(items => items.size)) },
    price: Object.fromEntries(Object.entries(price).map(([purpose, value]) => [purpose, { minimum: Number(value.minimum.toFixed(2)), maximum: Number(value.maximum.toFixed(2)), violations: value.violations }])),
    projectedMonthlyRate: INVESTMENT_MONTHLY_PROJECTED_RATE, quality, currencies: new Set(records.map(row => row.currencyCode)).size,
    imageReuse: { distinctCoverAssets: covers.size, maximumListingsPerCover: Math.max(...covers.values()) } };
  console.log(JSON.stringify(report, null, 2));
  if (countries.length !== 243 || records.length !== 24_300 || report.countriesBelow100 || Object.values(duplicates).some(Boolean) || Object.values(price).some(item => item.violations) || Object.values(quality).some(Boolean)) process.exitCode = 1;
}

main().catch(error => { console.error(error instanceof Error ? error.message : 'Audit failed'); process.exitCode = 1; }).finally(() => mongoose.disconnect());
