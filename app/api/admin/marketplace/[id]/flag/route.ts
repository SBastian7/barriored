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
  const { reason } = body

  if (!reason || reason.trim() === '') {
    return NextResponse.json(
      { error: 'Razón requerida' },
      { status: 400 }
    )
  }

  const { data: existing } = await supabase
    .from('classifieds')
    .select('community_id, user_id')
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
      { error: 'No puedes marcar clasificados de otra comunidad' },
      { status: 403 }
    )
  }

  const { error } = await supabase
    .from('classifieds')
    .update({
      status: 'flagged',
      flagged_at: new Date().toISOString(),
      flagged_by: user.id,
      flagged_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    console.error('Error flagging classified:', error)
    return NextResponse.json(
      { error: 'Error al marcar clasificado' },
      { status: 500 }
    )
  }

  // Create content report
  await supabase.from('content_reports').insert({
    community_id: existing.community_id,
    reporter_id: user.id,
    reported_entity_type: 'classified',
    reported_entity_id: id,
    reason: 'inappropriate',
    description: reason,
    status: 'pending',
  })

  // Log to audit trail
  await supabase.from('audit_logs').insert({
    community_id: existing.community_id,
    user_id: user.id,
    action: 'flag_classified',
    entity_type: 'classified',
    entity_id: id,
    metadata: { reason },
  })

  return NextResponse.json({ success: true })
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
    return NextResponse.json({ error: 'No tienes permisos' }, { status: 403 })
  }

  const { error } = await supabase
    .from('classifieds')
    .update({
      status: 'active',
      flagged_at: null,
      flagged_by: null,
      flagged_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    console.error('Error unflagging classified:', error)
    return NextResponse.json(
      { error: 'Error al desmarcar clasificado' },
      { status: 500 }
    )
  }

  // Log to audit trail
  await supabase.from('audit_logs').insert({
    community_id: existing.community_id,
    user_id: user.id,
    action: 'unflag_classified',
    entity_type: 'classified',
    entity_id: id,
  })

  return NextResponse.json({ success: true })
}
