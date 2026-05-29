import { z } from 'zod'

export const serviceSuggestionSchema = z.object({
  community_id:      z.string().uuid('community_id debe ser UUID'),
  service_name:      z.string().min(2, 'Mínimo 2 caracteres').max(100),
  category:          z.enum(['emergency', 'health', 'utilities']),
  phone:             z.string().min(3, 'Teléfono requerido').max(30),
  address:           z.string().max(200).optional(),
  message:           z.string().max(500).optional(),
  reporter_name:     z.string().max(100).optional(),
  reporter_whatsapp: z.string().max(30).optional(),
})

export const serviceReportSchema = z.object({
  community_id:       z.string().uuid('community_id debe ser UUID'),
  service_id:         z.string().uuid().optional(),
  service_name_hint:  z.string().max(100).optional(),
  message:            z.string().min(5, 'Mínimo 5 caracteres').max(500),
  reporter_name:      z.string().max(100).optional(),
  reporter_whatsapp:  z.string().max(30).optional(),
})

export type ServiceSuggestionInput = z.infer<typeof serviceSuggestionSchema>
export type ServiceReportInput     = z.infer<typeof serviceReportSchema>
