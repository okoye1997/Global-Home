import { notFound, redirect } from 'next/navigation';
import { isLocale } from '@/lib/i18n';

const categories: Record<string, Record<string, string>> = {
  buy: { purpose: 'buy' }, rent: { purpose: 'rent' }, lease: { purpose: 'lease' }, invest: { purpose: 'invest' },
  lands: { type: 'land' }, hotels: { type: 'hotel' }, 'event-centres': { type: 'event-centre' },
  commercial: { type: 'commercial' }, 'new-developments': { type: 'new-development' },
};
export default async function CategoryPage({ params, searchParams }: { params: Promise<{ locale:string; category:string }>; searchParams: Promise<Record<string,string|string[]|undefined>> }) {
  const { locale, category } = await params;
  if (!isLocale(locale) || !categories[category]) notFound();
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) if (typeof value === 'string' && key !== 'purpose' && key !== 'type') query.set(key,value);
  for (const [key,value] of Object.entries(categories[category])) query.set(key,value);
  redirect(`/${locale}/properties?${query}`);
}
