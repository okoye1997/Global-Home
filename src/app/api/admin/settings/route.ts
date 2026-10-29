import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { currentUser } from '@/lib/auth';
import { AdminSettings, AuditEvent } from '@/lib/models';
const schema=z.object({displayName:z.string().min(2).max(100),supportEmail:z.email(),whatsAppNumber:z.string().regex(/^\+?[1-9]\d{7,14}$/),supportHours:z.string().max(100).optional()});
export async function GET(){const user=await currentUser();if(!user||user.role!=='admin')return NextResponse.json({error:'Forbidden'},{status:403});return NextResponse.json({settings:await AdminSettings.findOne({key:'global'}).lean()})}
export async function PUT(req:NextRequest){const user=await currentUser();if(!user||user.role!=='admin')return NextResponse.json({error:'Forbidden'},{status:403});const parsed=schema.safeParse(await req.json());if(!parsed.success)return NextResponse.json({error:'Invalid settings'},{status:400});await AdminSettings.updateOne({key:'global'},{$set:parsed.data},{upsert:true});await AuditEvent.create({actorId:user._id,action:'settings.update',targetType:'AdminSettings'});return NextResponse.json({ok:true})}
