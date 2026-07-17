import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
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

  // Bust cache + send approval email
  try {
    const adminClient = createAdminClient()
    const [ownerResult, communityResult] = await Promise.all([
      data.owner_id ? adminClient.auth.admin.getUserById(data.owner_id) : Promise.resolve(null),
      (adminClient as any).from('communities').select('slug').eq('id', data.community_id).single(),
    ])

    const communitySlug = (communityResult.data as any)?.slug ?? ''
    if (communitySlug) revalidateTag(`businesses-${communitySlug}`, 'default')

    if (!data.owner_id) {
      console.error(`Approval email: business ${id} missing owner_id`)
    } else if (ownerResult && 'error' in ownerResult && ownerResult.error) {
      console.error(`Approval email: getUserById failed for business ${id}:`, ownerResult.error.message)
    } else if (ownerResult) {
      const ownerEmail = (ownerResult as any).data?.user?.email
      if (ownerEmail && data.name) {
        await sendBusinessApprovedEmail(ownerEmail, data.name, communitySlug)
      } else {
        console.error(`Approval email: missing data for business ${id} — email: ${ownerEmail}, name: ${data.name}`)
      }
    }
  } catch (e: any) {
    console.error(`Approval email failed for business ${id}:`, e?.message ?? e)
  }

  return NextResponse.json(data)
}
