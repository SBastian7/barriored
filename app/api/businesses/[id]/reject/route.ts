import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/auth/api-protection'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  // Check permission
  const auth = await requirePermission('canRejectBusinesses', supabase)
  if (!auth.authorized) return auth.error

  // Get rejection feedback from body
  const body = await request.json()
  const { rejection_reason, rejection_details } = body

  if (!rejection_reason) {
    return NextResponse.json(
      { error: 'Se requiere motivo de rechazo' },
      { status: 400 }
    )
  }

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()

  // Update business with rejection info
  const { data, error } = await (supabase as any)
    .from('businesses')
    .update({
      status: 'rejected',
      rejection_reason,
      rejection_details: rejection_details || null,
      rejected_by: user!.id,
      rejected_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error rejecting business:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // TODO: Send notification to business owner about rejection

  return NextResponse.json({ success: true, data })
}
