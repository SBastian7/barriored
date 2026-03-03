import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_super_admin')
    .eq('id', user.id)
    .single<{ role: string; is_super_admin: boolean }>()

  if (!profile || !['admin', 'moderator'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Parse query params
  const { searchParams } = new URL(request.url)
  const communityId = searchParams.get('community_id')
  const entityType = searchParams.get('entity_type')
  const action = searchParams.get('action')
  const userId = searchParams.get('user_id')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  // Build query (RLS handles community filtering automatically)
  let query = supabase
    .from('audit_logs')
    .select(
      `
      *,
      user:profiles!user_id(
        id,
        full_name,
        avatar_url,
        role
      )
    `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (communityId) query = query.eq('community_id', communityId)
  if (entityType) query = query.eq('entity_type', entityType)
  if (action) query = query.eq('action', action)
  if (userId) query = query.eq('user_id', userId)

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    logs: data,
    total: count,
    limit,
    offset,
  })
}

export async function POST(request: Request) {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { action, entity_type, entity_id, old_data, new_data, community_id } =
    body

  // Validate required fields
  if (!action || !entity_type || !entity_id) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    )
  }

  // Get request metadata
  const metadata = {
    ip:
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip'),
    user_agent: request.headers.get('user-agent'),
    timestamp: new Date().toISOString(),
  }

  // Use service role client to bypass RLS for INSERT
  const supabaseAdmin = createAdminClient()

  const { error } = await (supabaseAdmin as any).from('audit_logs').insert({
    community_id,
    user_id: user.id,
    action,
    entity_type,
    entity_id,
    old_data,
    new_data,
    metadata,
  })

  if (error) {
    console.error('Failed to insert audit log:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
