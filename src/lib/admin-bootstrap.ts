import { z } from 'zod';
import { isValidPhoneNumber } from 'libphonenumber-js';
import { explicitDatabaseName } from './db-target';

export const bootstrapAdminSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.email().max(320).transform(value => value.toLowerCase()),
  phone: z.string().trim().transform(value => value.replace(/[\s()-]/g, '')).pipe(z.string().regex(/^\+[1-9]\d{7,14}$/).refine(isValidPhoneNumber)),
  countryCode: z.string().regex(/^[A-Z]{2}$/),
  password: z.string().min(12).max(128),
});

export function assertDevelopmentAdminBootstrap(uri: string | undefined, dbName: string | undefined, nodeEnv: string | undefined, confirmed: boolean) {
  if (!confirmed || nodeEnv === 'production') throw new Error('Development administrator bootstrap requires --create outside production');
  if (explicitDatabaseName(uri, dbName) !== 'globalhome_dev') throw new Error('Administrator bootstrap is restricted to globalhome_dev');
}
