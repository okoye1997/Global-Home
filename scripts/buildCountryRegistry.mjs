import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import isoCountries from 'i18n-iso-countries';
import english from 'i18n-iso-countries/langs/en.json' with { type: 'json' };
import cldrCurrencies from 'cldr-core/supplemental/currencyData.json' with { type: 'json' };

isoCountries.registerLocale(english);
const root = resolve(import.meta.dirname, '..');
const registryPath = join(root, 'src/data/countries.json');
const flagsPath = join(root, 'public/flags');
const sourceFlags = join(root, 'node_modules/flag-icons/flags/4x3');
const currencyNames = new Intl.DisplayNames('en', { type: 'currency' });
const supportedLanguages = ['en', 'fr', 'es', 'ar', 'de', 'pt', 'zh', 'ja'];
const today = new Date().toISOString().slice(0, 10);
const rows = JSON.parse(readFileSync(registryPath, 'utf8'));
mkdirSync(flagsPath, { recursive: true });
copyFileSync(join(root, 'node_modules/flag-icons/LICENSE'), join(flagsPath, 'LICENSE'));

for (const row of rows) {
  const code = row.code.toUpperCase();
  const alpha3 = isoCountries.alpha2ToAlpha3(code);
  const flagFile = `${code.toLowerCase()}.svg`;
  if (!alpha3 || !existsSync(join(sourceFlags, flagFile))) throw new Error(`Missing ISO3 or flag asset for ${code}`);
  const activeCurrencies = (cldrCurrencies.supplemental.currencyData.region[code] || [])
    .flatMap(entry => Object.entries(entry))
    .filter(([, period]) => (!period._from || period._from <= today) && (!period._to || period._to > today) && period._tender !== 'false')
    .map(([currency]) => currency);
  if (row.enabled && !activeCurrencies.length) throw new Error(`No current CLDR currency for ${code}`);
  if (activeCurrencies.length === 1 && row.currencyCode !== activeCurrencies[0]) {
    row.currencyCode = activeCurrencies[0];
    row.currencySymbol = new Intl.NumberFormat(`en-${code}`, { style: 'currency', currency: row.currencyCode, currencyDisplay: 'symbol' })
      .formatToParts(1).find(part => part.type === 'currency')?.value || row.currencyCode;
  }
  if (row.enabled && activeCurrencies.length > 1 && !activeCurrencies.includes(row.currencyCode)) throw new Error(`Ambiguous current currency for ${code}: ${activeCurrencies.join(', ')}`);
  if (!/^[A-Z]{3}$/.test(row.currencyCode) && row.enabled) throw new Error(`Missing ISO 4217 currency for ${code}`);
  const flagEmoji = [...code].map(char => String.fromCodePoint(127397 + char.charCodeAt(0))).join('');
  Object.assign(row, {
    officialName: isoCountries.getName(code, 'en', { select: 'official' }) || row.name,
    iso3: alpha3,
    flagEmoji,
    flagAssetUrl: `/flags/${flagFile}`,
    currencyName: currencyNames.of(row.currencyCode) || row.currencyCode,
    defaultLanguage: 'en',
    supportedLanguages,
  });
  copyFileSync(join(sourceFlags, flagFile), join(flagsPath, flagFile));
}
writeFileSync(registryPath, `${JSON.stringify(rows, null, 2)}\n`, 'utf8');
console.log(`Enriched ${rows.length} country/territory records and copied ${rows.length} SVG flags.`);
