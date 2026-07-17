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
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Runtime input validation
    let subscriptionId: string
    let reason: string | undefined

    try {
      const body = await request.json()
      subscriptionId = body.subscriptionId
      reason = body.reason

      if (typeof subscriptionId !== 'string' || !subscriptionId) {
        return NextResponse.json(
          { error: 'ID de suscripción requerido' },
          { status: 400 }
        )
      }

      if (reason !== undefined && typeof reason !== 'string') {
        return NextResponse.json(
          { error: 'Razón debe ser texto' },
          { status: 400 }
        )
      }
    } catch (e) {
      return NextResponse.json(
        { error: 'Cuerpo de solicitud inválido' },
        { status: 400 }
      )
    }

    // UUID validation
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!UUID_REGEX.test(subscriptionId)) {
      return NextResponse.json(
        { error: 'ID de suscripción inválido' },
        { status: 400 }
      )
    }

    // Get subscription and verify ownership
    const { data: subscription, error: fetchError } = await supabase
      .from('business_subscriptions')
      .select(`
        id,
        business_id,
        status,
        businesses!inner(owner_id)
      `)
      .eq('id', subscriptionId)
      .single()

    if (fetchError || !subscription) {
      return NextResponse.json(
        { error: 'Suscripción no encontrada' },
        { status: 404 }
      )
    }

    // Type guard for business relation
    if (!subscription.businesses || Array.isArray(subscription.businesses)) {
      return NextResponse.json(
        { error: 'Negocio no encontrado' },
        { status: 404 }
      )
    }

    if (subscription.businesses.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'No tienes permiso para gestionar esta suscripción' },
        { status: 403 }
      )
    }

    if (subscription.status !== 'active') {
      return NextResponse.json(
        { error: 'Solo se pueden cancelar suscripciones activas' },
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
        { error: 'Error al cancelar la suscripción' },
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
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
