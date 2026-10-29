import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDb } from '@/lib/db';
import { EmailToken, User } from '@/lib/models';
import { hashPassword, tokenHash } from '@/lib/auth';
export async function POST(req:NextRequest){const parsed=z.object({token:z.string().regex(/^[a-f0-9]{64}$/),password:z.string().min(12).max(128)}).safeParse(await req.json());if(!parsed.success)return NextResponse.json({error:'Invalid request'},{status:400});await connectDb();const record=await EmailToken.findOneAndDelete({tokenHash:tokenHash(parsed.data.token),purpose:'reset',expiresAt:{$gt:new Date()}});if(!record)return NextResponse.json({error:'Expired or invalid token'},{status:400});await User.updateOne({_id:record.userId},{$set:{passwordHash:await hashPassword(parsed.data.password)},$inc:{sessionVersion:1}});return NextResponse.json({ok:true})}
