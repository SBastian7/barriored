import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const days = parseInt(searchParams.get('days') || '30')

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check permissions
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_super_admin, community_id')
    .eq('id', user.id)
    .single() as { data: any }

  if (!profile?.is_super_admin && profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    // Calculate date range
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Build query
    let logsQuery = supabase
      .from('push_notification_logs')
      .select('*')
      .gte('sent_at', startDate.toISOString())

    // Filter by community for community admins
    if (!profile.is_super_admin && profile.community_id) {
      logsQuery = logsQuery.eq('community_id', profile.community_id)
    }

    const { data: logs, error } = await logsQuery

    if (error) throw error

    // Calculate overview stats
    const totalSent = logs?.reduce((sum, log) => sum + log.sent_count, 0) || 0
    const totalFailed = logs?.reduce((sum, log) => sum + log.failed_count, 0) || 0
    const deliveryRate = totalSent > 0 ? (totalSent - totalFailed) / totalSent : 0
    const avgPerDay = totalSent / days

    // Get active subscribers count
    const { count: subscriberCount } = await supabase
      .from('push_subscriptions')
      .select('*', { count: 'exact', head: true })
      .not('endpoint', 'is', null)

    // Group by type (from alert_id → community_alerts.type)
    // TODO: Join with community_alerts to get type breakdown

    const overview = {
      total_sent: totalSent,
      delivery_rate: Math.round(deliveryRate * 100) / 100,
      active_subscribers: subscriberCount || 0,
      avg_per_day: Math.round(avgPerDay * 10) / 10,
      trend_vs_previous: 0 // TODO: Calculate vs previous period
    }

    return NextResponse.json({
      overview,
      by_type: [], // TODO: Implement type breakdown
      by_community: [] // TODO: Implement community breakdown
    })
  } catch (error) {
    console.error('Stats error:', error)
    return NextResponse.json({ error: 'Failed to fetch statistics' }, { status: 500 })
  }
}
