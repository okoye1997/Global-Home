import { loadEnvConfig } from '@next/env';
import { createHash, randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import { connectDb } from '../src/lib/db';
import { hashPassword } from '../src/lib/auth';
import { decryptMfaSecret, totp } from '../src/lib/mfa';
import { RequestLimit, User } from '../src/lib/models';

loadEnvConfig(process.cwd());

const base = 'http://localhost:3000';
function check(condition: unknown, label: string) { if (!condition) throw new Error(`Development login check failed: ${label}`); }
function cookie(response: Response, name: string) {
  const entry = response.headers.getSetCookie().find(value => value.startsWith(`${name}=`));
  return entry?.split(';')[0];
}
async function post(path: string, data: object, sessionCookie?: string) {
  return fetch(`${base}${path}`, { method: 'POST', headers: { 'content-type': 'application/json', ...(sessionCookie ? { cookie: sessionCookie } : {}) }, body: JSON.stringify(data), redirect: 'manual' });
}

async function main() {
  if (process.env.NODE_ENV === 'production' || process.env.MONGODB_DB_NAME !== 'globalhome_dev') throw new Error('Development login check is restricted to globalhome_dev');
  await connectDb();
  if (mongoose.connection.db?.databaseName !== 'globalhome_dev') throw new Error('Wrong database');
  const email = `gh-login-check-${randomBytes(8).toString('hex')}@example.invalid`;
  const password = randomBytes(24).toString('base64url');
  let userId: mongoose.Types.ObjectId | undefined;
  try {
    const user = await User.create({ fullName: 'Temporary Login Check', email, phone: '+15555550100', countryCode: 'US', passwordHash: await hashPassword(password), role: 'user', termsAcceptedAt: new Date(), preferredLocale: 'en' });
    userId = user._id;
    const initial = await post('/api/auth/login', { email, password });
    check(initial.status === 403, `initial verification gate (HTTP ${initial.status})`);
    await User.updateOne({ _id: userId }, { $set: { emailVerifiedAt: new Date() } });
    check((await post('/api/auth/login', { email, password: 'incorrect-password' })).status === 401, 'invalid password');
    for (let attempt = 0; attempt < 2; attempt++) {
      const login = await post('/api/auth/login', { email, password });
      check(login.status === 200, 'verified customer login');
      const data = await login.json();
      check(data.user?.role === 'user' && !data.mfaRequired, 'customer bypasses MFA');
      const session = cookie(login, 'gh_session');
      check(session, 'customer session cookie');
      check((await fetch(`${base}/en/dashboard`, { headers: { cookie: session! }, redirect: 'manual' })).status === 200, 'customer dashboard');
      check((await fetch(`${base}/api/admin/settings`, { headers: { cookie: session! } })).status === 403, 'customer denied admin API');
      const logout = await post('/api/auth/logout', {}, session);
      check(logout.status === 200 && cookie(logout, 'gh_session') === 'gh_session=', 'logout clears session');
    }
    const adminEmail = process.env.GH_BOOTSTRAP_ADMIN_EMAIL;
    const adminPassword = process.env.GH_BOOTSTRAP_ADMIN_PASSWORD;
    if (adminEmail && adminPassword) {
      const admin = await User.findOne({ email: adminEmail.trim().toLowerCase(), role: 'admin' }).select('+mfaSecretEncrypted');
      check(admin?.mfaEnabledAt && admin.mfaSecretEncrypted, 'admin MFA enrolled');
      check((await post('/api/auth/login', { email: adminEmail, password: 'incorrect-password' })).status === 401, 'admin invalid password');
      const first = await post('/api/auth/login', { email: adminEmail, password: adminPassword });
      check(first.status === 200 && (await first.json()).mfaRequired, 'admin password yields MFA challenge');
      check(!cookie(first, 'gh_session'), 'admin has no session before MFA');
      const challenge = cookie(first, 'gh_admin_mfa_challenge');
      check(challenge, 'admin challenge cookie');
      check((await post('/api/auth/login/mfa', { mfaCode: 'invalid' }, challenge)).status === 400, 'bad MFA format');
      const code = totp(decryptMfaSecret(admin!.mfaSecretEncrypted!));
      const wrongCode = `${code.slice(0, 5)}${(Number(code[5]) + 1) % 10}`;
      check((await post('/api/auth/login/mfa', { mfaCode: wrongCode }, challenge)).status === 401, 'incorrect MFA code');
      const verified = await post('/api/auth/login/mfa', { mfaCode: code }, challenge);
      check(verified.status === 200, 'admin MFA completion');
      const adminSession = cookie(verified, 'gh_session');
      check(adminSession, 'admin session after MFA');
      check((await fetch(`${base}/api/admin/settings`, { headers: { cookie: adminSession! } })).status === 200, 'admin authorized API');
      await post('/api/auth/logout', {}, adminSession);
    }
    console.log(JSON.stringify({ database: 'globalhome_dev', customer: { unverifiedBlocked: true, invalidPasswordBlocked: true, verifiedEmailPasswordLogin: true, dashboard: true, logoutAndRepeatLogin: true, adminRouteDenied: true }, admin: { passwordThenMfa: Boolean(adminEmail && adminPassword), adminRouteAuthorized: Boolean(adminEmail && adminPassword) }, secretsPrinted: false }));
  } finally {
    if (userId) await User.deleteOne({ _id: userId, email });
    const key = createHash('sha256').update(`login:${email.toLowerCase()}`).digest('hex');
    await RequestLimit.deleteOne({ key });
    await mongoose.disconnect();
  }
}

main().catch(error => { const message = error instanceof Error && error.message.startsWith('Development login check failed:') ? error.message : `Development login journey failed: ${error instanceof Error ? error.name : 'unknown error'}`; console.error(`${message}; no credentials were printed.`); process.exitCode = 1; });
