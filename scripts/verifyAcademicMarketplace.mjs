import { readFileSync } from 'node:fs';

const base = process.env.GH_VERIFY_BASE_URL || 'http://localhost:3100';
const countries = JSON.parse(readFileSync('src/data/countries.json', 'utf8')).filter(item => item.enabled);
const failures = [];
let checked = 0;
async function verifyCountry(country) {
  const response = await fetch(`${base}/api/properties?country=${country.code}`, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`${country.code}: HTTP ${response.status}`);
  const data = await response.json();
  if (data.total < 100 || data.items.length !== 24 || data.currencyCode !== country.currencyCode || data.items.some(item => item.countryCode !== country.code || !item.cover?.url?.startsWith('/images/academic/') || 'isDemo' in item || 'sourceProvider' in item || item.verificationStatus === 'sample')) throw new Error(`${country.code}: inventory, currency, media or public-metadata mismatch`);
  checked++;
}
for (let offset = 0; offset < countries.length; offset += 8) {
  await Promise.all(countries.slice(offset, offset + 8).map(async country => { try { await verifyCountry(country); } catch (error) { failures.push(error instanceof Error ? error.message : country.code); } }));
}
const extra = [
  ['/api/properties?country=NG&page=5', data => data.total === 100 && data.items.length === 4],
  ['/api/properties?country=NG&purpose=rent', data => data.total === 25],
  ['/api/properties?country=US&type=house', data => data.total > 0 && data.items.every(item => item.propertyType === 'house')],
  ['/api/properties?country=JP&maxPrice=0', data => data.total === 0],
];
for (const [path, check] of extra) {
  try { const response = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(20000) }); if (!response.ok || !check(await response.json())) failures.push(`${path}: failed`); }
  catch { failures.push(`${path}: request failed`); }
}
console.log(JSON.stringify({ checkedCountries: checked, enabledCountries: countries.length, extraFilters: extra.length, failures }));
if (failures.length) process.exitCode = 1;
