import { z } from 'zod'

const colombianPhone = z.string().regex(/^57[0-9]{10}$/, 'Numero colombiano invalido (57XXXXXXXXXX)')

export const createBusinessSchema = z.object({
  community_id: z.string().uuid(),
  category_id: z.string().uuid(),
  name: z.string().min(2, 'Minimo 2 caracteres').max(100),
  description: z.string().max(500).optional(),
  address: z.string().min(5).max(200),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  phone: z.string().optional(),
  whatsapp: colombianPhone,
  email: z.string().email().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
  hours: z.record(z.string(), z.object({
    open: z.string(),
    close: z.string(),
  })).optional(),
  photos: z.array(z.string().url()).max(5).optional(),
})

export const updateBusinessSchema = createBusinessSchema.partial().omit({ community_id: true })

export type CreateBusinessInput = z.infer<typeof createBusinessSchema>
export type UpdateBusinessInput = z.infer<typeof updateBusinessSchema>
