import nextEnv from '@next/env';
import mongoose from 'mongoose';
import { readFileSync } from 'node:fs';

nextEnv.loadEnvConfig(process.cwd());
const uri = process.env.MONGODB_URI;
const database = process.argv.find(arg => arg.startsWith('--database='))?.slice('--database='.length) || process.env.MONGODB_DB_NAME?.trim();
if (!uri || !database || !/^[A-Za-z0-9_-]+$/.test(database) || ['admin', 'config', 'local', 'test'].includes(database)) {
  console.error('Specify an explicit, non-system database with --database=NAME or MONGODB_DB_NAME. No changes were made.');
  process.exit(1);
}

const registry = JSON.parse(readFileSync(new URL('../src/data/countries.json', import.meta.url), 'utf8'));
try {
  await mongoose.connect(uri, { dbName: database, serverSelectionTimeoutMS: 7000 });
  const db = mongoose.connection.getClient().db(database);
  const collections = await db.listCollections({}, { nameOnly: true }).toArray();
  const names = collections.map(item => item.name);
  const existingCountries = names.includes('countries') ? await db.collection('countries').find({}, { projection: { code: 1, enabled: 1, _id: 0 } }).toArray() : [];
  const existingCodes = new Set(existingCountries.map(item => item.code));
  const existingProperties = names.includes('properties') ? await db.collection('properties').countDocuments({}) : 0;
  console.log(JSON.stringify({ mode: 'read-only preview', database, collections: names, registryCountries: registry.length, registryEnabledCountries: registry.filter(item => item.enabled).length, existingCountryRecords: existingCountries.length, missingCountryRecords: registry.filter(item => !existingCodes.has(item.code)).length, existingPropertyRecords: existingProperties, actionIfApproved: 'Idempotently synchronize country and locale configuration; preserve enabled flags and property records.' }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ mode: 'read-only preview', database, connected: false, error: error instanceof Error ? error.name : 'Connection failed' }));
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
