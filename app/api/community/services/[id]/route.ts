import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const updateServiceSchema = z.object({
    name: z.string().min(2).max(100).optional(),
    description: z.string().max(300).optional(),
    category: z.enum(['emergency', 'health', 'government', 'transport', 'utilities']).optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    hours: z.string().optional(),
    sort_order: z.number().int().optional(),
    is_active: z.boolean().optional(),
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
    const parsed = updateServiceSchema.safeParse(body)
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const { data, error } = await supabase
        .from('public_services')
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

    const { error } = await supabase.from('public_services').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
}
