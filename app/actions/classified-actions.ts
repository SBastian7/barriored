'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { Database } from '@/lib/types/database'
import { checkProhibitedKeywords } from '@/lib/moderation/marketplace-keywords'
import { notifyClassifiedSold } from '@/lib/notifications/marketplace'

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

  // Prohibited keyword check
  const prohibitedMatch = checkProhibitedKeywords(`${title} ${description}`)
  if (prohibitedMatch) {
    return {
      success: false,
      error: `Contenido no permitido: "${prohibitedMatch}". Este tipo de artículo no puede publicarse en el marketplace.`
    }
  }

  // Duplicate detection
  const { data: duplicate } = await supabase
    .from('classifieds')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .ilike('title', title)
    .maybeSingle()

  if (duplicate) {
    return {
      success: false,
      error: 'Ya tienes un clasificado activo con ese título. Edita el existente o elige un título diferente.'
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

export async function updateClassifiedAction(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient()

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'No autenticado' }
  }

  // Verify ownership
  const { data: existing } = await supabase
    .from('classifieds')
    .select('user_id, community_id')
    .eq('id', id)
    .single()

  if (!existing || existing.user_id !== user.id) {
    return { success: false, error: 'No tienes permiso para modificar este clasificado' }
  }

  // Extract form data
  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const price = (formData.get('price') as string) || null
  const whatsapp = formData.get('whatsapp') as string
  const category_id = formData.get('category_id') as string
  const images = formData.getAll('images') as string[]

  // Validation (same as create)
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
    return { success: false, error: 'Debes tener al menos 1 imagen' }
  }

  if (images.length > 5) {
    return { success: false, error: 'Máximo 5 imágenes permitidas' }
  }

  // Prohibited keyword check
  const prohibitedMatch = checkProhibitedKeywords(`${title} ${description}`)
  if (prohibitedMatch) {
    return {
      success: false,
      error: `Contenido no permitido: "${prohibitedMatch}". Actualiza el texto y vuelve a intentarlo.`
    }
  }

  // Update classified
  const { error } = await supabase
    .from('classifieds')
    .update({
      title,
      description,
      price,
      whatsapp,
      category_id,
      images,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)

  if (error) {
    console.error('Update error:', error)
    return { success: false, error: 'Error al actualizar clasificado' }
  }

  revalidatePath('/dashboard')
  revalidatePath(`/[community]/marketplace/${id}`, 'page')

  return { success: true }
}

export async function deleteClassifiedAction(id: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'No autenticado' }
  }

  // RLS will prevent deleting if not owner, but check anyway for better error message
  const { data: existing } = await supabase
    .from('classifieds')
    .select('user_id')
    .eq('id', id)
    .single()

  if (!existing || existing.user_id !== user.id) {
    return { success: false, error: 'No tienes permiso para eliminar este clasificado' }
  }

  const { error } = await supabase
    .from('classifieds')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Delete error:', error)
    return { success: false, error: 'Error al eliminar clasificado' }
  }

  revalidatePath('/dashboard')
  revalidatePath('/[community]/marketplace', 'page')

  return { success: true }
}

export async function markAsSoldAction(id: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'No autenticado' }
  }

  const { error } = await supabase
    .from('classifieds')
    .update({
      status: 'sold',
      sold_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Mark sold error:', error)
    return { success: false, error: 'Error al marcar como vendido' }
  }

  // Fire-and-forget: notify seller
  notifyClassifiedSold(id, user.id).catch(err =>
    console.error('[markAsSoldAction] notification failed:', err)
  )

  revalidatePath('/dashboard')
  revalidatePath('/[community]/marketplace', 'page')

  return { success: true }
}

export async function reactivateClassifiedAction(id: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'No autenticado' }
  }

  const { error } = await supabase
    .from('classifieds')
    .update({
      status: 'active',
      last_activity_at: new Date().toISOString(),
      sold_at: null,
      archived_at: null,
      renewal_reminder_sent_at: null
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Reactivate error:', error)
    return { success: false, error: 'Error al reactivar clasificado' }
  }

  revalidatePath('/dashboard')
  revalidatePath('/[community]/marketplace', 'page')

  return { success: true }
}

export async function toggleFavoriteAction(
  classifiedId: string
): Promise<ActionResult<{ favorited: boolean }>> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Debes iniciar sesión para guardar favoritos' }
  }

  // Check if already favorited
  const { data: existing } = await supabase
    .from('classified_favorites')
    .select('id')
    .eq('user_id', user.id)
    .eq('classified_id', classifiedId)
    .maybeSingle()

  if (existing) {
    // Remove favorite
    const { error } = await supabase
      .from('classified_favorites')
      .delete()
      .eq('id', existing.id)

    if (error) {
      console.error('Remove favorite error:', error)
      return { success: false, error: 'Error al eliminar favorito' }
    }

    revalidatePath('/dashboard')
    return { success: true, data: { favorited: false } }
  } else {
    // Add favorite
    const { error } = await supabase
      .from('classified_favorites')
      .insert({
        user_id: user.id,
        classified_id: classifiedId
      })

    if (error) {
      console.error('Add favorite error:', error)
      return { success: false, error: 'Error al guardar favorito' }
    }

    revalidatePath('/dashboard')
    return { success: true, data: { favorited: true } }
  }
}
