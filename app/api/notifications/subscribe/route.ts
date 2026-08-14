import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { subscription, community_id } = await request.json()

  if (!subscription || !subscription.endpoint) {
    return NextResponse.json(
      { error: 'Suscripción inválida' },
      { status: 400 }
    )
  }

  if (!community_id) {
    return NextResponse.json(
      { error: 'Falta community_id' },
      { status: 400 }
    )
  }

  // Upsert subscription — anonymous visitors get user_id: null, scoped by community_id instead
  const { error } = await (supabase as any).from('push_subscriptions').upsert(
    {
      user_id: user?.id ?? null,
      community_id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'endpoint',
    }
  )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
