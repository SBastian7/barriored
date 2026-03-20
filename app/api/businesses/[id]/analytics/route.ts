import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { AnalyticsSummary } from '@/lib/types/database'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { id: businessId } = await params

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify user owns business or is admin
    const { data: business } = await supabase
      .from('businesses')
      .select('id, owner_id, community_id, total_profile_views, total_whatsapp_clicks, last_analytics_update')
      .eq('id', businessId)
      .single()

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role, is_super_admin, community_id')
      .eq('id', user.id)
      .single()

    const isOwner = business.owner_id === user.id
    const isAdmin = profile?.role === 'admin' && profile.community_id === business.community_id
    const isSuperAdmin = profile?.is_super_admin === true

    if (!isOwner && !isAdmin && !isSuperAdmin) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Get last 7 days of daily analytics
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: daily } = await supabase
      .from('business_analytics_daily')
      .select('*')
      .eq('business_id', businessId)
      .gte('date', sevenDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: true })

    // Format for chart
    const labels: string[] = []
    const views: number[] = []
    const clicks: number[] = []

    // Fill in missing days with zeros
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateString = date.toISOString().split('T')[0]

      const dayData = daily?.find(d => d.date === dateString)

      labels.push(new Date(dateString).toLocaleDateString('es-CO', {
        month: 'short',
        day: 'numeric'
      }))
      views.push(dayData?.profile_views || 0)
      clicks.push(dayData?.whatsapp_clicks || 0)
    }

    const response: AnalyticsSummary = {
      totals: {
        profileViews: business.total_profile_views || 0,
        whatsappClicks: business.total_whatsapp_clicks || 0,
        lastUpdated: business.last_analytics_update
      },
      daily: daily || [],
      chartData: {
        labels,
        views,
        clicks
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Business analytics error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
