import { loadEnvConfig } from '@next/env';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';
import { connectDb } from '../src/lib/db';
import { Property } from '../src/lib/models';
import { ACADEMIC_SOURCE } from '../src/lib/property-publication';

loadEnvConfig(process.cwd());

async function main() {
  if (process.env.MONGODB_DB_NAME !== 'globalhome_dev' || process.env.NODE_ENV === 'production') throw new Error('Image audit restricted to globalhome_dev outside production');
  await connectDb();
  if (mongoose.connection.db?.databaseName !== 'globalhome_dev') throw new Error('Connected to the wrong database');
  const records = await Property.find({ sourceProvider: ACADEMIC_SOURCE, isDemo: true, academicVisible: true })
    .select('countryCode propertyType media').lean();
  const files = await readdir(path.resolve('public/images/academic'), { recursive: true });
  const assets = files.filter(file => file.endsWith('.webp'));
  const hashes = new Set<string>();
  for (const file of assets) hashes.add(createHash('sha256').update(await readFile(path.resolve('public/images/academic', file))).digest('hex'));
  const byCountry = new Map<string, Map<string, number>>();
  const coverCountries = new Map<string, Set<string>>();
  const coverCounts = new Map<string, number>();
  const byCategory = new Map<string, { properties: number; withCover: number; uniqueCovers: Set<string> }>();
  let missingCover = 0, missingGallery = 0, missingAsset = 0;
  for (const property of records) {
    const cover = property.media?.[0]?.url;
    const gallery = (property.media as { kind?: string; url?: string }[] | undefined)?.filter((item: { kind?: string; url?: string }) => item.kind === 'image' && item.url) || [];
    if (!cover) missingCover++;
    if (gallery.length < 2 || new Set(gallery.map((item: { url?: string }) => item.url)).size < 2) missingGallery++;
    const category = byCategory.get(property.propertyType) || { properties: 0, withCover: 0, uniqueCovers: new Set<string>() };
    category.properties++;
    byCategory.set(property.propertyType, category);
    if (cover) {
      category.withCover++;
      category.uniqueCovers.add(cover);
      const countryCovers = byCountry.get(property.countryCode) || new Map<string, number>();
      countryCovers.set(cover, (countryCovers.get(cover) || 0) + 1);
      byCountry.set(property.countryCode, countryCovers);
      const countries = coverCountries.get(cover) || new Set<string>();
      countries.add(property.countryCode);
      coverCountries.set(cover, countries);
      coverCounts.set(cover, (coverCounts.get(cover) || 0) + 1);
    }
    for (const image of gallery) {
      const url = image.url || '';
      // Windows readdir paths use backslashes; normalize both sides before comparing.
      if (!url.startsWith('/images/academic/') || !assets.some(asset => asset.replaceAll('\\', '/') === url.slice('/images/academic/'.length))) missingAsset++;
    }
  }
  const duplicateWithinCountry = [...byCountry.values()].reduce((sum, covers) => sum + [...covers.values()].reduce((count, used) => count + used - 1, 0), 0);
  const crossCountryReuse = [...coverCountries.values()].filter(countries => countries.size > 1).length;
  const [mostReusedImage, mostReusedCount] = [...coverCounts].sort((a, b) => b[1] - a[1])[0] || ['', 0];
  const report = {
    database: mongoose.connection.db?.databaseName, totalImageAssets: assets.length, distinctImageContentHashes: hashes.size,
    totalPropertyRecords: records.length, propertiesWithCover: records.length - missingCover, propertiesWithoutCover: missingCover,
    propertiesWithGallery: records.length - missingGallery, propertiesWithoutGallery: missingGallery,
    uniqueCoverAssignments: coverCounts.size, duplicateCoverAssignmentsWithinCountries: duplicateWithinCountry,
    crossCountryCoverReuse: crossCountryReuse, mostReusedImage: { url: mostReusedImage, count: mostReusedCount }, missingLocalAssets: missingAsset,
    countriesWith100UniqueCovers: [...byCountry.values()].filter(covers => covers.size === 100).length,
    categoryCoverage: Object.fromEntries([...byCategory].sort(([a], [b]) => a.localeCompare(b)).map(([category, coverage]) => [category, { properties: coverage.properties, withCover: coverage.withCover, uniqueCovers: coverage.uniqueCovers.size }])),
  };
  console.log(JSON.stringify(report, null, 2));
  if (records.length !== 24_300 || missingCover || missingGallery || missingAsset || duplicateWithinCountry || report.countriesWith100UniqueCovers !== 243 || assets.length < 1000 || hashes.size < 1000) process.exitCode = 1;
}

main().catch(error => { console.error(error instanceof Error ? error.message : 'Image audit failed'); process.exitCode = 1; }).finally(() => mongoose.disconnect());
