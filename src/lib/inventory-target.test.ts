import { describe, expect, it } from 'vitest';
import { countryInventoryTarget } from './inventory-target';

describe('enabled-country inventory target', () => {
  it('uses 100 as a minimum without capping inventory', () => {
    expect(countryInventoryTarget(83)).toEqual({ target: 100, remaining: 17, achieved: false });
    expect(countryInventoryTarget(127)).toEqual({ target: 100, remaining: 0, achieved: true });
    expect(countryInventoryTarget(120, 150)).toEqual({ target: 150, remaining: 30, achieved: false });
  });
});
