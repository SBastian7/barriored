import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import webpush from 'web-push'

// Configure VAPID keys
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY!
const vapidEmail = process.env.VAPID_EMAIL || 'mailto:admin@barriored.co'

webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey)

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { community_id, title, body: message, recipient_mode } = body

    // Validate
    if (!community_id || !title || !message) {
      return NextResponse.json({
        error: 'community_id, title, and body are required'
      }, { status: 400 })
    }

    if (title.length > 50 || message.length > 200) {
      return NextResponse.json({
        error: 'Title max 50 chars, body max 200 chars'
      }, { status: 400 })
    }

    // Check permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_super_admin, community_id')
      .eq('id', user.id)
      .single() as { data: any }

    const canAccess = profile?.is_super_admin ||
      (profile?.role === 'admin' && profile?.community_id === community_id)

    if (!canAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check rate limit
    const { data: config } = await supabase
      .from('push_notification_config')
      .select('is_enabled, max_per_day')
      .eq('community_id', community_id)
      .single() as { data: any }

    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const { count: todayCount } = await supabase
      .from('push_notification_logs')
      .select('*', { count: 'exact', head: true })
      .eq('community_id', community_id)
      .gte('sent_at', startOfDay.toISOString())

    const maxPerDay = config?.max_per_day || 10
    if ((todayCount || 0) >= maxPerDay) {
      return NextResponse.json({
        error: `Límite diario alcanzado (${todayCount}/${maxPerDay})`
      }, { status: 429 })
    }

    // Fetch subscriptions
    let subscriptionsQuery = (supabase
      .from('push_subscriptions') as any)
      .select('*')
      .eq('community_id', community_id)
      .not('endpoint', 'is', null)

    // Filter for "Solo yo" mode
    if (recipient_mode === 'self') {
      subscriptionsQuery = subscriptionsQuery.eq('user_id', user.id)
    }

    const { data: subscriptions } = await subscriptionsQuery

    if (!subscriptions || subscriptions.length === 0) {
      // Still log as successful send with 0 count
      await (supabase.from('push_notification_logs') as any).insert({
        community_id,
        title,
        body: message,
        sent_count: 0,
        failed_count: 0,
        test_mode: true
      })

      return NextResponse.json({
        success: true,
        sent_count: 0,
        failed_count: 0,
        message: 'No hay suscriptores'
      })
    }

    // Send notifications
    let successCount = 0
    let failedCount = 0

    const payload = JSON.stringify({
      title,
      body: message,
      icon: '/icon-192.png',
      badge: '/badge-72.png'
    })

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        }, payload)
        successCount++
      } catch (error) {
        console.error('Send error:', error)
        failedCount++
      }
    }

    // Log
    await (supabase.from('push_notification_logs') as any).insert({
      community_id,
      title,
      body: message,
      sent_count: successCount,
      failed_count: failedCount,
      test_mode: true
    })

    return NextResponse.json({
      success: true,
      sent_count: successCount,
      failed_count: failedCount,
      message: `Notificación enviada a ${successCount} suscriptores`
    })
  } catch (error) {
    console.error('Test send error:', error)
    return NextResponse.json({
      error: 'Failed to send test notification'
    }, { status: 500 })
  }
}
