import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { Subscription } from '@/lib/types/database'

// GET /api/subscriptions/[businessId] - Fetch subscription status
export async function GET(
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
        { error: 'No tienes permiso para ver este negocio' },
        { status: 403 }
      )
    }

    // Fetch subscription (most recent first)
    const { data: subscription, error: subscriptionError } = await supabase
      .from('business_subscriptions')
      .select('*')
      .eq('business_id', businessId)
      .order('requested_at', { ascending: false })
      .maybeSingle<Subscription>()

    if (subscriptionError) {
      console.error('Error fetching subscription:', subscriptionError)
      return NextResponse.json(
        { error: 'Error al cargar suscripción' },
        { status: 500 }
      )
    }

    // If no subscription found, return 404
    if (!subscription) {
      return NextResponse.json(
        { error: 'No hay suscripción para este negocio' },
        { status: 404 }
      )
    }

    return NextResponse.json({ subscription }, { status: 200 })
  } catch (error) {
    console.error('Unexpected error in GET /api/subscriptions/[businessId]:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// POST /api/subscriptions/[businessId] - Request premium subscription
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

    // Check for existing active subscription
    const { data: activeSubscription, error: activeError } = await supabase
      .from('business_subscriptions')
      .select('id, status')
      .eq('business_id', businessId)
      .eq('status', 'active')
      .maybeSingle()

    if (activeError) {
      console.error('Error checking active subscription:', activeError)
      return NextResponse.json(
        { error: 'Error verificando suscripción' },
        { status: 500 }
      )
    }

    if (activeSubscription) {
      return NextResponse.json(
        { error: 'Ya tienes una suscripción activa' },
        { status: 400 }
      )
    }

    // Check for existing pending request
    const { data: pendingRequest, error: pendingError } = await supabase
      .from('business_subscriptions')
      .select('id, status')
      .eq('business_id', businessId)
      .eq('status', 'requested')
      .maybeSingle()

    if (pendingError) {
      console.error('Error checking pending request:', pendingError)
      return NextResponse.json(
        { error: 'Error verificando solicitud' },
        { status: 500 }
      )
    }

    if (pendingRequest) {
      return NextResponse.json(
        { error: 'Ya tienes una solicitud pendiente' },
        { status: 400 }
      )
    }

    // Create new subscription request
    const { data: subscription, error: createError } = await supabase
      .from('business_subscriptions')
      .insert({
        business_id: businessId,
        status: 'requested',
        requested_at: new Date().toISOString(),
      })
      .select()
      .single<Subscription>()

    if (createError) {
      console.error('Error creating subscription request:', createError)
      return NextResponse.json(
        { error: 'Error creando solicitud de suscripción' },
        { status: 500 }
      )
    }

    return NextResponse.json({ subscription }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in POST /api/subscriptions/[businessId]:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
