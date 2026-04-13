import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requirePermission } from '@/lib/auth/api-protection'
import { logAuditAction } from '@/lib/utils/audit-logger'
import { sendBusinessRejectedEmail } from '@/lib/email/resend'

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

  // Log audit action
  await logAuditAction({
    action: 'reject_business',
    entityType: 'business',
    entityId: id,
    oldData: { status: 'pending' },
    newData: { status: 'rejected', reason: rejection_reason },
    communityId: data.community_id,
  })

  // Send rejection email fire-and-forget
  try {
    const { data: biz } = await (supabase as any)
      .from('businesses')
      .select('name, owner_id, rejection_reason')
      .eq('id', id)
      .single()

    if (biz?.owner_id) {
      const adminClient = createAdminClient()
      const { data: ownerData } = await adminClient.auth.admin.getUserById(biz.owner_id)
      const ownerEmail = ownerData?.user?.email
      if (ownerEmail && biz.name) {
        sendBusinessRejectedEmail(ownerEmail, biz.name, biz.rejection_reason ?? undefined).catch(console.error)
      }
    }
  } catch (e) {
    console.error(`Failed to send rejection email for business ${id}:`, e)
  }

  return NextResponse.json({ success: true, data })
}
