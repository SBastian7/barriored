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

  return NextResponse.json(data)
}
