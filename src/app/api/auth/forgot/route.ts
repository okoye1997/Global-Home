import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDb } from '@/lib/db';
import { EmailToken, User } from '@/lib/models';
import { newToken, tokenHash } from '@/lib/auth';
import { sendEmail } from '@/lib/mail';
import { consumeRateLimit } from '@/lib/rate-limit';
import { authEmail } from '@/lib/email-templates';
export async function POST(req:NextRequest){const parsed=z.object({email:z.email()}).safeParse(await req.json());if(!parsed.success)return NextResponse.json({error:'Invalid email'},{status:400});if(!process.env.SMTP_HOST||!process.env.APP_BASE_URL)return NextResponse.json({error:'Email service unavailable'},{status:503});await connectDb();if(!await consumeRateLimit('forgot',parsed.data.email,3,60*60_000))return NextResponse.json({message:'If this email is registered, a reset link has been sent.'});const user=await User.findOne({email:parsed.data.email.toLowerCase()});if(user){const token=newToken();await EmailToken.create({userId:user._id,tokenHash:tokenHash(token),purpose:'reset',expiresAt:new Date(Date.now()+3600000)});const email=authEmail('reset',user.preferredLocale||'en',`${process.env.APP_BASE_URL}/${user.preferredLocale||'en'}/reset-password?token=${token}`);await sendEmail(user.email,email.subject,email.body)}return NextResponse.json({message:'If this email is registered, a reset link has been sent.'})}
