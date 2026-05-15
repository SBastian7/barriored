import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/auth/api-protection'
import { logAuditAction } from '@/lib/utils/audit-logger'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const auth = await requirePermission('canManageRoles', supabase)
  if (!auth.authorized) return auth.error

  const body = await request.json()
  const { cancellation_reason } = body

  const { data: sub, error: fetchError } = await (supabase as any)
    .from('business_subscriptions')
    .select('id, business_id, status')
    .eq('id', id)
    .single()

  if (fetchError || !sub) {
    return NextResponse.json({ error: 'Suscripción no encontrada' }, { status: 404 })
  }

  if (sub.status !== 'active') {
    return NextResponse.json({ error: 'Solo se pueden revocar suscripciones activas' }, { status: 400 })
  }

  const { error } = await (supabase as any)
    .from('business_subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancellation_reason: cancellation_reason || 'Revocado por administrador',
    })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Also clear is_featured on the business
  const { error: bizError } = await (supabase as any)
    .from('businesses')
    .update({ is_featured: false })
    .eq('id', sub.business_id)

  if (bizError) {
    console.error('Failed to clear is_featured after revoke:', bizError)
  }

  await logAuditAction({
    action: 'revoke_subscription',
    entityType: 'business_subscription',
    entityId: id,
    oldData: { status: 'active' },
    newData: { status: 'cancelled', cancellation_reason },
  })

  return NextResponse.json({ success: true })
}
