import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
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
    return NextResponse.json({ error: 'Forbidden - Super admin only' }, { status: 403 })
  }

  // Parse query params
  const { searchParams } = new URL(request.url)
  const errorType = searchParams.get('error_type')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  let query = supabase
    .from('error_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (errorType) query = query.eq('error_type', errorType)

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    errors: data,
    total: count,
    limit,
    offset,
  })
}

export async function POST(request: Request) {
  const supabase = await createClient()

  // Get current user (may be null for unauthenticated errors)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const body = await request.json()
  const {
    error_type,
    error_message,
    stack_trace,
    request_url,
    request_method,
    status_code,
  } = body

  // Get client metadata
  const metadata = {
    user_agent: request.headers.get('user-agent'),
    referrer: request.headers.get('referer'),
    browser: body.browser,
    device: body.device,
  }

  // Get user's community_id if authenticated
  let communityId = null
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('community_id')
      .eq('id', user.id)
      .single()

    communityId = profile?.community_id || null
  }

  // TODO: Implement rate limiting (Redis or similar)
  // For now, just log it

  const { error } = await supabase.from('error_logs').insert({
    community_id: communityId,
    user_id: user?.id || null,
    error_type,
    error_message,
    stack_trace,
    request_url,
    request_method,
    status_code,
    metadata,
  })

  if (error) {
    console.error('Failed to log error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
