import { readFile, writeFile } from 'node:fs/promises';

// Inputs are the official GeoNames cities15000.txt and admin1CodesASCII.txt exports.
// Derived records retain real city centroids, while listings still describe approximate academic locations.
const base = JSON.parse(await readFile('src/data/academic-locations.json', 'utf8'));
const regions = new Map((await readFile('admin1CodesASCII.txt', 'utf8')).trim().split(/\r?\n/).map(line => {
  const [code, name] = line.split('\t'); return [code, name];
}));
const byCountry = new Map();
for (const line of (await readFile('tmp-academic-cities/cities15000.txt', 'utf8')).trim().split(/\r?\n/)) {
  const columns = line.split('\t');
  const code = columns[8];
  if (!base[code]) continue;
  const city = columns[1];
  const latitude = Number(columns[4]), longitude = Number(columns[5]), population = Number(columns[14]);
  if (!city || !Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
  const region = regions.get(`${code}.${columns[10]}`) || '';
  const list = byCountry.get(code) || [];
  list.push({ city, region, latitude, longitude, population });
  byCountry.set(code, list);
}
const result = {};
for (const [code, original] of Object.entries(base)) {
  const candidates = (byCountry.get(code) || []).sort((a, b) => b.population - a.population);
  const selected = [{ ...original }];
  for (const item of candidates) {
    if (selected.length >= 6) break;
    if (selected.some(existing => existing.city.toLowerCase() === item.city.toLowerCase())) continue;
    selected.push({ city: item.city, region: item.region, latitude: item.latitude, longitude: item.longitude });
  }
  result[code] = selected;
}
await writeFile('src/data/academic-cities.json', `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ countries: Object.keys(result).length, countriesWithMultipleCities: Object.values(result).filter(cities => cities.length > 1).length, totalCityOptions: Object.values(result).reduce((sum, cities) => sum + cities.length, 0) }));
