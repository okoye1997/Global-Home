import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { currentUser } from '@/lib/auth';
import { AuditEvent, Country } from '@/lib/models';
export async function GET(){const user=await currentUser();if(!user||user.role!=='admin')return NextResponse.json({error:'Forbidden'},{status:403});return NextResponse.json({items:await Country.find().sort({name:1}).lean()})}
export async function PATCH(req:NextRequest){const user=await currentUser();if(!user||user.role!=='admin')return NextResponse.json({error:'Forbidden'},{status:403});const parsed=z.object({code:z.string().regex(/^[A-Z]{2}$/),enabled:z.boolean()}).safeParse(await req.json());if(!parsed.success)return NextResponse.json({error:'Invalid country'},{status:400});await Country.updateOne({code:parsed.data.code},{$set:{enabled:parsed.data.enabled}});await AuditEvent.create({actorId:user._id,action:'country.update',targetType:'Country',metadata:parsed.data});return NextResponse.json({ok:true})}
