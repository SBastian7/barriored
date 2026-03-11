import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
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

  const body = await request.json()
  const { reason, expires_at } = body

  if (!reason || reason.trim() === '') {
    return NextResponse.json({ error: 'Razón requerida' }, { status: 400 })
  }

  // Get classified to find user
  const { data: classified } = await supabase
    .from('classifieds')
    .select('user_id, community_id')
    .eq('id', id)
    .single()

  if (!classified) {
    return NextResponse.json(
      { error: 'Clasificado no encontrado' },
      { status: 404 }
    )
  }

  if (
    !profile.is_super_admin &&
    classified.community_id !== profile.community_id
  ) {
    return NextResponse.json({ error: 'No tienes permisos' }, { status: 403 })
  }

  // Create ban record
  const { error: banError } = await supabase
    .from('marketplace_user_bans')
    .insert({
      community_id: classified.community_id,
      user_id: classified.user_id,
      banned_by: user.id,
      reason,
      expires_at: expires_at || null,
      is_active: true,
    })

  if (banError) {
    console.error('Error creating ban:', banError)
    return NextResponse.json(
      { error: 'Error al suspender usuario' },
      { status: 500 }
    )
  }

  // Remove all user's active classifieds
  const { data: userClassifieds, error: fetchError } = await supabase
    .from('classifieds')
    .select('id')
    .eq('user_id', classified.user_id)
    .eq('community_id', classified.community_id)
    .in('status', ['active', 'flagged'])

  if (!fetchError && userClassifieds) {
    for (const c of userClassifieds) {
      await supabase
        .from('classifieds')
        .update({ status: 'removed', updated_at: new Date().toISOString() })
        .eq('id', c.id)

      // Log each removal
      await supabase.from('audit_logs').insert({
        community_id: classified.community_id,
        user_id: user.id,
        action: 'remove_classified_on_ban',
        entity_type: 'classified',
        entity_id: c.id,
        metadata: { banned_user_id: classified.user_id },
      })
    }
  }

  // Log ban action
  await supabase.from('audit_logs').insert({
    community_id: classified.community_id,
    user_id: user.id,
    action: 'ban_marketplace_user',
    entity_type: 'user',
    entity_id: classified.user_id,
    metadata: { reason, expires_at, classifieds_removed: userClassifieds?.length || 0 },
  })

  return NextResponse.json({
    success: true,
    classifieds_removed: userClassifieds?.length || 0,
  })
}
