import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/auth/api-protection'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const permissionCheck = await requirePermission('canManageCategories', supabase)
  if (!permissionCheck.authorized) return permissionCheck.error

  const { name, slug, icon } = await request.json()

  if (!name || !slug) {
    return NextResponse.json({ error: 'name y slug son requeridos' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('categories')
    .update({ name, slug, icon })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ category: data })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const permissionCheck = await requirePermission('canManageCategories', supabase)
  if (!permissionCheck.authorized) return permissionCheck.error

  // Block delete if businesses reference this category
  const { count } = await supabase
    .from('businesses')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', id)

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: `No se puede eliminar: ${count} negocio(s) usan esta categoría` },
      { status: 409 }
    )
  }

  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
