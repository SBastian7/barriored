import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAlertSchema } from '@/lib/validations/community'

export async function GET(request: NextRequest) {
    const supabase = await createClient()
    const communityId = new URL(request.url).searchParams.get('community_id')
    if (!communityId) return NextResponse.json({ error: 'community_id requerido' }, { status: 400 })

    const { data, error } = await supabase
        .from('community_alerts')
        .select('*')
        .eq('community_id', communityId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
}

export async function POST(request: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    // Admin check
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const body = await request.json()
    const parsed = createAlertSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })

    const { data, error } = await supabase
        .from('community_alerts')
        .insert({
            ...parsed.data,
            author_id: user.id,
            severity: parsed.data.severity as 'info' | 'warning' | 'critical',
            type: parsed.data.type as 'water' | 'power' | 'security' | 'construction' | 'general'
        })
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
}
