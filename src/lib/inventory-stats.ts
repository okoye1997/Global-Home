import { connectDb } from './db';
import { Country, Property } from './models';
import { publicPropertyFilter } from './property-publication';

export function publicInventoryQuery(enabledCodes: string[]) {
  return { ...publicPropertyFilter, countryCode: { $in: enabledCodes } };
}

export async function inventoryStats() {
  await connectDb();
  const enabledCodes = await Country.find({ enabled: true }).distinct('code');
  const publishedProperties = await Property.countDocuments(publicInventoryQuery(enabledCodes));
  return { enabledCountries: enabledCodes.length, publishedProperties };
}
