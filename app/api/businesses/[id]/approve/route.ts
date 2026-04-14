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

  // Send approval email
  try {
    const { data: biz } = await (supabase as any)
      .from('businesses')
      .select('name, owner_id, communities(slug)')
      .eq('id', id)
      .single()

    if (!biz?.owner_id) {
      console.error(`Approval email: business ${id} not found or missing owner_id`)
    } else {
      const adminClient = createAdminClient()
      const { data: ownerData, error: userError } = await adminClient.auth.admin.getUserById(biz.owner_id)
      if (userError) {
        console.error(`Approval email: getUserById failed for business ${id}:`, userError.message)
      } else {
        const ownerEmail = ownerData?.user?.email
        const communitySlug = (biz.communities as any)?.slug ?? ''
        if (ownerEmail && biz.name) {
          await sendBusinessApprovedEmail(ownerEmail, biz.name, communitySlug)
        } else {
          console.error(`Approval email: missing data for business ${id} — email: ${ownerEmail}, name: ${biz.name}`)
        }
      }
    }
  } catch (e: any) {
    console.error(`Approval email failed for business ${id}:`, e?.message ?? e)
  }

  return NextResponse.json(data)
}
