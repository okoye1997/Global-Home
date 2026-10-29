import { localMinorFromUsd, purposes, usdBounds, validateLocalPrice, type FxSnapshot, type Purpose } from './pricing';
import { propertyTypes, type PropertyType } from './property-types';

export function demoPlan(index: number, currency: string, fx: FxSnapshot, categories: readonly PropertyType[] = propertyTypes, allowedPurposes: readonly Purpose[] = purposes) {
  if (!Number.isSafeInteger(index) || index < 0 || !categories.length || !allowedPurposes.length) throw new Error('Invalid demo generation options');
  const purpose = allowedPurposes[index % allowedPurposes.length];
  const propertyType = categories[index % categories.length];
  const [minimum, maximum] = usdBounds[purpose];
  const usd = minimum + Math.round((maximum - minimum) * ((index * 37 % 101) / 100));
  const localPriceMinor = localMinorFromUsd(usd, fx.rate, currency);
  const validation = validateLocalPrice(purpose, localPriceMinor, currency, fx);
  return { purpose, propertyType, localPriceMinor, ...validation };
}
