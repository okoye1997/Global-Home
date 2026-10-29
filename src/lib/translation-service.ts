import { cache } from 'react';
import type { Locale } from './i18n';
import { msg, type Namespace, type TranslationKey } from './messages';
import { connectDb } from './db';
import { Translation } from './models';

export interface TranslationProvider {
  translatePublicContent(input: { text: string; sourceLocale: Locale; targetLocale: Locale }): Promise<string>;
}

const approvedForLocale = cache(async (locale: Locale) => {
  if (!process.env.MONGODB_URI) return new Map<string, string>();
  await connectDb();
  const rows = await Translation.find({ localeCode: locale, status: 'approved' }).select('namespace key value').lean();
  return new Map<string, string>(rows.map(row => [`${row.namespace}.${row.key}`, row.value]));
});

export async function publicTranslation<N extends Namespace>(locale: Locale, namespace: N, key: TranslationKey<N>): Promise<string> {
  const approved = await approvedForLocale(locale);
  return approved.get(`${namespace}.${key}`) ?? msg(locale, namespace, key);
}

export function originalPrivateMessage(body: string): string { return body; }
