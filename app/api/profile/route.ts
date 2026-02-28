import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const updateProfileSchema = z.object({
  full_name: z.string().min(2).max(100).optional(),
  phone: z.string().regex(/^\+57\d{10}$/, 'Formato inválido. Debe ser +57XXXXXXXXXX').optional(),
  avatar_url: z.string().url().optional().or(z.literal('')).optional(),
  community_id: z.string().uuid().optional().or(z.literal('')).nullable().optional(),
})

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, full_name, phone, avatar_url, community_id, role')
    .eq('id', user.id)
    .single() as { data: any; error: any }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    ...profile,
    email: user.email,
  })
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = updateProfileSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  // If community_id is provided, validate it exists
  if (parsed.data.community_id && parsed.data.community_id !== '') {
    const { data: community } = await supabase
      .from('communities')
      .select('id')
      .eq('id', parsed.data.community_id)
      .single() as { data: any }

    if (!community) {
      return NextResponse.json(
        { error: { community_id: ['Comunidad no encontrada'] } },
        { status: 400 }
      )
    }
  }

  // Convert empty string to null for community_id
  const updateData = {
    ...parsed.data,
    community_id: parsed.data.community_id === '' ? null : parsed.data.community_id,
  }

  const { data, error } = await (supabase as any)
    .from('profiles')
    .update(updateData)
    .eq('id', user.id)
    .select('id, full_name, phone, avatar_url, community_id, role')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    ...data,
    email: user.email,
  })
}
