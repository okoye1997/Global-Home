import { randomBytes, createHash } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { connectDb } from './db';
import { User } from './models';
export const authCookie='gh_session';
export const adminMfaChallengeCookie='gh_admin_mfa_challenge';
function secret(){const key=process.env.AUTH_SECRET;if(!key||key.length<32)throw new Error('AUTH_SECRET must contain at least 32 characters');return new TextEncoder().encode(key)}
export const hashPassword=(password:string)=>bcrypt.hash(password,12);
export const checkPassword=(password:string,hash:string)=>bcrypt.compare(password,hash);
export const newToken=()=>randomBytes(32).toString('hex');
export const tokenHash=(token:string)=>createHash('sha256').update(token).digest('hex');
export async function issueSession(userId:string,role:string,sessionVersion:number,mfaVerified=false){return new SignJWT({role,sessionVersion,mfaVerified}).setProtectedHeader({alg:'HS256'}).setSubject(userId).setIssuedAt().setExpirationTime('7d').sign(secret())}
export async function issueAdminMfaChallenge(userId:string,sessionVersion:number){return new SignJWT({purpose:'admin-mfa',sessionVersion}).setProtectedHeader({alg:'HS256'}).setSubject(userId).setIssuedAt().setExpirationTime('5m').sign(secret())}
export async function verifyAdminMfaChallenge(token:string){const {payload}=await jwtVerify(token,secret());if(payload.purpose!=='admin-mfa'||!payload.sub||!Number.isSafeInteger(payload.sessionVersion))throw new Error('Invalid admin MFA challenge');return {userId:payload.sub,sessionVersion:payload.sessionVersion as number}}
export async function currentUser(){try{const value=(await cookies()).get(authCookie)?.value;if(!value)return null;const {payload}=await jwtVerify(value,secret());await connectDb();const user=await User.findById(payload.sub).select('-passwordHash').lean();if(!user||(user.sessionVersion||0)!==payload.sessionVersion)return null;if(user.role==='admin'&&(!user.mfaEnabledAt||payload.mfaVerified!==true))return null;return user}catch{return null}}
export async function requireAdmin(){const user=await currentUser();if(!user||user.role!=='admin')throw new Error('Forbidden');return user}
