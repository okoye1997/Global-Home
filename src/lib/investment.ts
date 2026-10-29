import { INVESTMENT_MONTHLY_PROJECTED_RATE, localMinorFromUsd, usdBounds } from './pricing';
import { minorFactor } from './currency';

export function validateInvestmentAmount(amountMinor: number, currencyCode: string, approvedFxRate: number) {
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0 || !Number.isFinite(approvedFxRate) || approvedFxRate <= 0) throw new Error('Invalid investment amount or FX rate');
  const usdEquivalent = amountMinor / minorFactor(currencyCode) / approvedFxRate;
  const [minimum, maximum] = usdBounds.invest;
  if (amountMinor < localMinorFromUsd(minimum, approvedFxRate, currencyCode) || amountMinor > localMinorFromUsd(maximum, approvedFxRate, currencyCode)) throw new Error('Investment amount is outside the approved USD range');
  return usdEquivalent;
}

export function projectedMonthlyMinor(amountMinor: number, rate = INVESTMENT_MONTHLY_PROJECTED_RATE) {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0 || rate !== INVESTMENT_MONTHLY_PROJECTED_RATE) throw new Error('Invalid investment projection');
  return Math.round(amountMinor * rate);
}
