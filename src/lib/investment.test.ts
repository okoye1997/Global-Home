import { describe, expect, it } from 'vitest';
import { projectedMonthlyMinor, validateInvestmentAmount } from './investment';

describe('investment terms and amount', () => {
  it('enforces both USD-equivalent boundaries', () => {
    expect(validateInvestmentAmount(200_000, 'USD', 1)).toBe(2_000);
    expect(validateInvestmentAmount(20_000_000, 'USD', 1)).toBe(200_000);
    expect(() => validateInvestmentAmount(199_999, 'USD', 1)).toThrow();
    expect(() => validateInvestmentAmount(20_000_001, 'USD', 1)).toThrow();
  });
  it('uses the approved local FX rate and exact configured projection', () => {
    expect(validateInvestmentAmount(1_500_000_000, 'NGN', 1500)).toBe(10_000);
    expect(projectedMonthlyMinor(1_000_000)).toBe(300_000);
    expect(projectedMonthlyMinor(200_000)).toBe(60_000);
    expect(projectedMonthlyMinor(20_000_000)).toBe(6_000_000);
    expect(() => projectedMonthlyMinor(1_000_000, 0.2)).toThrow();
  });
});
