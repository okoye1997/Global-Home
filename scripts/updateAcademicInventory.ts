import { loadEnvConfig } from '@next/env';
import mongoose from 'mongoose';
import { connectDb } from '../src/lib/db';
import { Country, Property, User } from '../src/lib/models';
import { ACADEMIC_SOURCE } from '../src/lib/property-publication';
import { academicImageAssetCount, buildAcademicProperty } from '../src/lib/academic-inventory';

loadEnvConfig(process.cwd());

async function main() {
  const commit = process.argv.includes('--update');
  if (process.argv.length > 3 || (process.argv[2] && !commit) || process.env.NODE_ENV === 'production' || process.env.MONGODB_DB_NAME !== 'globalhome_dev' || process.env.ACADEMIC_INVENTORY_ENABLED !== 'true') {
    throw new Error('This update is restricted to academic mode in globalhome_dev; use --update to write');
  }
  await connectDb();
  if (mongoose.connection.db?.databaseName !== 'globalhome_dev') throw new Error('Connected database is not globalhome_dev');
  if (academicImageAssetCount < 1000) throw new Error(`Academic image library incomplete: ${academicImageAssetCount}/1000 assets`);
  const admin = await User.findOne({ role: 'admin', emailVerifiedAt: { $ne: null } }).select('_id').lean();
  if (!admin) throw new Error('Verified development administrator required');
  const countries = await Country.find({ enabled: true }).select('code name currencyCode').sort({ code: 1 }).lean();
  if (countries.length !== 243) throw new Error(`Expected 243 enabled countries; found ${countries.length}`);
  const existing = await Property.find({ sourceProvider: ACADEMIC_SOURCE, isDemo: true, academicVisible: true }).select('_id countryCode').lean();
  if (existing.length !== 24_300) throw new Error(`Expected exactly 24300 existing academic records; found ${existing.length}`);
  const existingIds = new Set(existing.map(item => String(item._id)));
  const planned = countries.flatMap(country => Array.from({ length: 100 }, (_, index) => buildAcademicProperty(country, index, admin._id)));
  const plannedIds = new Set(planned.map(item => item._id));
  const titleLocations = new Set(planned.map(item => `${item.title}\0${item.city}\0${item.countryCode}`));
  if (plannedIds.size !== 24_300 || titleLocations.size !== 24_300 || planned.some(item => !existingIds.has(item._id))) throw new Error('Academic identity or title collision; no records updated');
  console.log(JSON.stringify({ database: 'globalhome_dev', countries: countries.length, existingAcademic: existing.length, plannedUpdates: planned.length, uniqueIds: plannedIds.size, uniqueTitleLocations: titleLocations.size, writeRequested: commit }));
  if (!commit) return;
  let matched = 0;
  for (let offset = 0; offset < planned.length; offset += 250) {
    const operations = planned.slice(offset, offset + 250).map(property => {
      const { _id, ...fields } = property;
      return { updateOne: { filter: { _id, isDemo: true, academicVisible: true, sourceProvider: ACADEMIC_SOURCE }, update: { $set: fields }, upsert: false } };
    });
    const result = await Property.bulkWrite(operations, { ordered: false });
    matched += result.matchedCount;
  }
  if (matched !== 24_300) throw new Error(`Update incomplete: ${matched}/24300 matched; rerun is safe`);
  console.log(JSON.stringify({ matched, academicProperties: await Property.countDocuments({ sourceProvider: ACADEMIC_SOURCE, isDemo: true, academicVisible: true }) }));
}

main().catch(error => { console.error(error instanceof Error ? error.message : 'Academic update failed'); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
