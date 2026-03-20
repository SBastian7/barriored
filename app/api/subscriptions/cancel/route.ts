import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

interface CancelSubscriptionRequest {
  subscriptionId: string
  reason?: string
}

interface BusinessOwner {
  owner_id: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { subscriptionId, reason } = body as CancelSubscriptionRequest

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'Subscription ID required' },
        { status: 400 }
      )
    }

    // Get subscription and verify ownership
    const { data: subscription, error: fetchError } = await supabase
      .from('business_subscriptions')
      .select('id, business_id, status, businesses(owner_id)')
      .eq('id', subscriptionId)
      .single()

    if (fetchError || !subscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      )
    }

    const business = subscription.businesses as unknown as BusinessOwner
    if (business.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    if (subscription.status !== 'active') {
      return NextResponse.json(
        { error: 'Only active subscriptions can be cancelled' },
        { status: 400 }
      )
    }

    // Cancel subscription
    const { error: updateError } = await supabase
      .from('business_subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason || 'Usuario canceló',
        updated_at: new Date().toISOString()
      })
      .eq('id', subscriptionId)

    if (updateError) {
      console.error('Error cancelling subscription:', updateError)
      return NextResponse.json(
        { error: 'Failed to cancel subscription' },
        { status: 500 }
      )
    }

    // Remove premium status from business (immediate downgrade)
    const { error: businessError } = await supabase
      .from('businesses')
      .update({ is_featured: false })
      .eq('id', subscription.business_id)

    if (businessError) {
      console.error('Error removing premium status:', businessError)
      // Log error but don't fail - subscription cancellation is primary operation
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Cancel subscription error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
