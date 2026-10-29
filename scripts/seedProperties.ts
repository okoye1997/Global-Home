import mongoose from 'mongoose';
import { loadEnvConfig } from '@next/env';
import { connectDb } from '../src/lib/db';
import { Country, FxRate, Property, User } from '../src/lib/models';
import { fxSnapshotSchema } from '../src/lib/pricing';
import { assertFixtureDatabase } from '../src/lib/fixture-guard';
import { parseDemoSeedOptions, seedDemoCountry } from '../src/lib/demo-seed';

loadEnvConfig(process.cwd());

async function main() {
  // Check the target before any connection or mutation. Remote and production URIs are refused.
  assertFixtureDatabase(process.env.MONGODB_URI, process.env.NODE_ENV, process.env.ALLOW_SYNTHETIC_FIXTURES);
  const options = parseDemoSeedOptions(process.argv.slice(2));
  await connectDb();
  const admin = await User.findOne({ role: 'admin', emailVerifiedAt: { $ne: null } }).select('_id').lean();
  if (!admin) throw new Error('A verified admin user must exist in this isolated development/test database.');
  const countries = await Country.find(options.countryCode ? { code: options.countryCode, enabled: true } : { enabled: true }).lean();
  if (!countries.length) throw new Error('No enabled matching country');

  // Validate all required FX snapshots before writing any property for this run.
  const plans = await Promise.all(countries.map(async country => {
    const record = await FxRate.findOne({ baseCurrency: 'USD', quoteCurrency: country.currencyCode, approved: true, effectiveAt: { $lte: new Date() } }).sort({ effectiveAt: -1 }).lean();
    if (!record) throw new Error(`No approved USD/${country.currencyCode} rate for ${country.code}`);
    const fx = fxSnapshotSchema.parse({ baseCurrency: record.baseCurrency, quoteCurrency: record.quoteCurrency, rate: record.rate, provider: record.provider, effectiveAt: record.effectiveAt, fetchedAt: record.fetchedAt });
    if (Date.now() - fx.effectiveAt.getTime() > 48 * 60 * 60 * 1000) throw new Error(`Approved FX snapshot is stale for ${country.code}`);
    return { country, fx };
  }));

  for (const { country, fx } of plans) {
    const total = await seedDemoCountry(Property, country, fx, admin._id, options);
    console.log(`${country.code}: ${total} development-only sample properties confirmed (${country.currencyCode})`);
  }
  console.log(`Confirmed at least ${options.count} sample records in each of ${plans.length} enabled countries.`);
}

main().then(() => mongoose.disconnect()).catch(async error => { console.error(error instanceof Error ? error.message : 'Fixture seed failed'); await mongoose.disconnect(); process.exitCode = 1; });
