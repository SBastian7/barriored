import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { JobMetadata } from '@/lib/types'

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    // Get the post
    const { data: post, error: fetchError } = await supabase
        .from('community_posts')
        .select('author_id, type, metadata')
        .eq('id', id)
        .single()

    if (fetchError || !post) {
        return NextResponse.json({ error: 'Publicación no encontrada' }, { status: 404 })
    }

    // Check if user is the author
    if (post.author_id !== user.id) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // Only allow for job posts
    if (post.type !== 'job') {
        return NextResponse.json({ error: 'Solo se puede marcar empleos como llenos' }, { status: 400 })
    }

    // Toggle the is_filled status
    const metadata = post.metadata as JobMetadata
    const newFilledStatus = !metadata.is_filled

    const { error: updateError } = await supabase
        .from('community_posts')
        .update({
            metadata: { ...metadata, is_filled: newFilledStatus },
            updated_at: new Date().toISOString()
        })
        .eq('id', id)

    if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
        success: true,
        is_filled: newFilledStatus
    })
}
