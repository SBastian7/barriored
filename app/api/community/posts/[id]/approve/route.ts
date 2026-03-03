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
    const auth = await requirePermission('canManageCommunityContent', supabase)
    if (!auth.authorized) return auth.error

    const { data: post, error } = await (supabase as any)
        .from('community_posts')
        .update({
            status: 'approved',
            updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Log audit action
    await logAuditAction({
        action: 'approve_post',
        entityType: 'post',
        entityId: id,
        newData: { status: 'approved' },
        communityId: post.community_id,
    })

    return NextResponse.json({ success: true })
}
