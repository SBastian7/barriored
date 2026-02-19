import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const updateAlertSchema = z.object({
    title: z.string().min(3).max(150).optional(),
    description: z.string().max(500).optional(),
    severity: z.enum(['info', 'warning', 'critical']).optional(),
    type: z.enum(['water', 'power', 'security', 'construction', 'general']).optional(),
    is_active: z.boolean().optional(),
    starts_at: z.string().optional(),
    ends_at: z.string().optional(),
})

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const body = await request.json()
    const parsed = updateAlertSchema.safeParse(body)
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const { data, error } = await supabase
        .from('community_alerts')
        .update(parsed.data)
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

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const { error } = await supabase.from('community_alerts').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
}
