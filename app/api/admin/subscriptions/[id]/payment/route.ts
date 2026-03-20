import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Database } from '@/lib/types/database'
import { isValidUUID, isValidISODate } from '@/lib/validations/common'

type PaymentInsert = Database['public']['Tables']['subscription_payments']['Insert']
type SubscriptionUpdate = Database['public']['Tables']['business_subscriptions']['Update']

interface RecordPaymentRequest {
  amount: number
  paymentMethod: string
  paymentProofUrl?: string
  periodStart: string
  periodEnd: string
  notes?: string
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
    const body = await request.json() as Partial<RecordPaymentRequest>

    if (!body.amount || !body.paymentMethod || !body.periodStart || !body.periodEnd) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: amount, paymentMethod, periodStart, periodEnd' },
        { status: 400 }
      )
    }

    // Validate date formats
    if (!isValidISODate(body.periodStart)) {
      return NextResponse.json(
        { error: 'Formato de fecha inválido para periodStart (debe ser ISO 8601)' },
        { status: 400 }
      )
    }

    if (!isValidISODate(body.periodEnd)) {
      return NextResponse.json(
        { error: 'Formato de fecha inválido para periodEnd (debe ser ISO 8601)' },
        { status: 400 }
      )
    }

    // Validate payment amount is positive
    if (typeof body.amount !== 'number' || body.amount <= 0) {
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
      amount,
      paymentMethod,
      paymentProofUrl,
      periodStart,
      periodEnd,
      notes
    } = body as RecordPaymentRequest

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

    // Extract date parts for period fields (YYYY-MM-DD format)
    const periodStartDate = new Date(periodStart).toISOString().split('T')[0]
    const periodEndDate = new Date(periodEnd).toISOString().split('T')[0]

    // Create payment record (primary operation)
    const paymentRecord: PaymentInsert = {
      subscription_id: subscriptionId,
      amount,
      payment_method: paymentMethod,
      payment_proof_url: paymentProofUrl || null,
      recorded_by: user.id,
      period_start: periodStartDate,
      period_end: periodEndDate,
      notes: notes || null
    }

    const { data: payment, error: paymentError } = await supabase
      .from('subscription_payments')
      .insert(paymentRecord)
      .select()
      .single()

    if (paymentError || !payment) {
      console.error('Error creating payment record:', paymentError)
      return NextResponse.json(
        { error: 'Error al crear el registro de pago' },
        { status: 500 }
      )
    }

    // Track non-critical failures to report to admin
    const warnings: string[] = []

    // Extend subscription expiration (non-blocking)
    const subscriptionUpdate: SubscriptionUpdate = {
      expires_at: periodEnd,
      updated_at: new Date().toISOString()
    }

    const { error: subError } = await supabase
      .from('business_subscriptions')
      .update(subscriptionUpdate)
      .eq('id', subscriptionId)

    if (subError) {
      console.error('Error extending subscription expiration (non-blocking):', subError)
      warnings.push('No se pudo extender la fecha de expiración de la suscripción')
    }

    // Log to audit trail (non-blocking)
    await supabase.from('audit_logs').insert({
      community_id: businessCommunityId,
      user_id: user.id,
      action: 'record_payment',
      entity_type: 'subscription_payment',
      entity_id: payment.id,
      new_data: {
        subscription_id: subscriptionId,
        amount,
        payment_method: paymentMethod,
        period_start: periodStartDate,
        period_end: periodEndDate
      },
      metadata: { admin_role: profile.role, is_super_admin: profile.is_super_admin }
    })

    return NextResponse.json({
      payment,
      ...(warnings.length > 0 && { warnings })
    }, { status: 201 })
  } catch (error) {
    console.error('Record payment error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
