export const MINIMUM_COUNTRY_INVENTORY = 100;

export function countryInventoryTarget(published: number, configuredTarget?: number) {
  const target = Math.max(MINIMUM_COUNTRY_INVENTORY, configuredTarget || MINIMUM_COUNTRY_INVENTORY);
  return { target, remaining: Math.max(0, target - published), achieved: published >= target };
}
