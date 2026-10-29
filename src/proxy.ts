import { NextRequest, NextResponse } from 'next/server';
import { isLocale } from '@/lib/i18n';
export function proxy(req:NextRequest){const segment=req.nextUrl.pathname.split('/')[1];const headers=new Headers(req.headers);headers.set('x-gh-locale',isLocale(segment)?segment:'en');return NextResponse.next({request:{headers}})}
export const config={matcher:['/((?!api|_next|favicon.ico).*)']};
