import { describe, expect, it } from 'vitest';
import { collectFxSnapshots, type FxRateProvider } from './fx-sync';

describe('provider-agnostic FX synchronization boundary', () => {
  const provider: FxRateProvider = { name: 'test-only', fetchUsdQuote: async () => ({ rate: 1500, effectiveAt: new Date(), fetchedAt: new Date() }) };
  it('validates and deduplicates provider snapshots', async () => {
    const rows = await collectFxSnapshots(provider, ['NGN', 'ngn']);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ baseCurrency: 'USD', quoteCurrency: 'NGN', rate: 1500, provider: 'test-only' });
  });
  it('rejects stale or invalid provider data', async () => {
    await expect(collectFxSnapshots({ name: 'test-only', fetchUsdQuote: async () => ({ rate: 0, effectiveAt: new Date(), fetchedAt: new Date() }) }, ['NGN'])).rejects.toThrow();
    await expect(collectFxSnapshots({ name: 'test-only', fetchUsdQuote: async () => ({ rate: 1, effectiveAt: new Date(0), fetchedAt: new Date() }) }, ['USD'])).rejects.toThrow();
  });
});
