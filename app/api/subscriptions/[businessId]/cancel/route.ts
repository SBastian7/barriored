import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { Subscription } from '@/lib/types/database'

// POST /api/subscriptions/[businessId]/cancel - Cancel active subscription
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const { businessId } = await params
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Parse optional reason from body
    let reason: string | undefined
    try {
      const body = await request.json()
      reason = body.reason
    } catch (e) {
      // Body is optional
    }

    // Verify user owns the business
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, owner_id')
      .eq('id', businessId)
      .single()

    if (businessError || !business) {
      return NextResponse.json(
        { error: 'Negocio no encontrado' },
        { status: 404 }
      )
    }

    if (business.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'No tienes permiso para gestionar este negocio' },
        { status: 403 }
      )
    }

    // Find active subscription for this business
    const { data: subscription, error: subscriptionError } = await supabase
      .from('business_subscriptions')
      .select('*')
      .eq('business_id', businessId)
      .eq('status', 'active')
      .maybeSingle<Subscription>()

    if (subscriptionError) {
      console.error('Error fetching subscription:', subscriptionError)
      return NextResponse.json(
        { error: 'Error al buscar suscripción' },
        { status: 500 }
      )
    }

    if (!subscription) {
      return NextResponse.json(
        { error: 'No tienes una suscripción activa para cancelar' },
        { status: 404 }
      )
    }

    // Cancel subscription
    const { data: cancelledSubscription, error: updateError } = await supabase
      .from('business_subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason || 'Usuario canceló',
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscription.id)
      .select()
      .single<Subscription>()

    if (updateError) {
      console.error('Error cancelling subscription:', updateError)
      return NextResponse.json(
        { error: 'Error al cancelar la suscripción' },
        { status: 500 }
      )
    }

    // Remove premium status from business (immediate downgrade)
    const { error: businessUpdateError } = await supabase
      .from('businesses')
      .update({ is_featured: false })
      .eq('id', businessId)

    if (businessUpdateError) {
      console.error('Error removing premium status:', businessUpdateError)
      // Log error but don't fail - subscription cancellation is primary operation
    }

    return NextResponse.json(
      {
        success: true,
        subscription: cancelledSubscription,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Unexpected error in POST /api/subscriptions/[businessId]/cancel:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
