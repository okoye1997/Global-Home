import { fxSnapshotSchema, type FxSnapshot } from './pricing';

export interface FxRateProvider {
  readonly name: string;
  fetchUsdQuote(quoteCurrency: string): Promise<{ rate: number; effectiveAt: Date; fetchedAt: Date }>;
}

export async function collectFxSnapshots(provider: FxRateProvider, currencies: string[], now?: Date): Promise<FxSnapshot[]> {
  const unique = [...new Set(currencies.map(value => value.toUpperCase()))];
  const snapshots: FxSnapshot[] = [];
  for (const quoteCurrency of unique) {
    if (!/^[A-Z]{3}$/.test(quoteCurrency)) throw new Error('Invalid quote currency');
    const data = await provider.fetchUsdQuote(quoteCurrency);
    const snapshot = fxSnapshotSchema.parse({ baseCurrency: 'USD', quoteCurrency, provider: provider.name, ...data });
    const checkedAt = now || new Date();
    if (snapshot.effectiveAt.getTime() > checkedAt.getTime() || checkedAt.getTime() - snapshot.effectiveAt.getTime() > 48 * 60 * 60 * 1000) throw new Error(`Stale FX snapshot for ${quoteCurrency}`);
    if (snapshot.fetchedAt.getTime() > checkedAt.getTime() + 60_000) throw new Error('FX fetch time is in the future');
    snapshots.push(snapshot);
  }
  return snapshots;
}
