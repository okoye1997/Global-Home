import { NextResponse } from 'next/server';
import { listCountries } from '@/lib/marketplace';

export async function GET(){try{const items=await listCountries();return NextResponse.json({items:items.map(country=>({code:country.code,name:country.name,iso3:country.iso3,officialName:country.officialName,flagEmoji:country.flagEmoji,flagAssetUrl:country.flagAssetUrl,currencyName:country.currencyName,currencyCode:country.currencyCode,currencySymbol:country.currencySymbol,locale:country.locale,defaultLanguage:country.defaultLanguage,supportedLanguages:country.supportedLanguages,enabled:country.enabled}))});}catch{return NextResponse.json({error:'Countries unavailable'},{status:503});}}
