import { readFileSync, writeFileSync } from 'node:fs';
import { parse } from 'csv-parse/sync';

// One-time, factual reference extraction. Inputs are temporary downloads; no remote request occurs at runtime.
const countries = JSON.parse(readFileSync('src/data/countries.json', 'utf8')).filter(item => item.enabled);
const world = JSON.parse(readFileSync('.country-source.tmp.json', 'utf8'));
const capitals = parse(readFileSync('.capital-source.tmp.csv', 'utf8'), { columns: true, skip_empty_lines: true, relax_column_count: true });
const fx = JSON.parse(readFileSync('.fx-source.tmp.json', 'utf8'));
const capitalByCode = new Map(capitals.filter(row => /^[A-Z]{2}$/.test(row.CountryCode) && Number.isFinite(Number(row.CapitalLatitude)) && Number.isFinite(Number(row.CapitalLongitude))).map(row => [row.CountryCode, row]));
const worldByCode = new Map(world.map(row => [row.cca2, row]));
const overrides = {
  US: { city: 'Washington, D.C.', latitude: 38.883333, longitude: -77 },
  UM: { city: 'Midway Atoll', latitude: 28.2, longitude: -177.35 },
  HK: { city: 'Hong Kong', latitude: 22.3019, longitude: 114.1742 },
  MO: { city: 'Macao', latitude: 22.2111, longitude: 113.5394 },
};
const regions = { NG:'Federal Capital Territory',GH:'Greater Accra',ZA:'Gauteng',KE:'Nairobi County',EG:'Cairo Governorate',US:'District of Columbia',CA:'Ontario',MX:'Mexico City',BR:'Federal District',AR:'Buenos Aires',GB:'England',FR:'Île-de-France',DE:'Berlin',IT:'Lazio',ES:'Community of Madrid',AE:'Abu Dhabi',SA:'Riyadh Province',IN:'Delhi',CN:'Beijing',JP:'Tokyo',KR:'Seoul',SG:'Central Region',AU:'Australian Capital Territory',NZ:'Wellington Region' };
const locations = {};
for (const country of countries) {
  const capital = capitalByCode.get(country.code);
  const fallback = worldByCode.get(country.code);
  const value = overrides[country.code] || (capital ? { city: capital.CapitalName, latitude: Number(capital.CapitalLatitude), longitude: Number(capital.CapitalLongitude) } : { city: fallback?.capital?.[0], latitude: fallback?.latlng?.[0], longitude: fallback?.latlng?.[1] });
  if (!value?.city || !Number.isFinite(value.latitude) || !Number.isFinite(value.longitude) || Math.abs(value.latitude) > 90 || Math.abs(value.longitude) > 180) throw new Error(`Missing valid academic location for ${country.code}`);
  locations[country.code] = { city: value.city, latitude: value.latitude, longitude: value.longitude, region: regions[country.code] || '' };
}
const rates = {};
for (const currency of new Set(countries.map(item => item.currencyCode))) {
  const rate = currency === 'KPW' ? 900.32 : fx.rates?.[currency];
  if (!Number.isFinite(rate) || rate <= 0) throw new Error(`Missing academic FX for ${currency}`);
  rates[currency] = rate;
}
writeFileSync('src/data/academic-locations.json', JSON.stringify(locations, null, 2) + '\n');
writeFileSync('src/data/academic-fx.json', JSON.stringify({ baseCurrency: 'USD', fetchedAt: fx.time_last_update_utc, provider: 'open.er-api.com', fallback: { KPW: 'worlddata.info, 2026-10-27, official-rate estimate' }, rates }, null, 2) + '\n');
console.log(JSON.stringify({ enabledCountries: countries.length, locations: Object.keys(locations).length, currencies: Object.keys(rates).length }));
