import { loadEnvConfig } from '@next/env';
import mongoose from 'mongoose';
import { connectDb } from '../src/lib/db';
import { Country, Property, User } from '../src/lib/models';
import { ACADEMIC_SOURCE } from '../src/lib/property-publication';
import { assertAcademicTarget, buildAcademicProperty } from '../src/lib/academic-inventory';

loadEnvConfig(process.cwd());
async function main() {
  assertAcademicTarget(process.env.MONGODB_DB_NAME, process.env.NODE_ENV, process.argv.includes('--fix'));
  await connectDb();
  if (mongoose.connection.db?.databaseName !== 'globalhome_dev') throw new Error('Unexpected database');
  const admin = await User.findOne({ role: 'admin', emailVerifiedAt: { $ne: null } }).select('_id').lean();
  if (!admin) throw new Error('Development admin missing');
  let updated = 0;
  for (const code of ['HK', 'MO']) {
    const country = await Country.findOne({ code, enabled: true }).select('code name currencyCode').lean();
    if (!country) throw new Error(`${code} country missing`);
    const operations = Array.from({ length: 100 }, (_, index) => {
      const item = buildAcademicProperty(country, index, admin._id);
      return { updateOne: { filter: { _id: item._id, countryCode: code, sourceProvider: ACADEMIC_SOURCE, isDemo: true, 'location.coordinates': [0, 0] }, update: { $set: { title: item.title, region: item.region, city: item.city, addressText: item.addressText, location: item.location, description: item.description } } } };
    });
    const result = await Property.bulkWrite(operations, { ordered: false });
    updated += result.modifiedCount;
  }
  console.log(JSON.stringify({ database: 'globalhome_dev', academicCoordinatesCorrected: updated }));
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Academic coordinate correction failed'); process.exitCode = 1; }).finally(() => mongoose.disconnect());
