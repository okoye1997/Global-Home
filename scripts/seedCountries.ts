import { connectDb } from '../src/lib/db';
import { Country, LocaleConfig, Property } from '../src/lib/models';
import countries from '../src/data/countries.json';
import { direction, localeNames, locales } from '../src/lib/i18n';
import isoCountries from 'country-list';
import { loadEnvConfig } from '@next/env';
import { explicitDatabaseName } from '../src/lib/db-target';
loadEnvConfig(process.cwd());
async function main() { explicitDatabaseName(process.env.MONGODB_URI,process.env.MONGODB_DB_NAME);const missing=isoCountries.getCodes().filter(code=>!countries.some(country=>country.code===code));if(missing.length)throw new Error(`Missing ISO country codes: ${missing.join(', ')}`);await connectDb(); for(const country of countries) {const current=await Country.findOne({code:country.code}).select('currencyCode').lean();if(current?.currencyCode!==country.currencyCode&&current&&await Property.exists({countryCode:country.code,currencyCode:{$ne:country.currencyCode}}))throw new Error(`Review ${country.code} listings before changing currency from ${current.currencyCode} to ${country.currencyCode}`);}for(const country of countries) {const {enabled,...metadata}=country;await Country.updateOne({code:country.code},{$set:metadata,$setOnInsert:{enabled}},{upsert:true});} for(const locale of locales) await LocaleConfig.updateOne({localeCode:locale},{$setOnInsert:{localeCode:locale,languageName:localeNames[locale],nativeName:localeNames[locale],direction:direction(locale),enabled:true,fallbackLocale:'en',translationVersion:1}},{upsert:true}); console.log(`Seeded ${countries.length} country configurations and ${locales.length} locales while preserving existing country availability settings.`); }
main().then(()=>process.exit(0)).catch(error=>{console.error(error);process.exit(1)});
