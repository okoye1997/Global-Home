import { describe, expect, it, vi } from 'vitest';
import { inventoryStats, publicInventoryQuery } from './inventory-stats';
import { publicPropertyFilter } from './property-publication';
import { Country, Property } from './models';

vi.mock('./db', () => ({ connectDb: vi.fn() }));
vi.mock('./models', () => ({
  Country: { find: vi.fn() },
  Property: { countDocuments: vi.fn() },
}));

describe('homepage inventory eligibility', () => {
  it('counts only marketplace eligible properties in enabled countries', () => {
    expect(publicInventoryQuery(['NG', 'GB'])).toEqual({ ...publicPropertyFilter, countryCode: { $in: ['NG', 'GB'] } });
  });
  it('returns real zero counts from the database query', async () => {
    vi.mocked(Country.find).mockReturnValue({ distinct: vi.fn().mockResolvedValue([]) } as never);
    vi.mocked(Property.countDocuments).mockResolvedValue(0 as never);
    await expect(inventoryStats()).resolves.toEqual({ enabledCountries: 0, publishedProperties: 0 });
    expect(Property.countDocuments).toHaveBeenCalledWith(publicInventoryQuery([]));
  });
  it('uses the enabled country list when counting published inventory', async () => {
    vi.mocked(Country.find).mockReturnValue({ distinct: vi.fn().mockResolvedValue(['NG', 'GB']) } as never);
    vi.mocked(Property.countDocuments).mockResolvedValue(83 as never);
    await expect(inventoryStats()).resolves.toEqual({ enabledCountries: 2, publishedProperties: 83 });
    expect(Property.countDocuments).toHaveBeenCalledWith(publicInventoryQuery(['NG', 'GB']));
  });
});
