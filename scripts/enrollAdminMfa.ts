import { connectDb } from '../src/lib/db';
import { User } from '../src/lib/models';
import { createMfaSecret, encryptMfaSecret } from '../src/lib/mfa';
import { loadEnvConfig } from '@next/env';
import mongoose from 'mongoose';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

loadEnvConfig(process.cwd());

async function main() {
  const email = (process.argv.includes('--bootstrap-admin') ? process.env.GH_BOOTSTRAP_ADMIN_EMAIL : process.argv.find(value => value.startsWith('--email='))?.split('=')[1])?.trim().toLowerCase();
  if (!email) throw new Error('Usage: npm run admin:mfa -- --bootstrap-admin');
  if (process.env.NODE_ENV === 'production' || process.env.MONGODB_DB_NAME !== 'globalhome_dev') throw new Error('This enrollment command is restricted to globalhome_dev');
  const directory = resolve(process.cwd(), '.private');
  const output = resolve(directory, 'admin-mfa-enrollment.txt');
  if (existsSync(output)) throw new Error('Remove the previous private MFA enrollment file before creating a new one');
  await connectDb();
  const user = await User.findOne({ email, role: 'admin', emailVerifiedAt: { $ne: null } });
  if (!user) throw new Error('Verified admin user not found');
  if (user.mfaEnabledAt) throw new Error('Admin MFA is already enabled');
  const secret = createMfaSecret();
  const encryptedSecret = encryptMfaSecret(secret);
  const uri = `otpauth://totp/GlobalHome:${encodeURIComponent(email)}?secret=${secret}&issuer=GlobalHome&algorithm=SHA1&digits=6&period=30`;
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await writeFile(output, uri, { flag: 'wx', mode: 0o600 });
  await User.updateOne({ _id: user._id }, { $set: { mfaSecretEncrypted: encryptedSecret, mfaEnabledAt: new Date() }, $inc: { sessionVersion: 1 } });
  console.log('MFA enrollment URI saved to the ignored .private/admin-mfa-enrollment.txt file. Enroll the authenticator, then securely remove that file.');
}
main().catch(() => { console.error('MFA enrollment failed; check the admin account, encryption key, and private output file.'); process.exitCode = 1; }).finally(() => mongoose.disconnect());
