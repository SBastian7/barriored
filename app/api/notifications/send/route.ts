import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import webpush from 'web-push'

// Configure web-push (only if keys are available)
if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:support@barriored.co',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { community_id, title, body, url } = await request.json()

  if (!community_id || !title || !body) {
    return NextResponse.json(
      { error: 'Faltan parámetros requeridos' },
      { status: 400 }
    )
  }

  // Get all subscriptions for users in this community
  // First get user IDs in this community
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id')
    .eq('community_id', community_id)

  const userIds = profiles?.map(p => p.id) || []

  if (userIds.length === 0) {
    return NextResponse.json(
      { success: true, sent: 0, message: 'No hay usuarios en esta comunidad' },
      { status: 200 }
    )
  }

  // Then get push subscriptions for those users
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth, user_id')
    .in('user_id', userIds)

  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json(
      { success: true, sent: 0, message: 'No hay suscriptores en esta comunidad' },
      { status: 200 }
    )
  }

  const payload = JSON.stringify({
    title,
    body,
    url: url || '/',
  })

  let sentCount = 0
  const sendPromises = subscriptions.map(async (sub) => {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        payload
      )
      sentCount++
    } catch (error: any) {
      console.error('Failed to send notification:', error)
      // If subscription is invalid (410), delete it
      if (error.statusCode === 410) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', sub.endpoint)
      }
    }
  })

  await Promise.allSettled(sendPromises)

  return NextResponse.json({
    success: true,
    sent: sentCount,
  })
}
