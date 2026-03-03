import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logAuditAction } from '@/lib/utils/audit-logger'

export async function POST(
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
  const { user_id, role } = body

  // Validate role
  if (!['admin', 'moderator'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  // Update user's profile
  const { error } = await supabase
    .from('profiles')
    .update({
      community_id: params.id,
      role,
    })
    .eq('id', user_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Log audit action
  await logAuditAction({
    action: 'assign_role',
    entityType: 'user',
    entityId: user_id,
    newData: { role, community_id: params.id },
    communityId: params.id,
  })

  return NextResponse.json({ success: true })
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

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('user_id')

  if (!userId) {
    return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })
  }

  // Get old data for audit log
  const { data: oldProfile } = await supabase
    .from('profiles')
    .select('role, community_id')
    .eq('id', userId)
    .single()

  // Reset to regular user
  const { error } = await supabase
    .from('profiles')
    .update({
      community_id: null,
      role: 'user',
    })
    .eq('id', userId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Log audit action
  await logAuditAction({
    action: 'assign_role',
    entityType: 'user',
    entityId: userId,
    oldData: oldProfile,
    newData: { role: 'user', community_id: null },
  })

  return NextResponse.json({ success: true })
}
