import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// CRITICAL FIX #1: Simple in-memory rate limiter to prevent abuse
// Tracks: IP + Business ID -> [timestamps]
// Limit: 10 requests per business per IP per hour
const rateLimitMap = new Map<string, number[]>()
const RATE_LIMIT = 10 // max requests
const RATE_WINDOW = 60 * 60 * 1000 // 1 hour in milliseconds

// Clean up expired entries every 10 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, timestamps] of rateLimitMap.entries()) {
    const validTimestamps = timestamps.filter(t => now - t < RATE_WINDOW)
    if (validTimestamps.length === 0) {
      rateLimitMap.delete(key)
    } else {
      rateLimitMap.set(key, validTimestamps)
    }
  }
}, 10 * 60 * 1000)

function checkRateLimit(ip: string, businessId: string): boolean {
  const key = `${ip}:${businessId}`
  const now = Date.now()

  // Get existing timestamps for this IP+business combination
  const timestamps = rateLimitMap.get(key) || []

  // Filter out expired timestamps (older than 1 hour)
  const validTimestamps = timestamps.filter(t => now - t < RATE_WINDOW)

  // Check if limit exceeded
  if (validTimestamps.length >= RATE_LIMIT) {
    return false // Rate limit exceeded
  }

  // Add current timestamp
  validTimestamps.push(now)
  rateLimitMap.set(key, validTimestamps)

  return true // Request allowed
}

export async function POST(request: NextRequest) {
  try {
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

    // CRITICAL FIX #1: Rate limiting based on IP + business ID
    const ip = request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               'unknown'

    if (!checkRateLimit(ip, businessId)) {
      console.warn(`Rate limit exceeded for IP ${ip} on business ${businessId}`)
      return NextResponse.json(
        { error: 'Rate limit exceeded. Maximum 10 requests per business per hour.' },
        { status: 429 }
      )
    }

    // Verify business exists
    const supabase = await createClient()
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('id', businessId)
      .single()

    if (businessError || !business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    const adminClient = createAdminClient()

    // CRITICAL FIX #2: Use atomic increment function to prevent race conditions
    const { error: incrementError } = await adminClient.rpc(
      'increment_business_analytics',
      {
        p_business_id: businessId,
        p_event_type: eventType
      }
    )

    if (incrementError) {
      console.error('Error incrementing business analytics:', incrementError)
      return NextResponse.json(
        { error: 'Failed to update analytics' },
        { status: 500 }
      )
    }

    // CRITICAL FIX #3: Fail loudly if daily analytics fails
    // Track daily snapshot
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
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
        console.error('CRITICAL: Error updating daily analytics:', dailyError)
        // FAIL LOUDLY - don't silently succeed if daily tracking fails
        return NextResponse.json(
          { error: 'Failed to update daily analytics' },
          { status: 500 }
        )
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
        console.error('CRITICAL: Error inserting daily analytics:', dailyError)
        // FAIL LOUDLY - don't silently succeed if daily tracking fails
        return NextResponse.json(
          { error: 'Failed to insert daily analytics' },
          { status: 500 }
        )
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
