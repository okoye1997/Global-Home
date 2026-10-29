import Image from 'next/image';
import { getCountryByCode } from '../lib/country-identity';

export function CountryBadge({ code, compact = false, city }: { code: string; compact?: boolean; city?: string }) {
  const country = getCountryByCode(code);
  if (!country) return <span>{city ? `${city}, ` : ''}{code}</span>;
  return <span className="country-badge" dir="auto"><Image className="country-flag" src={country.flagAssetUrl} width={32} height={24} alt={`${country.name} flag`} unoptimized/><span>{city && <>{city}, </>}{country.name}{!compact && <small>{country.code} · {country.currencyName} ({country.currencyCode} · {country.currencySymbol})</small>}</span></span>;
}
