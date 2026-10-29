export function explicitDatabaseName(uri: string | undefined, configuredName?: string) {
  const name = configuredName?.trim();
  if (name) {
    if (!/^[A-Za-z0-9_-]+$/.test(name)) throw new Error('MONGODB_DB_NAME is invalid');
    return name;
  }
  if (!uri) throw new Error('MONGODB_URI is required');
  let database: string;
  try { database = decodeURIComponent(new URL(uri).pathname.replace(/^\//, '')); }
  catch { throw new Error('MONGODB_URI is invalid'); }
  if (!database) throw new Error('Specify the verified existing database in MONGODB_DB_NAME or the MongoDB URI before initializing countries');
  if (!/^[A-Za-z0-9_-]+$/.test(database)) throw new Error('MongoDB database name is invalid');
  return database;
}
