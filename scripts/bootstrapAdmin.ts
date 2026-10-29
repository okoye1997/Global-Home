import { loadEnvConfig } from '@next/env';
import mongoose from 'mongoose';
import { connectDb } from '../src/lib/db';
import { bootstrapAdminSchema, assertDevelopmentAdminBootstrap } from '../src/lib/admin-bootstrap';
import { hashPassword } from '../src/lib/auth';
import { AuditEvent, Country, User } from '../src/lib/models';

loadEnvConfig(process.cwd());

async function main() {
  assertDevelopmentAdminBootstrap(process.env.MONGODB_URI, process.env.MONGODB_DB_NAME, process.env.NODE_ENV, process.argv.includes('--create'));
  const details = bootstrapAdminSchema.parse({
    fullName: process.env.GH_BOOTSTRAP_ADMIN_NAME,
    email: process.env.GH_BOOTSTRAP_ADMIN_EMAIL,
    phone: process.env.GH_BOOTSTRAP_ADMIN_PHONE,
    countryCode: process.env.GH_BOOTSTRAP_ADMIN_COUNTRY_CODE,
    password: process.env.GH_BOOTSTRAP_ADMIN_PASSWORD,
  });
  await connectDb();
  if (await User.exists({ role: 'admin' })) throw new Error('An administrator already exists; bootstrap is disabled');
  if (!await Country.exists({ code: details.countryCode, enabled: true })) throw new Error('Administrator country is not enabled');
  const user = await User.create({
    fullName: details.fullName, email: details.email, phone: details.phone,
    countryCode: details.countryCode, passwordHash: await hashPassword(details.password),
    role: 'admin', emailVerifiedAt: new Date(), termsAcceptedAt: new Date(), preferredLocale: 'en',
  });
  await AuditEvent.create({ actorId: user._id, action: 'admin.bootstrap', targetType: 'User', targetId: user._id });
  console.log('Development administrator created. Enroll MFA before login.');
}

main().catch(() => { console.error('Administrator bootstrap failed. Check the explicit target, required environment fields, and existing users.'); process.exitCode = 1; }).finally(() => mongoose.disconnect());
