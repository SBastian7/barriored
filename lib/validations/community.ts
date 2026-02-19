import { z } from 'zod'

// Base post schema (shared fields)
const basePostSchema = z.object({
    community_id: z.string().uuid(),
    title: z.string().min(3, 'Minimo 3 caracteres').max(150),
    content: z.string().min(10, 'Minimo 10 caracteres').max(2000),
    image_url: z.string().url().optional().or(z.literal('')),
})

// Announcement: no extra metadata
export const createAnnouncementSchema = basePostSchema.extend({
    type: z.literal('announcement'),
})

// Event: requires date + location
export const createEventSchema = basePostSchema.extend({
    type: z.literal('event'),
    metadata: z.object({
        date: z.string().min(1, 'Fecha requerida'),
        end_date: z.string().optional(),
        location: z.string().min(3, 'Ubicacion requerida'),
        location_coords: z.object({
            lat: z.number(),
            lng: z.number(),
        }).optional(),
    }),
})

// Job: requires category + contact
export const createJobSchema = basePostSchema.extend({
    type: z.literal('job'),
    metadata: z.object({
        category: z.string().min(1, 'Categoria requerida'),
        salary_range: z.string().optional(),
        contact_method: z.enum(['whatsapp', 'phone', 'email']),
        contact_value: z.string().min(1, 'Contacto requerido'),
    }),
})

// Discriminated union for all post types
export const createPostSchema = z.discriminatedUnion('type', [
    createAnnouncementSchema,
    createEventSchema,
    createJobSchema,
])

export type CreatePostInput = z.infer<typeof createPostSchema>

// Alert schema (admin only)
export const createAlertSchema = z.object({
    community_id: z.string().uuid(),
    type: z.enum(['water', 'power', 'security', 'construction', 'general']),
    title: z.string().min(3).max(150),
    description: z.string().max(500).optional(),
    severity: z.enum(['info', 'warning', 'critical']),
    starts_at: z.string().optional(),
    ends_at: z.string().optional(),
})

export type CreateAlertInput = z.infer<typeof createAlertSchema>

// Public service schema (admin only)
export const createServiceSchema = z.object({
    community_id: z.string().uuid(),
    category: z.enum(['emergency', 'health', 'government', 'transport', 'utilities']),
    name: z.string().min(2).max(100),
    description: z.string().max(300).optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    hours: z.string().optional(),
    sort_order: z.number().int().optional(),
})

export type CreateServiceInput = z.infer<typeof createServiceSchema>
