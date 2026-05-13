import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function requireSuperAdmin(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const { data: profile } = await supabase.from('profiles').select('is_super_admin').eq('id', user.id).single()
  if (!profile?.is_super_admin) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  return { userId: user.id }
}

export async function GET() {
  const supabase = await createClient()
  const check = await requireSuperAdmin(supabase)
  if (check.error) return check.error

  const { data, error } = await supabase.from('platform_config').select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ config: data })
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const check = await requireSuperAdmin(supabase)
  if (check.error) return check.error

  const body = await request.json()
  const allowed = ['platform_name', 'support_email', 'support_phone', 'marketplace_enabled', 'community_posts_enabled', 'new_registrations_open', 'max_businesses_per_community']
  const updates: Record<string, any> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }
  updates.updated_at = new Date().toISOString()
  updates.updated_by = check.userId

  const { data, error } = await supabase.from('platform_config').update(updates).neq('id', '').select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ config: data })
}
