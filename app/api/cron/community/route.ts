import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUsers } from '@/lib/notifications/community'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date()

  // ── Step 1: Expire past events ──────────────────────────────────────────────
  const { data: expiredEvents, error: expiredEventsError } = await (admin as any)
    .from('community_posts')
    .update({ status: 'archived', updated_at: now.toISOString() })
    .eq('type', 'event')
    .eq('status', 'approved')
    .lt('metadata->>date', now.toISOString())
    .select('id')

  if (expiredEventsError) {
    console.error('Error expiring events:', expiredEventsError)
  }

  // ── Step 2: 24h event reminders ─────────────────────────────────────────────
  const from24h = new Date(now.getTime() + 23 * 60 * 60 * 1000)
  const to24h   = new Date(now.getTime() + 25 * 60 * 60 * 1000)

  const { data: candidates24h } = await (admin as any)
    .from('community_posts')
    .select('id, title, community_id, metadata, communities!inner(slug)')
    .eq('type', 'event')
    .eq('status', 'approved')
    .gte('metadata->>date', from24h.toISOString())
    .lte('metadata->>date', to24h.toISOString())

  let reminders24hSent = 0
  if (candidates24h?.length) {
    const candidateIds = candidates24h.map((p: any) => p.id)
    const { data: alreadySent24h } = await (admin as any)
      .from('cron_reminder_logs')
      .select('post_id')
      .in('post_id', candidateIds)
      .eq('type', '24h')

    const sentIds24h = new Set((alreadySent24h ?? []).map((r: any) => r.post_id))
    const toRemind24h = candidates24h.filter((p: any) => !sentIds24h.has(p.id))

    for (const post of toRemind24h) {
      try {
        const communityId = post.community_id
        const slug = (post.communities as any).slug as string

        const { data: profiles } = await (admin as any)
          .from('profiles')
          .select('id')
          .eq('community_id', communityId)

        const userIds = (profiles ?? []).map((p: any) => p.id)
        await sendPushToUsers(userIds, {
          title: `📅 Mañana: ${post.title}`,
          body: 'Recuerda que tienes un evento mañana en tu comunidad.',
          url: `https://barriored.co/${slug}/community`,
        })

        await (admin as any)
          .from('cron_reminder_logs')
          .insert({ post_id: post.id, type: '24h' })
          .throwOnError()

        reminders24hSent++
      } catch (err) {
        console.error(`24h reminder failed for post ${post.id}:`, err)
      }
    }
  }

  // ── Step 4: 1h event reminders ──────────────────────────────────────────────
  const from1h = new Date(now.getTime() + 0)
  const to1h   = new Date(now.getTime() + 2 * 60 * 60 * 1000)

  const { data: candidates1h } = await (admin as any)
    .from('community_posts')
    .select('id, title, community_id, metadata, communities!inner(slug)')
    .eq('type', 'event')
    .eq('status', 'approved')
    .gte('metadata->>date', from1h.toISOString())
    .lte('metadata->>date', to1h.toISOString())

  let reminders1hSent = 0
  if (candidates1h?.length) {
    const candidateIds = candidates1h.map((p: any) => p.id)
    const { data: alreadySent1h } = await (admin as any)
      .from('cron_reminder_logs')
      .select('post_id')
      .in('post_id', candidateIds)
      .eq('type', '1h')

    const sentIds1h = new Set((alreadySent1h ?? []).map((r: any) => r.post_id))
    const toRemind1h = candidates1h.filter((p: any) => !sentIds1h.has(p.id))

    for (const post of toRemind1h) {
      try {
        const communityId = post.community_id
        const slug = (post.communities as any).slug as string

        const { data: profiles } = await (admin as any)
          .from('profiles')
          .select('id')
          .eq('community_id', communityId)

        const userIds = (profiles ?? []).map((p: any) => p.id)
        await sendPushToUsers(userIds, {
          title: `⏰ En 1 hora: ${post.title}`,
          body: 'El evento comienza en aproximadamente 1 hora.',
          url: `https://barriored.co/${slug}/community`,
        })

        await (admin as any)
          .from('cron_reminder_logs')
          .insert({ post_id: post.id, type: '1h' })
          .throwOnError()

        reminders1hSent++
      } catch (err) {
        console.error(`1h reminder failed for post ${post.id}:`, err)
      }
    }
  }

  return NextResponse.json({
    success: true,
    eventsExpired: expiredEvents?.length ?? 0,
    reminders24hSent,
    reminders1hSent,
    timestamp: now.toISOString(),
  })
}
