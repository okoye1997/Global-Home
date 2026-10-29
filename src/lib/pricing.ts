import { z } from 'zod';
import { minorFactor } from './currency';
export const purposes = ['buy', 'rent', 'lease', 'invest'] as const;
export type Purpose = (typeof purposes)[number];
export const usdBounds: Record<Purpose, readonly [number, number]> = { buy: [20_000, 900_000], rent: [2_000, 20_000], lease: [5_000, 70_000], invest: [2_000, 200_000] };
export const INVESTMENT_MONTHLY_PROJECTED_RATE = 0.30;
export const fxSnapshotSchema = z.object({ baseCurrency: z.literal('USD'), quoteCurrency: z.string().regex(/^[A-Z]{3}$/), rate: z.number().positive().finite(), provider: z.string().min(1), effectiveAt: z.date(), fetchedAt: z.date() });
export type FxSnapshot = z.infer<typeof fxSnapshotSchema>;
export function validateLocalPrice(purpose: Purpose, localPriceMinor: number, currency: string, fx: FxSnapshot, now = new Date()) {
  fxSnapshotSchema.parse(fx);
  if (currency !== fx.quoteCurrency) throw new Error('FX currency does not match property currency');
  if (!Number.isSafeInteger(localPriceMinor) || localPriceMinor < 0) throw new Error('Invalid local price');
  if (fx.effectiveAt.getTime() > now.getTime() || now.getTime() - fx.effectiveAt.getTime() > 48 * 60 * 60 * 1000) throw new Error('FX snapshot is stale');
  const usdEquivalent = localPriceMinor / minorFactor(currency) / fx.rate;
  const [min, max] = usdBounds[purpose];
  if (localPriceMinor < localMinorFromUsd(min, fx.rate, currency) || localPriceMinor > localMinorFromUsd(max, fx.rate, currency)) throw new Error(`Price outside USD ${min}-${max} equivalent`);
  return { usdEquivalent, fxRate: fx.rate, fxEffectiveAt: fx.effectiveAt, fxProvider: fx.provider };
}
export function localMinorFromUsd(usd: number, rate: number, currency='USD') { if (!Number.isFinite(usd) || !Number.isFinite(rate) || rate <= 0) throw new Error('Invalid conversion'); return Math.round(usd * rate * minorFactor(currency)); }
