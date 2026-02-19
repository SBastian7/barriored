import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createPostSchema } from '@/lib/validations/community'

export async function GET(request: NextRequest) {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const communityId = searchParams.get('community_id')
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') ?? '20')

    if (!communityId) {
        return NextResponse.json({ error: 'community_id requerido' }, { status: 400 })
    }

    let query = supabase
        .from('community_posts')
        .select('*, profiles(full_name, avatar_url)')
        .eq('community_id', communityId)
        .eq('status', 'approved')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit)

    if (type) {
        query = query.eq('type', type as 'announcement' | 'event' | 'job')
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json(data)
}

export async function POST(request: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = createPostSchema.safeParse(body)
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const { type, title, content, image_url, community_id, ...rest } = parsed.data
    const metadata = 'metadata' in rest ? rest.metadata : {}

    const { data, error } = await supabase
        .from('community_posts')
        .insert({
            community_id,
            author_id: user.id,
            type,
            title,
            content,
            image_url: image_url || null,
            metadata,
            status: 'pending',
        })
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json(data, { status: 201 })
}
