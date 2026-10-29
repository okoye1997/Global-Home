import { loadEnvConfig } from '@next/env';
import { bootstrapAdminSchema, assertDevelopmentAdminBootstrap } from '../src/lib/admin-bootstrap';

loadEnvConfig(process.cwd());
let targetValid = false;
try {
  assertDevelopmentAdminBootstrap(process.env.MONGODB_URI, process.env.MONGODB_DB_NAME, process.env.NODE_ENV, true);
  targetValid = true;
} catch { /* No URI or database name is displayed. */ }
const parsed = bootstrapAdminSchema.safeParse({
  fullName: process.env.GH_BOOTSTRAP_ADMIN_NAME,
  email: process.env.GH_BOOTSTRAP_ADMIN_EMAIL,
  phone: process.env.GH_BOOTSTRAP_ADMIN_PHONE,
  countryCode: process.env.GH_BOOTSTRAP_ADMIN_COUNTRY_CODE,
  password: process.env.GH_BOOTSTRAP_ADMIN_PASSWORD,
});
console.log(JSON.stringify({ targetValid, fieldsValid: parsed.success, invalidFields: parsed.success ? [] : parsed.error.issues.map(issue => ({ field: issue.path.join('.'), code: issue.code })) }));
