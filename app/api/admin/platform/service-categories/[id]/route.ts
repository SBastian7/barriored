import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: p } = await supabase.from('profiles').select('is_super_admin').eq('id', user.id).single()
  if (!p?.is_super_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: { name?: unknown; slug?: unknown; icon?: unknown; sort_order?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  if (typeof body.name !== 'string' || !body.name || typeof body.slug !== 'string' || !body.slug) {
    return NextResponse.json({ error: 'name y slug son requeridos' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('service_categories')
    .update({ name: body.name, slug: body.slug, icon: body.icon as string, sort_order: body.sort_order as number })
    .eq('id', id).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ category: data })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: p } = await supabase.from('profiles').select('is_super_admin').eq('id', user.id).single()
  if (!p?.is_super_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { count } = await supabase
    .from('public_services').select('id', { count: 'exact', head: true }).eq('service_category_id', id).eq('is_active', true)

  if ((count ?? 0) > 0) {
    return NextResponse.json({ error: `No se puede desactivar: ${count} servicio(s) usan esta categoría` }, { status: 409 })
  }

  const { error } = await supabase.from('service_categories').update({ is_active: false }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
