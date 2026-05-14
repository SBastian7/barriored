import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(6, 'Minimo 6 caracteres'),
})

export const signupSchema = z.object({
  full_name: z.string().min(2, 'Minimo 2 caracteres'),
  email: z.string().email('Email invalido'),
  phone: z.string().optional(),
  password: z.string().min(6, 'Minimo 6 caracteres'),
  community_id: z.string().uuid(),
})

// Phone without + sign: 57XXXXXXXXXX
const colombianPhone = z.string().regex(/^57[0-9]{10}$/, 'Numero colombiano invalido (formato: 57XXXXXXXXXX)')

export const whatsappOtpSendSchema = z.object({
  phone: colombianPhone,
})

// request_id removed — Twilio manages OTP state by phone number
export const whatsappOtpVerifySchema = z.object({
  phone: colombianPhone,
  otp: z.string().length(6, 'Codigo de 6 digitos'),
  // Optional signup metadata — used only when creating a new account
  full_name: z.string().min(2).optional(),
  community_id: z.string().uuid().optional(),
})

export const whatsappOtpLinkSchema = z.object({
  phone: colombianPhone,
  otp: z.string().length(6, 'Codigo de 6 digitos'),
})
