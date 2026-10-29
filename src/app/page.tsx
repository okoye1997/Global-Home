import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { isLocale } from '@/lib/i18n';
export default async function Home() { const preference=(await cookies()).get('gh_locale')?.value||'en';redirect(`/${isLocale(preference)?preference:'en'}`); }
