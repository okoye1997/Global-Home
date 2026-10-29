import { loadEnvConfig } from '@next/env';
import mongoose from 'mongoose';
import { connectDb } from '../src/lib/db';
import { User } from '../src/lib/models';

loadEnvConfig(process.cwd());

async function main() {
  if (process.env.NODE_ENV === 'production' || process.env.MONGODB_DB_NAME !== 'globalhome_dev') {
    throw new Error('This verification is restricted to globalhome_dev');
  }
  await connectDb();
  const admin = await User.findOne({ email: process.env.GH_BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase() })
    .select('+passwordHash +mfaSecretEncrypted').lean();
  const hash = admin?.passwordHash;
  const result = {
    database: mongoose.connection.db?.databaseName,
    exists: Boolean(admin),
    administratorRole: admin?.role === 'admin',
    emailVerified: Boolean(admin?.emailVerifiedAt),
    passwordHashed: typeof hash === 'string' && hash.startsWith('$2') && hash.length === 60,
    plaintextPasswordFieldAbsent: admin ? !Object.hasOwn(admin, 'password') : false,
    mfaEnrolled: Boolean(admin?.mfaEnabledAt && admin.mfaSecretEncrypted),
    mfaSecretEncrypted: typeof admin?.mfaSecretEncrypted === 'string' && admin.mfaSecretEncrypted.length > 32 && !admin.mfaSecretEncrypted.includes('otpauth://'),
  };
  console.log(JSON.stringify(result, null, 2));
  if (Object.values(result).some(value => value === false)) process.exitCode = 1;
}

main().catch(() => { console.error('Development administrator verification failed.'); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
