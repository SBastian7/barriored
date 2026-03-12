'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { Database } from '@/lib/types/database'

type ClassifiedInsert = Database['public']['Tables']['classifieds']['Insert']
type ClassifiedUpdate = Database['public']['Tables']['classifieds']['Update']

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string }

export async function createClassifiedAction(formData: FormData) {
  const supabase = await createClient()

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'No autenticado' }
  }

  // Get user's community_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('community_id')
    .eq('id', user.id)
    .single()

  if (!profile?.community_id) {
    return { success: false, error: 'Usuario sin comunidad asignada' }
  }

  // Check if user is banned
  const { data: ban } = await supabase
    .from('marketplace_user_bans')
    .select('reason, expires_at')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (ban && (!ban.expires_at || new Date(ban.expires_at) > new Date())) {
    return {
      success: false,
      error: `Estás suspendido del marketplace. Razón: ${ban.reason}`
    }
  }

  // Extract form data
  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const price = (formData.get('price') as string) || null
  const whatsapp = formData.get('whatsapp') as string
  const category_id = formData.get('category_id') as string
  const images = formData.getAll('images') as string[]

  // Validation
  if (!title || title.length < 10 || title.length > 100) {
    return { success: false, error: 'Título debe tener entre 10 y 100 caracteres' }
  }

  if (!description || description.length < 20 || description.length > 1000) {
    return { success: false, error: 'Descripción debe tener entre 20 y 1000 caracteres' }
  }

  if (!whatsapp || !/^\+?57[0-9]{10}$/.test(whatsapp.replace(/\s/g, ''))) {
    return { success: false, error: 'WhatsApp debe ser un número colombiano válido' }
  }

  if (!images || images.length === 0) {
    return { success: false, error: 'Debes subir al menos 1 imagen' }
  }

  if (images.length > 5) {
    return { success: false, error: 'Máximo 5 imágenes permitidas' }
  }

  if (!category_id) {
    return { success: false, error: 'Debes seleccionar una categoría' }
  }

  // Rate limiting check (max 5 per day)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { count } = await supabase
    .from('classifieds')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', today.toISOString())

  if (count && count >= 5) {
    return {
      success: false,
      error: 'Has alcanzado el límite de 5 clasificados por día. Intenta mañana.'
    }
  }

  // Insert classified
  const { data: classified, error } = await supabase
    .from('classifieds')
    .insert({
      community_id: profile.community_id,
      user_id: user.id,
      category_id,
      title,
      description,
      price,
      whatsapp,
      images,
      status: 'active'
    })
    .select()
    .single()

  if (error) {
    console.error('Insert error:', error)
    return { success: false, error: 'Error al crear clasificado' }
  }

  revalidatePath('/dashboard')
  revalidatePath('/[community]/marketplace', 'page')

  redirect('/dashboard?tab=marketplace')
}
