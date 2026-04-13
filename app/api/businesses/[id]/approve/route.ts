import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requirePermission } from '@/lib/auth/api-protection'
import { logAuditAction } from '@/lib/utils/audit-logger'
import { sendBusinessApprovedEmail } from '@/lib/email/resend'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  // Check permission
  const auth = await requirePermission('canApproveBusinesses', supabase)
  if (!auth.authorized) return auth.error

  const { data, error } = await (supabase as any)
    .from('businesses')
    .update({ status: 'approved', is_verified: true })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Log audit action
  await logAuditAction({
    action: 'approve_business',
    entityType: 'business',
    entityId: id,
    oldData: { status: 'pending' },
    newData: { status: 'approved', is_verified: true },
    communityId: data.community_id,
  })

  // Send approval email fire-and-forget
  try {
    const { data: biz } = await (supabase as any)
      .from('businesses')
      .select('name, owner_id, communities(slug)')
      .eq('id', id)
      .single()

    if (biz?.owner_id) {
      const adminClient = createAdminClient()
      const { data: ownerData } = await adminClient.auth.admin.getUserById(biz.owner_id)
      const ownerEmail = ownerData?.user?.email
      const communitySlug = (biz.communities as any)?.slug ?? ''
      if (ownerEmail) {
        sendBusinessApprovedEmail(ownerEmail, biz.name, communitySlug).catch(console.error)
      }
    }
  } catch (e) {
    console.error('Failed to send approval email:', e)
  }

  return NextResponse.json(data)
}
