import { describe, expect, it } from 'vitest';
import { demoPlan } from './demo';
import { usdBounds } from './pricing';

describe('worldwide demo generation', () => {
  const now = new Date();
  for (const [currency, rate] of [['USD', 1], ['NGN', 1500], ['JPY', 150], ['KWD', 0.3]] as const) {
    it(`keeps 100 ${currency} sample prices inside every purpose range`, () => {
      const purposes = new Set<string>();
      const categories = new Set<string>();
      for (let index = 0; index < 100; index++) {
        const row = demoPlan(index, currency, { baseCurrency: 'USD', quoteCurrency: currency, rate, provider: 'test', effectiveAt: now, fetchedAt: now });
        const [minimum, maximum] = usdBounds[row.purpose];
        expect(row.usdEquivalent).toBeGreaterThanOrEqual(minimum - 0.01);
        expect(row.usdEquivalent).toBeLessThanOrEqual(maximum + 0.01);
        purposes.add(row.purpose);
        categories.add(row.propertyType);
      }
      expect(purposes.size).toBe(4);
      expect(categories.size).toBeGreaterThan(10);
    });
  }
});
