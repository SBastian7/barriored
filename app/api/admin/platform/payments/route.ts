import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('is_super_admin').eq('id', user.id).single()
  if (!profile?.is_super_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supabase.from('platform_payment_config').select('*').order('gateway')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Mask sensitive keys before sending to client
  const masked = (data || []).map((g) => ({
    ...g,
    private_key: g.private_key ? `...${g.private_key.slice(-4)}` : null,
    webhook_secret: g.webhook_secret ? `...${g.webhook_secret.slice(-4)}` : null,
  }))
  return NextResponse.json({ gateways: masked })
}
