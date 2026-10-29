import { NextRequest, NextResponse } from 'next/server';
import { connectDb } from '@/lib/db';
import { EmailToken, User } from '@/lib/models';
import { tokenHash } from '@/lib/auth';
import { notifyAccount } from '@/lib/notification-service';
export async function GET(req:NextRequest){const token=req.nextUrl.searchParams.get('token');if(!token||!/^[a-f0-9]{64}$/.test(token))return NextResponse.json({error:'Invalid token'},{status:400});await connectDb();const record=await EmailToken.findOneAndDelete({tokenHash:tokenHash(token),purpose:'verify',expiresAt:{$gt:new Date()}});if(!record)return NextResponse.json({error:'Expired or invalid token'},{status:400});const user=await User.findByIdAndUpdate(record.userId,{$set:{emailVerifiedAt:new Date()}},{new:true}).select('email preferredLocale').lean();if(user)await notifyAccount({userId:String(user._id),email:user.email,locale:user.preferredLocale||'en',key:'account.welcome',emailKind:'welcome'});return NextResponse.redirect(new URL(`/${user?.preferredLocale||'en'}/login?verified=1`,req.url))}
