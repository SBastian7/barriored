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

export const whatsappOtpSendSchema = z.object({
  phone: z.string().regex(/^57[0-9]{10}$/, 'Numero colombiano invalido'),
})

export const whatsappOtpVerifySchema = z.object({
  phone: z.string().regex(/^57[0-9]{10}$/),
  otp: z.string().length(6, 'Codigo de 6 digitos'),
  request_id: z.string(),
})
