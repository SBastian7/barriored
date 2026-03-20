import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Subscription } from '@/lib/types/database'

interface SubscriptionStatusResponse {
  subscription: Subscription | null
  isPremium: boolean
}

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
      .select('id, owner_id, community_id, is_featured')
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

    // Get most recent subscription
    const { data: subscription, error: subscriptionError } = await supabase
      .from('business_subscriptions')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // If no subscription exists, that's okay - we'll return null
    // Only throw for actual errors
    if (subscriptionError && subscriptionError.code !== 'PGRST116') {
      throw subscriptionError
    }

    const response: SubscriptionStatusResponse = {
      subscription: subscription || null,
      isPremium: business.is_featured || false
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Get subscription error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
