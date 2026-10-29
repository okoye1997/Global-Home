import { loadEnvConfig } from '@next/env';
import mongoose from 'mongoose';
import { connectDb } from '../src/lib/db';
import { Country, Property, User } from '../src/lib/models';
import { ACADEMIC_SOURCE } from '../src/lib/property-publication';
import { ACADEMIC_MINIMUM_PER_COUNTRY, assertAcademicTarget, buildAcademicProperty } from '../src/lib/academic-inventory';

loadEnvConfig(process.cwd());

async function main() {
  const args = process.argv.slice(2);
  const allowed = args.every(arg => arg === '--populate' || /^--count=\d+$/.test(arg));
  const count = Number(args.find(arg => arg.startsWith('--count='))?.slice(8) || ACADEMIC_MINIMUM_PER_COUNTRY);
  if (!allowed || !Number.isSafeInteger(count) || count < ACADEMIC_MINIMUM_PER_COUNTRY || count > 10_000) throw new Error('Use --populate with --count=100..10000');
  assertAcademicTarget(process.env.MONGODB_DB_NAME, process.env.NODE_ENV, args.includes('--populate'));
  if (process.env.ACADEMIC_INVENTORY_ENABLED !== 'true') throw new Error('Set ACADEMIC_INVENTORY_ENABLED=true for local academic mode');
  await connectDb();
  if (mongoose.connection.db?.databaseName !== 'globalhome_dev') throw new Error('Connected database is not globalhome_dev');
  const admin = await User.findOne({ role: 'admin', emailVerifiedAt: { $ne: null } }).select('_id').lean();
  if (!admin) throw new Error('Create the first verified development administrator before populating academic records');
  const countries = await Country.find({ enabled: true }).select('code name currencyCode').sort({ code: 1 }).lean();
  if (!countries.length) throw new Error('No enabled countries in globalhome_dev');
  // Validate the entire plan before the first write.
  for (const country of countries) {
    buildAcademicProperty(country, 0, admin._id);
    buildAcademicProperty(country, count - 1, admin._id);
  }
  let inserted = 0;
  for (const country of countries) {
    const existing = await Property.countDocuments({ countryCode: country.code, sourceProvider: ACADEMIC_SOURCE, isDemo: true, academicVisible: true });
    if (existing >= count) { console.log(`${country.code}: ${existing} already present`); continue; }
    for (let offset = 0; offset < count; offset += 250) {
      const end = Math.min(count, offset + 250);
      const operations = Array.from({ length: end - offset }, (_, n) => {
        const property = buildAcademicProperty(country, offset + n, admin._id);
        return { updateOne: { filter: { _id: property._id, isDemo: true, sourceProvider: ACADEMIC_SOURCE }, update: { $setOnInsert: property }, upsert: true } };
      });
      const result = await Property.bulkWrite(operations, { ordered: false });
      inserted += result.upsertedCount;
    }
    const confirmed = await Property.countDocuments({ countryCode: country.code, sourceProvider: ACADEMIC_SOURCE, isDemo: true, academicVisible: true });
    if (confirmed < count) throw new Error(`Academic inventory shortfall for ${country.code}: ${confirmed}/${count}`);
    console.log(`${country.code}: ${confirmed}`);
  }
  console.log(JSON.stringify({ database: 'globalhome_dev', enabledCountries: countries.length, expectedMinimum: countries.length * count, insertedThisRun: inserted, academicProperties: await Property.countDocuments({ sourceProvider: ACADEMIC_SOURCE, isDemo: true, academicVisible: true }) }));
}

main().catch(error => { console.error(error instanceof Error ? error.message : 'Academic inventory failed'); process.exitCode = 1; }).finally(() => mongoose.disconnect());
