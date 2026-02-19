import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Allowlist of fields a post author can update
const updatePostSchema = z.object({
    title: z.string().min(3).max(150).optional(),
    content: z.string().min(10).max(2000).optional(),
    image_url: z.string().url().optional().or(z.literal('')).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
})

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('community_posts')
        .select('*, profiles(full_name, avatar_url)')
        .eq('id', id)
        .eq('status', 'approved')
        .single()

    if (error || !data) {
        return NextResponse.json({ error: 'Publicacion no encontrada' }, { status: 404 })
    }

    return NextResponse.json(data)
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    // Validate input against allowlist
    const body = await request.json()
    const parsed = updatePostSchema.safeParse(body)
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    // Check ownership: only the author can edit their post
    const { data: existing } = await supabase
        .from('community_posts')
        .select('author_id')
        .eq('id', id)
        .single()

    if (!existing) {
        return NextResponse.json({ error: 'Publicacion no encontrada' }, { status: 404 })
    }
    if (existing.author_id !== user.id) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { data, error } = await supabase
        .from('community_posts')
        .update({ ...parsed.data, metadata: parsed.data.metadata as any, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json(data)
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    // Check ownership or admin role
    const { data: existing } = await supabase
        .from('community_posts')
        .select('author_id')
        .eq('id', id)
        .single()

    if (!existing) {
        return NextResponse.json({ error: 'Publicacion no encontrada' }, { status: 404 })
    }

    if (existing.author_id !== user.id) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        if (profile?.role !== 'admin') {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
        }
    }

    const { error } = await supabase.from('community_posts').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
}
