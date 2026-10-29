import { z } from 'zod';
import { isValidPhoneNumber } from 'libphonenumber-js';
export const registerSchema=z.object({fullName:z.string().min(2).max(120),email:z.email().max(320),phone:z.string().regex(/^\+[1-9]\d{7,14}$/).refine(value=>isValidPhoneNumber(value),{message:'Invalid international phone number'}),countryCode:z.string().regex(/^[A-Z]{2}$/),password:z.string().min(12).max(128),confirmPassword:z.string().min(12).max(128),termsConsent:z.literal(true),locale:z.string().regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/).default('en')}).refine(value=>value.password===value.confirmPassword,{path:['confirmPassword'],message:'Passwords do not match'});
export const loginSchema=z.object({email:z.email(),password:z.string().min(1)});
export const adminMfaSchema=z.object({mfaCode:z.string().regex(/^\d{6}$/)});
