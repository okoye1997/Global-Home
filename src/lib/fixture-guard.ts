export function assertFixtureDatabase(uri: string | undefined, nodeEnv: string | undefined, enabled: string | undefined) {
  if (!uri || nodeEnv === 'production' || enabled !== 'true') throw new Error('Synthetic fixtures require an explicitly enabled development/test database and must never run in production.');
  let database = '';
  try {
    const parsed = new URL(uri);
    if (parsed.protocol !== 'mongodb:' || !['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)) throw new Error('Fixture database must be local');
    database = parsed.pathname.replace(/^\//, '');
  } catch { throw new Error('Synthetic fixtures require a local development/test MongoDB URI'); }
  if (!/(?:^|[-_])(dev|test)(?:$|[-_])/.test(database)) throw new Error('Synthetic fixtures require a database named for development or testing.');
}
