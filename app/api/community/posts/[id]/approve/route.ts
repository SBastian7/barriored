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
    const auth = await requirePermission('canManageCommunityContent', supabase)
    if (!auth.authorized) return auth.error

    const { error } = await (supabase as any)
        .from('community_posts')
        .update({
            status: 'approved',
            updated_at: new Date().toISOString()
        })
        .eq('id', id)

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
}
