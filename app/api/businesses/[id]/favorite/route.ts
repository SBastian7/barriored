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

  const { data: existing } = await (supabase as any)
    .from('business_favorites')
    .select('id')
    .eq('user_id', user.id)
    .eq('business_id', id)
    .single()

  if (existing) {
    await (supabase as any)
      .from('business_favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('business_id', id)
    return NextResponse.json({ favorited: false })
  } else {
    await (supabase as any)
      .from('business_favorites')
      .insert({ user_id: user.id, business_id: id })
    return NextResponse.json({ favorited: true })
  }
}
