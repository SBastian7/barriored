import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: post } = await (supabase as any)
    .from('community_posts')
    .select('id')
    .eq('id', id)
    .single()
  if (!post) return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 })

  const { data: existing } = await (supabase as any)
    .from('event_attendees')
    .select('id')
    .eq('user_id', user.id)
    .eq('event_post_id', id)
    .single()

  if (existing) {
    const { error: delError } = await (supabase as any)
      .from('event_attendees')
      .delete()
      .eq('user_id', user.id)
      .eq('event_post_id', id)
    if (delError) return NextResponse.json({ error: 'Error al cancelar asistencia' }, { status: 500 })
  } else {
    const { error: insError } = await (supabase as any)
      .from('event_attendees')
      .insert({ user_id: user.id, event_post_id: id })
    if (insError) return NextResponse.json({ error: 'Error al registrar asistencia' }, { status: 500 })
  }

  const { count } = await (supabase as any)
    .from('event_attendees')
    .select('*', { count: 'exact', head: true })
    .eq('event_post_id', id)

  return NextResponse.json({
    attending: !existing,
    count: count ?? 0,
  })
}
