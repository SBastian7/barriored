import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { businessId, eventType } = body as {
      businessId: string
      eventType: 'profile_view' | 'whatsapp_click'
    }

    // Validate input
    if (!businessId || !eventType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!['profile_view', 'whatsapp_click'].includes(eventType)) {
      return NextResponse.json(
        { error: 'Invalid event type' },
        { status: 400 }
      )
    }

    // Verify business exists and get current analytics
    const columnName = eventType === 'profile_view'
      ? 'total_profile_views'
      : 'total_whatsapp_clicks'

    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select(`id, ${columnName}`)
      .eq('id', businessId)
      .single()

    if (businessError || !business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

    // Increment rolling counter on businesses table using admin client to bypass RLS
    const adminClient = createAdminClient()
    const currentValue = business[columnName as keyof typeof business] as number || 0
    const { error: updateError } = await adminClient
      .from('businesses')
      .update({
        [columnName]: currentValue + 1,
        last_analytics_update: new Date().toISOString()
      })
      .eq('id', businessId)

    if (updateError) {
      console.error('Error updating business analytics:', updateError)
      return NextResponse.json(
        { error: 'Failed to update analytics' },
        { status: 500 }
      )
    }

    // Upsert daily snapshot using admin client
    const dailyColumn = eventType === 'profile_view'
      ? 'profile_views'
      : 'whatsapp_clicks'

    // Check if record exists for today
    const { data: existing } = await adminClient
      .from('business_analytics_daily')
      .select('id, profile_views, whatsapp_clicks')
      .eq('business_id', businessId)
      .eq('date', today)
      .single()

    if (existing) {
      // Update existing record
      const { error: dailyError } = await adminClient
        .from('business_analytics_daily')
        .update({
          [dailyColumn]: existing[dailyColumn] + 1
        })
        .eq('id', existing.id)

      if (dailyError) {
        console.error('Error updating daily analytics:', dailyError)
      }
    } else {
      // Insert new record
      const { error: dailyError } = await adminClient
        .from('business_analytics_daily')
        .insert({
          business_id: businessId,
          date: today,
          [dailyColumn]: 1
        })

      if (dailyError) {
        console.error('Error inserting daily analytics:', dailyError)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Analytics tracking error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
