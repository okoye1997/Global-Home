import nextEnv from '@next/env';
import mongoose from 'mongoose';

nextEnv.loadEnvConfig(process.cwd());
if (process.env.MONGODB_DB_NAME !== 'globalhome_dev') throw new Error('Academic audit is restricted to globalhome_dev');
const uri = process.env.MONGODB_URI;
if (!uri) throw new Error('MONGODB_URI is not configured');
try {
  await mongoose.connect(uri, { dbName: 'globalhome_dev', serverSelectionTimeoutMS: 15000 });
  const db = mongoose.connection.db;
  if (db?.databaseName !== 'globalhome_dev') throw new Error('Unexpected database');
  const properties = db.collection('properties');
  const enabled = await db.collection('countries').find({ enabled: true }, { projection: { code: 1, currencyCode: 1, _id: 0 } }).toArray();
  const filter = { isDemo: true, sourceProvider: 'globalhome-academic-v1', academicVisible: true };
  const grouped = async field => properties.aggregate([{ $match: filter }, { $group: { _id: `$${field}`, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]).toArray();
  const [byCountry, byType, byPurpose, byCurrency, total, academicBrowsable, legitimatePublic] = await Promise.all([
    grouped('countryCode'), grouped('propertyType'), grouped('purpose'), grouped('currencyCode'),
    properties.countDocuments(filter),
    properties.countDocuments({ ...filter, status: 'published', verificationStatus: 'sample' }),
    properties.countDocuments({ status: 'published', verificationStatus: 'verified', isDemo: false, verifiedAt: { $exists: true, $ne: null } }),
  ]);
  const counts = new Map(byCountry.map(row => [row._id, row.count]));
  const countryTotals = enabled.map(row => counts.get(row.code) || 0);
  const missing = async condition => properties.countDocuments({ ...filter, ...condition });
  const quality = {
    withoutCountry: await missing({ $or: [{ countryCode: { $exists: false } }, { countryCode: '' }] }),
    withoutPrice: await missing({ $or: [{ localPriceMinor: { $exists: false } }, { localPriceMinor: { $lte: 0 } }] }),
    withoutCurrency: await missing({ $or: [{ currencyCode: { $exists: false } }, { currencyCode: '' }] }),
    withoutCity: await missing({ $or: [{ city: { $exists: false } }, { city: '' }] }),
    withoutAddress: await missing({ $or: [{ addressText: { $exists: false } }, { addressText: '' }] }),
    withoutCoordinates: await missing({ $or: [{ 'location.coordinates.0': { $exists: false } }, { 'location.coordinates.1': { $exists: false } }, { 'location.coordinates': [0, 0] }] }),
    withoutImage: await missing({ 'media.0': { $exists: false } }),
    withoutGallery: await missing({ 'media.2': { $exists: false } }),
    withoutType: await missing({ $or: [{ propertyType: { $exists: false } }, { propertyType: '' }] }),
    withoutPurpose: await missing({ $or: [{ purpose: { $exists: false } }, { purpose: '' }] }),
  };
  console.log(JSON.stringify({ database: 'globalhome_dev', enabledCountries: enabled.length, totalProperties: await properties.countDocuments({}), generatedAcademicProperties: total, academicBrowsable, legitimatePublic, localHomepageCountWhenAcademicModeEnabled: academicBrowsable + legitimatePublic, countriesAtLeast100: countryTotals.filter(n => n >= 100).length, countriesBelow100: countryTotals.filter(n => n < 100).length, minimumCountryInventory: Math.min(...countryTotals), maximumCountryInventory: Math.max(...countryTotals), countriesRepresented: byCountry.length, currenciesRepresented: byCurrency.length, byType, byPurpose, quality }, null, 2));
} catch (error) {
  console.error(`Academic audit failed: ${error instanceof Error ? error.name : 'Error'}`);
  process.exitCode = 1;
} finally { await mongoose.disconnect(); }
