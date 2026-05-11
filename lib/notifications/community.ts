import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendAlertNotificationEmail, sendAdminFlaggedContentEmail } from '@/lib/email/resend'
import { sendWhatsAppMessage } from '@/lib/twilio'

if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:support@barriored.co',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

type PushPayload = { title: string; body: string; url: string }

async function getProfilesForCommunity(
  communityId: string
): Promise<{ id: string; phone: string | null }[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('profiles')
    .select('id, phone')
    .eq('community_id', communityId)
  return data ?? []
}

async function getAdminProfilesForCommunity(
  communityId: string
): Promise<{ id: string }[]> {
  const admin = createAdminClient()
  const { data } = await (admin as any)
    .from('profiles')
    .select('id')
    .eq('community_id', communityId)
    .or('role.eq.admin,is_super_admin.eq.true')
  return data ?? []
}

export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  if (userIds.length === 0) return { sent: 0, failed: 0 }

  const admin = createAdminClient()
  const { data: subscriptions } = await (admin as any)
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth, user_id')
    .in('user_id', userIds)

  if (!subscriptions?.length) return { sent: 0, failed: 0 }

  const body = JSON.stringify(payload)
  let sent = 0
  let failed = 0

  await Promise.allSettled(
    subscriptions.map(async (sub: any) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body
        )
        sent++
      } catch (err: any) {
        failed++
        if (err.statusCode === 410) {
          await admin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
        }
      }
    })
  )

  return { sent, failed }
}

export function sendCommunityAlertNotifications(
  communityId: string,
  alert: {
    title: string
    description: string | null
    type: string
    severity: string
    communitySlug: string
  }
): void {
  Promise.resolve().then(async () => {
    try {
      const profiles = await getProfilesForCommunity(communityId)
      const userIds = profiles.map(p => p.id)

      // Email — fetch auth emails via admin API (paginated, 1000 per page is enough for MVP)
      const admin = createAdminClient()
      const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
      const communityUserSet = new Set(userIds)
      const emails = users.filter(u => communityUserSet.has(u.id) && u.email).map(u => u.email!)

      const BATCH = 50
      for (let i = 0; i < emails.length; i += BATCH) {
        await Promise.allSettled(
          emails.slice(i, i + BATCH).map(email =>
            sendAlertNotificationEmail(email, alert)
              .catch(err => console.error(`Alert email failed for ${email}:`, err))
          )
        )
        if (i + BATCH < emails.length) await new Promise(r => setTimeout(r, 100))
      }

      // Push
      await sendPushToUsers(userIds, {
        title: `⚠️ Alerta: ${alert.title}`,
        body: alert.description ?? alert.title,
        url: `https://barriored.co/${alert.communitySlug}/community`,
      }).catch(err => console.error('Alert push failed:', err))

      // WhatsApp
      const phonesRaw = profiles.filter(p => p.phone).map(p => p.phone!)
      await Promise.allSettled(
        phonesRaw.map(phone =>
          sendWhatsAppMessage(
            phone,
            `🚨 *Alerta BarrioRed*: ${alert.title}\n${alert.description ?? ''}\nVer más: barriored.co/${alert.communitySlug}/community`
          ).catch(err => console.error(`WhatsApp failed for ${phone}:`, err))
        )
      )
    } catch (err) {
      console.error('[sendCommunityAlertNotifications] Unhandled error:', err)
    }
  })
}

export function sendAdminFlaggedContentNotification(
  communityId: string,
  content: {
    type: 'post' | 'review'
    title: string
    reason: string
    adminPanelUrl: string
  }
): void {
  Promise.resolve().then(async () => {
    try {
      const adminProfiles = await getAdminProfilesForCommunity(communityId)
      const adminIds = adminProfiles.map(p => p.id)
      if (adminIds.length === 0) return

      const admin = createAdminClient()
      const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
      const adminIdSet = new Set(adminIds)
      const adminEmails = users.filter(u => adminIdSet.has(u.id) && u.email).map(u => u.email!)

      await Promise.allSettled(
        adminEmails.map(email =>
          sendAdminFlaggedContentEmail(email, content)
            .catch(err => console.error(`Admin flag email failed for ${email}:`, err))
        )
      )

      await sendPushToUsers(adminIds, {
        title: `🚩 Nuevo reporte`,
        body: `${content.title} — Motivo: ${content.reason}`,
        url: content.adminPanelUrl,
      }).catch(err => console.error('Admin flag push failed:', err))
    } catch (err) {
      console.error('[sendAdminFlaggedContentNotification] Unhandled error:', err)
    }
  })
}
