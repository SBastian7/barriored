import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/auth/api-protection'

export async function POST(request: Request) {
  const supabase = await createClient()
  const permissionCheck = await requirePermission('canManageCategories', supabase)
  if (!permissionCheck.authorized) return permissionCheck.error

  const { name, slug, icon, sort_order } = await request.json()

  if (!name || !slug) {
    return NextResponse.json({ error: 'name y slug son requeridos' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('categories')
    .insert({ name, slug, icon: icon || 'tag', sort_order: sort_order ?? 99 })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ category: data }, { status: 201 })
}
