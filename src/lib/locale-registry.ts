import { connectDb } from './db';
import { LocaleConfig } from './models';
import { direction, localeNames, locales } from './i18n';

export type LocaleOption = { code: string; nativeName: string; direction: 'ltr' | 'rtl' };
export async function enabledLocales(): Promise<LocaleOption[]> {
  if (process.env.GH_BUILD_OFFLINE !== '1' && process.env.MONGODB_URI) {
    try {
      await connectDb();
      const rows = await LocaleConfig.find({ enabled: true }).select('localeCode nativeName direction').sort({ localeCode: 1 }).lean();
      if (rows.length) return rows.map(row => ({ code: row.localeCode, nativeName: row.nativeName || row.localeCode, direction: row.direction === 'rtl' ? 'rtl' : 'ltr' }));
    } catch { /* The shell remains available when the database is unavailable. */ }
  }
  return locales.map(code => ({ code, nativeName: localeNames[code], direction: direction(code) }));
}
export async function localeDirection(code: string): Promise<'ltr' | 'rtl'> {
  const available = await enabledLocales();
  return available.find(item => item.code === code)?.direction || direction(code);
}
