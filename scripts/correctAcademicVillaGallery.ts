import { loadEnvConfig } from '@next/env';
import mongoose from 'mongoose';
import { connectDb } from '../src/lib/db';
import { Property } from '../src/lib/models';
import { ACADEMIC_SOURCE } from '../src/lib/property-publication';

loadEnvConfig(process.cwd());

async function main() {
  const commit = process.argv.includes('--update');
  if (process.argv.length > 3 || (process.argv[2] && !commit) || process.env.NODE_ENV === 'production' || process.env.MONGODB_DB_NAME !== 'globalhome_dev' || process.env.ACADEMIC_INVENTORY_ENABLED !== 'true') {
    throw new Error('Villa gallery correction requires academic mode in globalhome_dev; use --update to write');
  }
  await connectDb();
  if (mongoose.connection.db?.databaseName !== 'globalhome_dev') throw new Error('Connected database is not globalhome_dev');
  const filter = {
    isDemo: true, academicVisible: true, sourceProvider: ACADEMIC_SOURCE,
    verificationStatus: 'sample', propertyType: 'luxury-home',
    'media.0.url': '/images/academic/villa.webp',
  };
  const count = await Property.countDocuments(filter);
  if (count !== 243) throw new Error(`Expected 243 featured academic villas; found ${count}. No changes made.`);
  console.log(JSON.stringify({ database: 'globalhome_dev', featuredAcademicVillas: count, writeRequested: commit }));
  if (!commit) return;
  const media = [
    '/images/academic/villa.webp',
    '/images/academic/house.webp',
    '/images/academic/townhouse.webp',
  ].map(url => ({ url, alt: 'Illustrative luxury home imagery', kind: 'image' }));
  const result = await Property.updateMany(filter, { $set: { media } });
  if (result.matchedCount !== 243) throw new Error(`Only ${result.matchedCount}/243 villas matched`);
  console.log(JSON.stringify({ matched: result.matchedCount, modified: result.modifiedCount }));
}

main().catch(error => { console.error(error instanceof Error ? error.message : 'Gallery correction failed'); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
