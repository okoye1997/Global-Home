import { NextRequest, NextResponse } from 'next/server';
import { isLocale } from '@/lib/i18n';
import { currentUser } from '@/lib/auth';
import { User } from '@/lib/models';
import { enabledLocales } from '@/lib/locale-registry';
export async function GET(req: NextRequest) {
  const locale = req.nextUrl.searchParams.get('locale');
  const country = req.nextUrl.searchParams.get('country');
  const requestedPath = req.nextUrl.searchParams.get('returnTo') || '/en';
  const safePath = requestedPath.startsWith('/') && !requestedPath.startsWith('//') ? requestedPath : '/en';
  const response = NextResponse.redirect(new URL(safePath, req.url));
  if (locale && isLocale(locale)) {
    const user = await currentUser();
    if (user) await User.updateOne({ _id: user._id }, { $set: { preferredLocale: locale } });
    response.cookies.set('gh_locale', locale, { sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 365 });
  }
  if (country !== null && (country === '' || /^[A-Z]{2}$/.test(country))) {
    response.cookies.set('gh_country', country, { sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 365 });
  }
  return response;
}
export async function POST(req: NextRequest) {
  const data = await req.json() as { locale?: string; country?: string };
  if (data.locale !== undefined && (!isLocale(data.locale) || !(await enabledLocales()).some(item => item.code === data.locale))) return NextResponse.json({ error: 'Invalid locale' }, { status: 400 });
  if (data.country !== undefined && data.country !== '' && !/^[A-Z]{2}$/.test(data.country)) return NextResponse.json({ error: 'Invalid country' }, { status: 400 });
  const response = NextResponse.json({ ok: true });
  if (data.locale !== undefined) {
    const user = await currentUser();
    if (user) await User.updateOne({ _id: user._id }, { $set: { preferredLocale: data.locale } });
    response.cookies.set('gh_locale', data.locale, { sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 365 });
  }
  if (data.country !== undefined) response.cookies.set('gh_country', data.country, { sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 365 });
  return response;
}
