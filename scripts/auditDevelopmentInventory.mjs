import nextEnv from '@next/env';
import mongoose from 'mongoose';

nextEnv.loadEnvConfig(process.cwd());
const uri = process.env.MONGODB_URI;
const selectedDatabase = process.argv.find(arg => arg.startsWith('--database='))?.slice('--database='.length) || process.env.MONGODB_DB_NAME?.trim();
if (selectedDatabase && !/^[A-Za-z0-9_-]+$/.test(selectedDatabase)) {
  console.log(JSON.stringify({ connected: false, reason: 'Invalid database name' }));
  process.exit(1);
}
if (!uri) {
  console.log(JSON.stringify({ connected: false, reason: 'MONGODB_URI is not configured for this process' }));
  process.exit(0);
}

let target;
try {
  const parsed = new URL(uri);
  target = {
    database: selectedDatabase || parsed.pathname.replace(/^\//, '') || '(default)',
    location: parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || parsed.hostname === '[::1]' ? 'local' : 'remote',
    scheme: parsed.protocol.replace(':', ''),
  };
} catch {
  console.log(JSON.stringify({ connected: false, reason: 'Invalid MongoDB URI format' }));
  process.exit(1);
}

try {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 7000, ...(selectedDatabase ? { dbName: selectedDatabase } : {}) });
  const client = mongoose.connection.getClient();
  const db = client.db(selectedDatabase || undefined);
  if (!db) throw new Error('MongoDB connection has no database handle');
  target.database = db.databaseName;
  let databaseNames = [];
  let discoveryError;
  try {
    const list = await client.db().admin().listDatabases({ nameOnly: true });
    databaseNames = list.databases.map(item => item.name);
  } catch (error) {
    discoveryError = error instanceof Error ? error.name : 'Database listing unavailable';
  }
  const databaseCandidates = [];
  for (const name of databaseNames) {
    if (name === 'admin' || name === 'config' || name === 'local') continue;
    try {
      const collections = await client.db(name).listCollections({}, { nameOnly: true }).toArray();
      const names = collections.map(item => item.name);
      if (names.includes('countries') || names.includes('properties') || /global.?home/i.test(name)) databaseCandidates.push({ database: name, collections: names });
    } catch { /* This credential may not list collections in every database. */ }
  }
  const collections = await db.listCollections({}, { nameOnly: true }).toArray();
  const names = new Set(collections.map(item => item.name));
  const countries = db.collection('countries');
  const properties = db.collection('properties');
  const publicFilter = { status: 'published', verificationStatus: 'verified', isDemo: false, verifiedAt: { $exists: true, $ne: null } };
  const group = async (field) => names.has('properties') ? properties.aggregate([{ $group: { _id: `$${field}`, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]).toArray() : [];
  const enabled = names.has('countries') ? await countries.find({ enabled: true }, { projection: { code: 1, name: 1, currencyCode: 1, minimumInventoryTarget: 1, _id: 0 } }).toArray() : [];
  const byCountry = await group('countryCode');
  const publicByCountry = names.has('properties') ? await properties.aggregate([{ $match: publicFilter }, { $group: { _id: '$countryCode', count: { $sum: 1 } } }]).toArray() : [];
  const totals = new Map(byCountry.map(item => [item._id, item.count]));
  const publicTotals = new Map(publicByCountry.map(item => [item._id, item.count]));
  const inventory = enabled.map(country => ({ country: country.code, total: totals.get(country.code) || 0, public: publicTotals.get(country.code) || 0, target: country.minimumInventoryTarget || 100, remaining: Math.max(0, (country.minimumInventoryTarget || 100) - (publicTotals.get(country.code) || 0)) }));
  const counts = inventory.map(item => item.total);
  const publicCounts = inventory.map(item => item.public);
  const totalProperties = names.has('properties') ? await properties.countDocuments({}) : 0;
  const withMediaResult = names.has('properties') ? await properties.aggregate([
    { $lookup: { from: 'propertymedias', localField: '_id', foreignField: 'propertyId', as: 'uploadedMedia' } },
    { $match: { $or: [{ 'media.0': { $exists: true } }, { 'uploadedMedia.0': { $exists: true } }] } },
    { $count: 'count' },
  ]).toArray() : [];
  const withMedia = withMediaResult[0]?.count || 0;
  const configuration = {
    users: names.has('users') ? await db.collection('users').countDocuments({}) : 0,
    verifiedAdmins: names.has('users') ? await db.collection('users').countDocuments({ role: 'admin', emailVerifiedAt: { $ne: null } }) : 0,
    approvedFxRates: names.has('fxrates') ? await db.collection('fxrates').countDocuments({ approved: true }) : 0,
    locales: names.has('localeconfigs') ? await db.collection('localeconfigs').countDocuments({ enabled: true }) : 0,
  };
  console.log(JSON.stringify({ connected: true, target, databaseNames, databaseCandidates, discoveryError, collections: collections.map(item => item.name), configuration, enabledCountries: enabled.length, totalProperties, publishedProperties: names.has('properties') ? await properties.countDocuments({ status: 'published' }) : 0, verifiedProperties: names.has('properties') ? await properties.countDocuments({ verificationStatus: 'verified' }) : 0, publicProperties: names.has('properties') ? await properties.countDocuments({ ...publicFilter, countryCode: { $in: enabled.map(item => item.code) } }) : 0, byPurpose: await group('purpose'), byType: await group('propertyType'), byStatus: await group('status'), byVerification: await group('verificationStatus'), byAvailability: await group('availabilityStatus'), coordinates: { present: names.has('properties') ? await properties.countDocuments({ 'location.coordinates.0': { $exists: true }, 'location.coordinates.1': { $exists: true }, 'location.coordinates': { $ne: [0, 0] } }) : 0, absent: names.has('properties') ? await properties.countDocuments({ $or: [{ 'location.coordinates.0': { $exists: false } }, { 'location.coordinates.1': { $exists: false } }, { 'location.coordinates': [0, 0] }] }) : 0 }, media: { withMedia, withoutMedia: totalProperties - withMedia }, countrySummary: { minimumTotal: counts.length ? Math.min(...counts) : 0, maximumTotal: counts.length ? Math.max(...counts) : 0, minimumPublic: publicCounts.length ? Math.min(...publicCounts) : 0, maximumPublic: publicCounts.length ? Math.max(...publicCounts) : 0, below100: inventory.filter(item => item.public < 100).length, atOrAbove100: inventory.filter(item => item.public >= 100).length, totalPublicShortage: inventory.reduce((sum, item) => sum + item.remaining, 0) }, inventory }, null, 2));
} catch (error) {
  const message = error instanceof Error ? error.message : '';
  const reason = /ENOTFOUND|DNSHostNotFound|querySrv|ESERVFAIL|ETIMEOUT/i.test(message) ? 'DNS lookup failed'
    : /ECONNREFUSED/i.test(message) ? 'Connection refused'
    : /ETIMEDOUT|server selection timed out/i.test(message) ? 'Connection timed out'
    : /authentication failed|bad auth/i.test(message) ? 'Authentication failed'
    : error instanceof Error ? error.name : 'Connection failed';
  console.log(JSON.stringify({ connected: false, target, reason, code: typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : undefined }));
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
