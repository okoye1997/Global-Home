import registry from '../data/countries.json';
import { minorFactor } from './currency';
import { usdBounds, type Purpose } from './pricing';

export type CountryIdentity = (typeof registry)[number];
const byCode = new Map(registry.map(country => [country.code, country]));
export function getCountryByCode(code: string) { return byCode.get(code.toUpperCase()); }
export function getCurrencyForCountry(code: string) { return getCountryByCode(code)?.currencyCode; }
export function getCountryFlag(code: string) { const country=getCountryByCode(code); return country ? { emoji: country.flagEmoji, assetUrl: country.flagAssetUrl } : undefined; }
export function getCountryDisplayName(code: string) { return getCountryByCode(code)?.name || code; }
export function getCurrencyDisplayName(currencyCode: string, locale = 'en') { return new Intl.DisplayNames(locale, { type: 'currency' }).of(currencyCode) || currencyCode; }
export function validatePropertyCurrency(countryCode: string, currencyCode: string) { return getCurrencyForCountry(countryCode) === currencyCode; }
export function formatPropertyPrice(minor: number, currencyCode: string, locale: string) {
  const formatted = new Intl.NumberFormat(locale, { style: 'currency', currency: currencyCode, currencyDisplay: 'symbol' }).format(minor / minorFactor(currencyCode));
  return formatted.includes(currencyCode) ? formatted : `${formatted} ${currencyCode}`;
}
export function convertUsdReferenceRangeToLocalCurrency(purpose: Purpose, rate: number, currencyCode: string) {
  if (!Number.isFinite(rate) || rate <= 0) throw new Error('Invalid FX rate');
  const [min, max] = usdBounds[purpose];
  return { minMinor: Math.round(min * rate * minorFactor(currencyCode)), maxMinor: Math.round(max * rate * minorFactor(currencyCode)) };
}
export function searchCountries(query: string, countries: readonly CountryIdentity[] = registry) {
  const search = query.trim().toLocaleLowerCase();
  return countries.filter(country => country.enabled && (!search || [country.name,country.officialName,country.code,country.iso3,country.currencyName,country.currencyCode].some(value => value.toLocaleLowerCase().includes(search))));
}
