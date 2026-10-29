import { describe, expect, it } from 'vitest';
import { assertDevelopmentAdminBootstrap, bootstrapAdminSchema } from './admin-bootstrap';

describe('development administrator bootstrap', () => {
  it('requires an explicit create flag and the isolated development database', () => {
    expect(() => assertDevelopmentAdminBootstrap('mongodb://localhost:27017/globalhome_dev', 'globalhome_dev', 'development', false)).toThrow();
    expect(() => assertDevelopmentAdminBootstrap('mongodb://localhost:27017/globalhome_dev', 'globalhome_dev', 'production', true)).toThrow();
    expect(() => assertDevelopmentAdminBootstrap('mongodb://localhost:27017/globalhome', 'globalhome', 'development', true)).toThrow();
    expect(() => assertDevelopmentAdminBootstrap('mongodb://localhost:27017/globalhome_dev', 'globalhome_dev', 'development', true)).not.toThrow();
  });

  it('requires a real international phone number and a strong password', () => {
    const valid = { fullName: 'Global Home Admin', email: 'ADMIN@example.com', phone: '+14155552671', countryCode: 'US', password: 'a-reasonably-long-password' };
    expect(bootstrapAdminSchema.parse(valid).email).toBe('admin@example.com');
    expect(bootstrapAdminSchema.parse({ ...valid, phone: '+1 (415) 555-2671' }).phone).toBe('+14155552671');
    expect(bootstrapAdminSchema.safeParse({ ...valid, phone: '123' }).success).toBe(false);
    expect(bootstrapAdminSchema.safeParse({ ...valid, password: 'short' }).success).toBe(false);
  });
});
