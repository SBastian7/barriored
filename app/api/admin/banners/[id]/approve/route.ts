import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Database } from '@/lib/types/database'
import { isValidUUID, isValidISODate } from '@/lib/validations/common'

type BannerUpdate = Database['public']['Tables']['banner_ads']['Update']
type PaymentInsert = Database['public']['Tables']['banner_payments']['Insert']

interface ApproveBannerRequest {
  startsAt: string
  endsAt: string
  paymentAmount: number
  paymentMethod: string
  paymentProofUrl?: string
  notes?: string
}

// Type guard for banner with community_id
interface BannerWithCommunity {
  id: string
  business_id: string
  community_id: string
  status: string
}

function hasBannerCommunity(data: unknown): data is BannerWithCommunity {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'business_id' in data &&
    'community_id' in data &&
    'status' in data &&
    typeof (data as { community_id: unknown }).community_id === 'string'
  )
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: bannerId } = await params

    // Validate UUID format
    if (!isValidUUID(bannerId)) {
      return NextResponse.json(
        { error: 'ID de banner inválido' },
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
    const body = await request.json() as Partial<ApproveBannerRequest>

    if (!body.startsAt || !body.endsAt || !body.paymentAmount || !body.paymentMethod) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: startsAt, endsAt, paymentAmount, paymentMethod' },
        { status: 400 }
      )
    }

    // Validate date formats
    if (!isValidISODate(body.startsAt)) {
      return NextResponse.json(
        { error: 'Formato de fecha inválido para startsAt (debe ser ISO 8601)' },
        { status: 400 }
      )
    }

    if (!isValidISODate(body.endsAt)) {
      return NextResponse.json(
        { error: 'Formato de fecha inválido para endsAt (debe ser ISO 8601)' },
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
      startsAt,
      endsAt,
      paymentAmount,
      paymentMethod,
      paymentProofUrl,
      notes
    } = body as ApproveBannerRequest

    // Get banner and verify community access
    const { data: banner, error: fetchError } = await supabase
      .from('banner_ads')
      .select('id, business_id, community_id, status')
      .eq('id', bannerId)
      .single()

    if (fetchError || !banner) {
      return NextResponse.json(
        { error: 'Banner no encontrado' },
        { status: 404 }
      )
    }

    // Type guard for banner community access
    if (!hasBannerCommunity(banner)) {
      console.error('Invalid banner data structure:', banner)
      return NextResponse.json(
        { error: 'Error de estructura de datos' },
        { status: 500 }
      )
    }

    const bannerCommunityId = banner.community_id

    // Verify community access for non-super admins
    if (!profile.is_super_admin && profile.community_id !== bannerCommunityId) {
      return NextResponse.json(
        { error: 'Acceso denegado - No puedes gestionar banners de otra comunidad' },
        { status: 403 }
      )
    }

    // Update banner to active
    const bannerUpdate: BannerUpdate = {
      status: 'active',
      starts_at: startsAt,
      ends_at: endsAt,
      approved_at: new Date().toISOString(),
      approved_by: user.id,
      updated_at: new Date().toISOString()
    }

    const { error: bannerError } = await supabase
      .from('banner_ads')
      .update(bannerUpdate)
      .eq('id', bannerId)

    if (bannerError) {
      console.error('Error approving banner:', bannerError)
      return NextResponse.json(
        { error: 'Error al aprobar el banner' },
        { status: 500 }
      )
    }

    // Track non-critical failures to report to admin
    const warnings: string[] = []

    // Create payment record (failure should not block banner approval)
    const paymentRecord: PaymentInsert = {
      banner_id: bannerId,
      amount: paymentAmount,
      payment_method: paymentMethod,
      payment_proof_url: paymentProofUrl || null,
      recorded_by: user.id,
      notes: notes || null
    }

    const { error: paymentError } = await supabase
      .from('banner_payments')
      .insert(paymentRecord)

    if (paymentError) {
      console.error('Error creating payment record (non-blocking):', paymentError)
      warnings.push('No se pudo crear el registro de pago')
    }

    // Log to audit trail (failure should not block approval)
    await supabase.from('audit_logs').insert({
      community_id: bannerCommunityId,
      user_id: user.id,
      action: 'approve_banner',
      entity_type: 'banner_ad',
      entity_id: bannerId,
      new_data: {
        status: 'active',
        starts_at: startsAt,
        ends_at: endsAt,
        payment_amount: paymentAmount,
        payment_method: paymentMethod
      },
      metadata: { admin_role: profile.role, is_super_admin: profile.is_super_admin }
    })

    // Get updated banner
    const { data: updated } = await supabase
      .from('banner_ads')
      .select('*')
      .eq('id', bannerId)
      .single()

    return NextResponse.json({
      banner: updated,
      ...(warnings.length > 0 && { warnings })
    })
  } catch (error) {
    console.error('Approve banner error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
