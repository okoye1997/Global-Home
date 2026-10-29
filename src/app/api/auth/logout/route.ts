import { NextResponse } from 'next/server';
import { adminMfaChallengeCookie, authCookie } from '@/lib/auth';
export async function POST(){const response=NextResponse.json({ok:true});response.cookies.set(authCookie,'',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:0});response.cookies.set(adminMfaChallengeCookie,'',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/api/auth',maxAge:0});return response}
