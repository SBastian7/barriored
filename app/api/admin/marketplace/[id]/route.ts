// @ts-nocheck - Pre-existing admin file with Supabase type inference issues
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { notifyClassifiedSold } from '@/lib/notifications/marketplace'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_super_admin, community_id')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'admin' && profile.role !== 'moderator' && !profile.is_super_admin)) {
    return NextResponse.json({ error: 'No tienes permisos' }, { status: 403 })
  }

  const { data: classified, error } = await supabase
    .from('classifieds')
    .select(
      `
      *,
      profiles!classifieds_user_id_fkey(id, full_name, avatar_url),
      marketplace_categories(id, name, slug, icon),
      communities(id, name, slug)
    `
    )
    .eq('id', id)
    .single()

  if (error || !classified) {
    return NextResponse.json(
      { error: 'Clasificado no encontrado' },
      { status: 404 }
    )
  }

  // Verify community access
  if (
    !profile.is_super_admin &&
    classified.community_id !== profile.community_id
  ) {
    return NextResponse.json(
      { error: 'No puedes ver clasificados de otra comunidad' },
      { status: 403 }
    )
  }

  return NextResponse.json({ classified })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_super_admin, community_id')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'admin' && !profile.is_super_admin)) {
    return NextResponse.json({ error: 'No tienes permisos' }, { status: 403 })
  }

  // Get current classified to verify community
  const { data: existing } = await supabase
    .from('classifieds')
    .select('community_id')
    .eq('id', id)
    .single()

  if (!existing) {
    return NextResponse.json(
      { error: 'Clasificado no encontrado' },
      { status: 404 }
    )
  }

  if (
    !profile.is_super_admin &&
    existing.community_id !== profile.community_id
  ) {
    return NextResponse.json(
      { error: 'No puedes editar clasificados de otra comunidad' },
      { status: 403 }
    )
  }

  const body = await request.json()
  const {
    status,
    title,
    description,
    price,
    category_id,
    whatsapp,
    images,
  } = body

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (status !== undefined) {
    updateData.status = status
    if (status === 'sold') updateData.sold_at = new Date().toISOString()
    if (status === 'archived') updateData.archived_at = new Date().toISOString()
  }
  if (title !== undefined) updateData.title = title
  if (description !== undefined) updateData.description = description
  if (price !== undefined) updateData.price = price
  if (category_id !== undefined) updateData.category_id = category_id
  if (whatsapp !== undefined) updateData.whatsapp = whatsapp
  if (images !== undefined) updateData.images = images

  const { data: updated, error } = await supabase
    .from('classifieds')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating classified:', error)
    return NextResponse.json(
      { error: 'Error al actualizar clasificado' },
      { status: 500 }
    )
  }

  // Notify seller when admin marks as sold
  if (status === 'sold' && updated) {
    notifyClassifiedSold(id, updated.user_id).catch(err =>
      console.error('[admin PATCH] sold notification failed:', err)
    )
  }

  // Log to audit trail
  await supabase.from('audit_logs').insert({
    community_id: existing.community_id,
    user_id: user.id,
    action: 'update_classified',
    entity_type: 'classified',
    entity_id: id,
    new_data: updateData,
    metadata: { admin_role: profile.role },
  })

  return NextResponse.json({ classified: updated })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_super_admin, community_id')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'admin' && !profile.is_super_admin)) {
    return NextResponse.json({ error: 'No tienes permisos' }, { status: 403 })
  }

  const { data: existing } = await supabase
    .from('classifieds')
    .select('community_id')
    .eq('id', id)
    .single()

  if (!existing) {
    return NextResponse.json(
      { error: 'Clasificado no encontrado' },
      { status: 404 }
    )
  }

  if (
    !profile.is_super_admin &&
    existing.community_id !== profile.community_id
  ) {
    return NextResponse.json(
      { error: 'No puedes eliminar clasificados de otra comunidad' },
      { status: 403 }
    )
  }

  // Soft delete - set status to removed
  const { error } = await supabase
    .from('classifieds')
    .update({ status: 'removed', updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    console.error('Error deleting classified:', error)
    return NextResponse.json(
      { error: 'Error al eliminar clasificado' },
      { status: 500 }
    )
  }

  // Log to audit trail
  await supabase.from('audit_logs').insert({
    community_id: existing.community_id,
    user_id: user.id,
    action: 'delete_classified',
    entity_type: 'classified',
    entity_id: id,
    metadata: { admin_role: profile.role },
  })

  return NextResponse.json({ success: true })
}
