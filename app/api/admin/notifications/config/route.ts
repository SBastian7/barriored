import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const communityId = searchParams.get('community_id')

  if (!communityId) {
    return NextResponse.json({ error: 'community_id required' }, { status: 400 })
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check permissions
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_super_admin, community_id')
    .eq('id', user.id)
    .single()

  const canAccess = profile?.is_super_admin ||
    (profile?.role === 'admin' && profile?.community_id === communityId)

  if (!canAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    // Fetch config
    const { data: config, error } = await supabase
      .from('push_notification_config')
      .select('*')
      .eq('community_id', communityId)
      .single()

    // If no config exists, return defaults
    if (error && error.code === 'PGRST116') {
      return NextResponse.json({
        community_id: communityId,
        is_enabled: true,
        max_per_day: 10,
        current_count_today: 0,
        test_mode: false
      })
    }

    if (error) throw error

    // Get current count today
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const { count } = await supabase
      .from('push_notification_logs')
      .select('*', { count: 'exact', head: true })
      .eq('community_id', communityId)
      .gte('sent_at', startOfDay.toISOString())

    return NextResponse.json({
      ...config,
      current_count_today: count || 0
    })
  } catch (error) {
    console.error('Config fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { community_id, is_enabled, max_per_day } = body

    if (!community_id) {
      return NextResponse.json({ error: 'community_id required' }, { status: 400 })
    }

    // Validate max_per_day
    if (max_per_day && (max_per_day < 1 || max_per_day > 50)) {
      return NextResponse.json({ error: 'max_per_day must be between 1 and 50' }, { status: 400 })
    }

    // Check permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_super_admin, community_id')
      .eq('id', user.id)
      .single()

    const canAccess = profile?.is_super_admin ||
      (profile?.role === 'admin' && profile?.community_id === community_id)

    if (!canAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Upsert config
    const { data, error } = await supabase
      .from('push_notification_config')
      .upsert({
        community_id,
        is_enabled: is_enabled ?? true,
        max_per_day: max_per_day ?? 10,
        updated_at: new Date().toISOString()
      }, { onConflict: 'community_id' })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Config update error:', error)
    return NextResponse.json({ error: 'Failed to update config' }, { status: 500 })
  }
}
