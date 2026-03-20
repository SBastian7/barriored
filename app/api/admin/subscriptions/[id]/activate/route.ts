import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Database } from '@/lib/types/database'

type SubscriptionUpdate = Database['public']['Tables']['business_subscriptions']['Update']
type PaymentInsert = Database['public']['Tables']['subscription_payments']['Insert']

interface ActivateSubscriptionRequest {
  activatedAt: string
  expiresAt: string
  paymentAmount: number
  paymentMethod: string
  paymentProofUrl?: string
  notes?: string
}

// Helper to validate UUID format
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

// Helper to validate ISO date string
function isValidISODate(dateString: string): boolean {
  const date = new Date(dateString)
  return !isNaN(date.getTime()) && dateString === date.toISOString()
}

// Type guard for subscription with business community_id
interface SubscriptionWithBusiness {
  id: string
  business_id: string
  status: string
  businesses: {
    community_id: string
  }
}

function hasBusinessCommunity(data: unknown): data is SubscriptionWithBusiness {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'business_id' in data &&
    'businesses' in data &&
    typeof (data as { businesses: unknown }).businesses === 'object' &&
    (data as { businesses: unknown }).businesses !== null &&
    'community_id' in (data as { businesses: object }).businesses &&
    typeof (data as { businesses: { community_id: unknown } }).businesses.community_id === 'string'
  )
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: subscriptionId } = await params

    // Validate UUID format
    if (!isValidUUID(subscriptionId)) {
      return NextResponse.json(
        { error: 'ID de suscripción inválido' },
        { status: 400 }
      )
    }

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    // Verify user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_super_admin, community_id')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'admin' && !profile.is_super_admin)) {
      return NextResponse.json(
        { error: 'Acceso denegado - Se requieren permisos de administrador' },
        { status: 403 }
      )
    }

    // Parse and validate request body
    const body = await request.json() as Partial<ActivateSubscriptionRequest>

    if (!body.activatedAt || !body.expiresAt || !body.paymentAmount || !body.paymentMethod) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: activatedAt, expiresAt, paymentAmount, paymentMethod' },
        { status: 400 }
      )
    }

    // Validate date formats
    if (!isValidISODate(body.activatedAt)) {
      return NextResponse.json(
        { error: 'Formato de fecha inválido para activatedAt (debe ser ISO 8601)' },
        { status: 400 }
      )
    }

    if (!isValidISODate(body.expiresAt)) {
      return NextResponse.json(
        { error: 'Formato de fecha inválido para expiresAt (debe ser ISO 8601)' },
        { status: 400 }
      )
    }

    // Validate payment amount is positive
    if (typeof body.paymentAmount !== 'number' || body.paymentAmount <= 0) {
      return NextResponse.json(
        { error: 'El monto del pago debe ser un número positivo' },
        { status: 400 }
      )
    }

    // Validate payment method is non-empty string
    if (typeof body.paymentMethod !== 'string' || body.paymentMethod.trim() === '') {
      return NextResponse.json(
        { error: 'El método de pago no puede estar vacío' },
        { status: 400 }
      )
    }

    const {
      activatedAt,
      expiresAt,
      paymentAmount,
      paymentMethod,
      paymentProofUrl,
      notes
    } = body as ActivateSubscriptionRequest

    // Get subscription and verify community access
    const { data: subscription, error: fetchError } = await supabase
      .from('business_subscriptions')
      .select('id, business_id, status, businesses(community_id)')
      .eq('id', subscriptionId)
      .single()

    if (fetchError || !subscription) {
      return NextResponse.json(
        { error: 'Suscripción no encontrada' },
        { status: 404 }
      )
    }

    // Type guard for business community access
    if (!hasBusinessCommunity(subscription)) {
      console.error('Invalid business data structure:', subscription)
      return NextResponse.json(
        { error: 'Error de estructura de datos' },
        { status: 500 }
      )
    }

    const businessCommunityId = subscription.businesses.community_id

    // Verify community access for non-super admins
    if (!profile.is_super_admin && profile.community_id !== businessCommunityId) {
      return NextResponse.json(
        { error: 'Acceso denegado - No puedes gestionar suscripciones de otra comunidad' },
        { status: 403 }
      )
    }

    // Update subscription to active
    const subscriptionUpdate: SubscriptionUpdate = {
      status: 'active',
      activated_at: activatedAt,
      expires_at: expiresAt,
      notes: notes || null,
      updated_at: new Date().toISOString()
    }

    const { error: subError } = await supabase
      .from('business_subscriptions')
      .update(subscriptionUpdate)
      .eq('id', subscriptionId)

    if (subError) {
      console.error('Error activating subscription:', subError)
      return NextResponse.json(
        { error: 'Error al activar la suscripción' },
        { status: 500 }
      )
    }

    // Extract date parts for period fields (YYYY-MM-DD)
    const periodStart = new Date(activatedAt).toISOString().split('T')[0]
    const periodEnd = new Date(expiresAt).toISOString().split('T')[0]

    // Create payment record (failure should not block activation)
    const paymentRecord: PaymentInsert = {
      subscription_id: subscriptionId,
      amount: paymentAmount,
      payment_method: paymentMethod,
      payment_proof_url: paymentProofUrl || null,
      recorded_by: user.id,
      period_start: periodStart,
      period_end: periodEnd,
      notes: notes || null
    }

    const { error: paymentError } = await supabase
      .from('subscription_payments')
      .insert(paymentRecord)

    if (paymentError) {
      console.error('Error creating payment record (non-blocking):', paymentError)
    }

    // Set business as featured (failure should not block activation)
    const { error: businessError } = await supabase
      .from('businesses')
      .update({ is_featured: true })
      .eq('id', subscription.business_id)

    if (businessError) {
      console.error('Error setting business as featured (non-blocking):', businessError)
    }

    // Log to audit trail (failure should not block activation)
    await supabase.from('audit_logs').insert({
      community_id: businessCommunityId,
      user_id: user.id,
      action: 'activate_subscription',
      entity_type: 'business_subscription',
      entity_id: subscriptionId,
      new_data: {
        status: 'active',
        activated_at: activatedAt,
        expires_at: expiresAt,
        payment_amount: paymentAmount,
        payment_method: paymentMethod
      },
      metadata: { admin_role: profile.role, is_super_admin: profile.is_super_admin }
    })

    // Get updated subscription
    const { data: updated } = await supabase
      .from('business_subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .single()

    return NextResponse.json({ subscription: updated })
  } catch (error) {
    console.error('Activate subscription error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
