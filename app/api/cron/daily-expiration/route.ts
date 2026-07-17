import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import {
  sendSubscriptionRenewalReminderEmail,
  sendSubscriptionExpirationWarningEmail,
  sendClassifiedExpiryReminderEmail,
  sendErrorAlertEmail,
} from '@/lib/email/resend'

export async function GET(request: Request) {
  // Verify cron secret (security)
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const adminClient = createAdminClient()

  try {
    // ── Step 1: Renewal reminders (6–8 days before expiry) ──────────────────
    const reminderFrom = new Date()
    reminderFrom.setDate(reminderFrom.getDate() + 6)
    const reminderTo = new Date()
    reminderTo.setDate(reminderTo.getDate() + 8)

    const { data: reminderSubs } = await supabase
      .from('business_subscriptions')
      .select('id, business_id, expires_at, businesses(name, owner_id)')
      .eq('status', 'active')
      .gte('expires_at', reminderFrom.toISOString())
      .lte('expires_at', reminderTo.toISOString())

    let renewalRemindersSent = 0

    for (const sub of reminderSubs || []) {
      try {
        const business = sub.businesses as { name: string; owner_id: string } | null
        if (!business) continue

        const { data: userData } = await adminClient.auth.admin.getUserById(business.owner_id)
        const ownerEmail = userData?.user?.email
        if (!ownerEmail) continue

        const expiresAt = sub.expires_at!
        const daysLeft = Math.ceil(
          (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )

        sendSubscriptionRenewalReminderEmail(ownerEmail, business.name, expiresAt, daysLeft)
          .catch(err => console.error(`Renewal reminder failed for sub ${sub.id}:`, err))

        renewalRemindersSent++
      } catch (err) {
        console.error(`Error processing renewal reminder for sub ${sub.id}:`, err)
      }
    }

    // ── Step 2: Expiration warnings (1–3 days before expiry) ────────────────
    const warningFrom = new Date()
    warningFrom.setDate(warningFrom.getDate() + 1)
    const warningTo = new Date()
    warningTo.setDate(warningTo.getDate() + 3)

    const { data: warningSubs } = await supabase
      .from('business_subscriptions')
      .select('id, business_id, expires_at, businesses(name, owner_id)')
      .eq('status', 'active')
      .gte('expires_at', warningFrom.toISOString())
      .lte('expires_at', warningTo.toISOString())

    let expirationWarningsSent = 0

    for (const sub of warningSubs || []) {
      try {
        const business = sub.businesses as { name: string; owner_id: string } | null
        if (!business) continue

        const { data: userData } = await adminClient.auth.admin.getUserById(business.owner_id)
        const ownerEmail = userData?.user?.email
        if (!ownerEmail) continue

        sendSubscriptionExpirationWarningEmail(ownerEmail, business.name, sub.expires_at!)
          .catch(err => console.error(`Expiration warning failed for sub ${sub.id}:`, err))

        expirationWarningsSent++
      } catch (err) {
        console.error(`Error processing expiration warning for sub ${sub.id}:`, err)
      }
    }

    // ── Step 3: Expire subscriptions ─────────────────────────────────────────
    const { data: expiredSubs } = await supabase
      .from('business_subscriptions')
      .select('id, business_id')
      .eq('status', 'active')
      .lt('expires_at', new Date().toISOString())

    for (const sub of expiredSubs || []) {
      await supabase
        .from('business_subscriptions')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: 'Expirado por falta de pago'
        })
        .eq('id', sub.id)

      await supabase
        .from('businesses')
        .update({ is_featured: false })
        .eq('id', sub.business_id)
    }

    // ── Step 4: Expire banners ────────────────────────────────────────────────
    const { data: expiredBanners } = await supabase
      .from('banner_ads')
      .select('id')
      .eq('status', 'active')
      .lt('ends_at', new Date().toISOString())

    for (const banner of expiredBanners || []) {
      await supabase
        .from('banner_ads')
        .update({ status: 'expired' })
        .eq('id', banner.id)
    }

    // ── Step 5: Auto-expire classifieds (30 days from last_activity_at) ──────────
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const { data: expiredClassifieds } = await (adminClient as any)
      .from('classifieds')
      .update({
        status: 'archived',
        archived_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('status', 'active')
      .lt('last_activity_at', thirtyDaysAgo.toISOString())
      .select('id')

    // ── Step 6: 3-day expiry reminder ────────────────────────────────────────────
    // Window: last_activity_at is between 26 and 27 days ago (fires once per day, 3–4 days before expiry)
    const reminderWindowOlder = new Date(now.getTime() - 27 * 24 * 60 * 60 * 1000)
    const reminderWindowNewer = new Date(now.getTime() - 26 * 24 * 60 * 60 * 1000)

    const { data: reminderCandidates } = await (adminClient as any)
      .from('classifieds')
      .select('id, title, user_id, communities!inner(slug)')
      .eq('status', 'active')
      .is('renewal_reminder_sent_at', null)
      .gte('last_activity_at', reminderWindowOlder.toISOString())
      .lte('last_activity_at', reminderWindowNewer.toISOString())

    let classifiedRemindersSent = 0

    for (const classified of reminderCandidates ?? []) {
      try {
        const slug = (classified.communities as any).slug as string
        const { data: userData } = await adminClient.auth.admin.getUserById(classified.user_id)
        const email = userData?.user?.email

        if (email) {
          await sendClassifiedExpiryReminderEmail(email, classified.title, slug)
            .catch(err => console.error(`[cron] reminder email failed for ${classified.id}:`, err))
        }

        await (adminClient as any)
          .from('classifieds')
          .update({ renewal_reminder_sent_at: now.toISOString() })
          .eq('id', classified.id)

        classifiedRemindersSent++
      } catch (err) {
        console.error(`[cron] classified reminder failed for ${classified.id}:`, err)
      }
    }

    // ── Step 7: Error spike alert ─────────────────────────────────────────────
    let errorAlertSent = false
    try {
      const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

      const { count: errorCount } = await (adminClient as any)
        .from('error_logs')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', since24h)

      if ((errorCount ?? 0) > 20) {
        const { data: topErrorRows } = await (adminClient as any)
          .from('error_logs')
          .select('error_message')
          .gte('created_at', since24h)
          .order('created_at', { ascending: false })
          .limit(20)

        // Count by message and take top 5
        const freq: Record<string, number> = {}
        for (const row of topErrorRows ?? []) {
          const msg = row.error_message ?? 'Unknown'
          freq[msg] = (freq[msg] ?? 0) + 1
        }
        const topErrors = Object.entries(freq)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([msg, cnt]) => `${msg} (×${cnt})`)

        const { data: superAdmins } = await (adminClient as any)
          .from('profiles')
          .select('id')
          .eq('is_super_admin', true)

        for (const admin of superAdmins ?? []) {
          try {
            const { data: userData } = await adminClient.auth.admin.getUserById(admin.id)
            const email = userData?.user?.email
            if (email) {
              await sendErrorAlertEmail(email, errorCount!, topErrors)
                .catch(err => console.error('[cron] error alert email failed:', err))
              errorAlertSent = true
            }
          } catch (err) {
            console.error('[cron] failed to send error alert to admin:', err)
          }
        }
      }
    } catch (err) {
      console.error('[cron] error spike check failed:', err)
    }

    // ── Step 8: Data cleanup ──────────────────────────────────────────────────
    let errorLogsDeleted = 0
    let reminderLogsDeleted = 0
    try {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
      const { data: deletedErrors } = await (adminClient as any)
        .from('error_logs')
        .delete()
        .lt('created_at', ninetyDaysAgo)
        .select('id')
      errorLogsDeleted = deletedErrors?.length ?? 0
    } catch (err) {
      console.error('[cron] error_logs cleanup failed:', err)
    }

    try {
      const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
      const { data: deletedReminders } = await (adminClient as any)
        .from('cron_reminder_logs')
        .delete()
        .lt('sent_at', sixtyDaysAgo)
        .select('id')
      reminderLogsDeleted = deletedReminders?.length ?? 0
    } catch (err) {
      console.error('[cron] cron_reminder_logs cleanup failed:', err)
    }

    return NextResponse.json({
      success: true,
      renewalRemindersSent,
      expirationWarningsSent,
      expiredSubscriptions: expiredSubs?.length || 0,
      expiredBanners: expiredBanners?.length || 0,
      classifiedsExpired: expiredClassifieds?.length ?? 0,
      classifiedRemindersSent,
      errorAlertSent,
      errorLogsDeleted,
      reminderLogsDeleted,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
