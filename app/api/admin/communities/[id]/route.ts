import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logAuditAction } from '@/lib/utils/audit-logger'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check super admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_super_admin) {
    return NextResponse.json(
      { error: 'Forbidden - Super admin only' },
      { status: 403 }
    )
  }

  // Get community with stats
  const { data: community, error } = await supabase
    .from('communities')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Get community staff
  const { data: staff } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, role, created_at')
    .eq('community_id', params.id)
    .in('role', ['admin', 'moderator'])

  // Get stats
  const { data: stats } = await supabase.rpc('get_community_stats', {
    community_uuid: params.id,
  })

  return NextResponse.json({
    community: {
      ...community,
      staff: staff || [],
      stats: stats?.[0] || {},
    },
  })
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check super admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_super_admin) {
    return NextResponse.json(
      { error: 'Forbidden - Super admin only' },
      { status: 403 }
    )
  }

  const body = await request.json()

  // Get old data for audit log
  const { data: oldCommunity } = await supabase
    .from('communities')
    .select('*')
    .eq('id', params.id)
    .single()

  // Update community
  const { data: community, error } = await supabase
    .from('communities')
    .update(body)
    .eq('id', params.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Log audit action
  await logAuditAction({
    action: 'update_community',
    entityType: 'community',
    entityId: params.id,
    oldData: oldCommunity,
    newData: community,
  })

  return NextResponse.json({ community })
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check super admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_super_admin) {
    return NextResponse.json(
      { error: 'Forbidden - Super admin only' },
      { status: 403 }
    )
  }

  // Soft delete (set is_active = false)
  const { error } = await supabase
    .from('communities')
    .update({ is_active: false })
    .eq('id', params.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Log audit action
  await logAuditAction({
    action: 'archive_community',
    entityType: 'community',
    entityId: params.id,
  })

  return NextResponse.json({ success: true })
}
