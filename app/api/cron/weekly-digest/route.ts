import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWeeklyDigestEmail } from '@/lib/email/resend'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const weekStart = new Date(sevenDaysAgo).toLocaleDateString('es-CO', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  let digestsSent = 0

  try {
    // Get all active communities
    const { data: communities } = await (admin as any)
      .from('communities')
      .select('id, name, slug')
      .eq('is_active', true)

    for (const community of communities ?? []) {
      try {
        // Gather stats for this community
        const [
          { count: newBusinesses },
          { count: newPosts },
          { count: newUsers },
          { count: activeClassifieds },
          { count: errorCount },
        ] = await Promise.all([
          (admin as any).from('businesses')
            .select('id', { count: 'exact', head: true })
            .eq('community_id', community.id)
            .eq('status', 'approved')
            .gte('created_at', sevenDaysAgo),

          (admin as any).from('community_posts')
            .select('id', { count: 'exact', head: true })
            .eq('community_id', community.id)
            .eq('status', 'approved')
            .gte('created_at', sevenDaysAgo),

          (admin as any).from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('community_id', community.id)
            .gte('created_at', sevenDaysAgo),

          (admin as any).from('classifieds')
            .select('id', { count: 'exact', head: true })
            .eq('community_id', community.id)
            .eq('status', 'active'),

          (admin as any).from('error_logs')
            .select('id', { count: 'exact', head: true })
            .eq('community_id', community.id)
            .gte('created_at', sevenDaysAgo),
        ])

        const digestData = {
          communityName: community.name,
          newBusinesses: newBusinesses ?? 0,
          newPosts: newPosts ?? 0,
          newUsers: newUsers ?? 0,
          activeClassifieds: activeClassifieds ?? 0,
          errorCount: errorCount ?? 0,
          weekStart,
        }

        // Get community admins
        const { data: adminProfiles } = await (admin as any)
          .from('profiles')
          .select('id')
          .eq('community_id', community.id)
          .eq('role', 'admin')

        for (const profile of adminProfiles ?? []) {
          try {
            const { data: userData } = await admin.auth.admin.getUserById(profile.id)
            const email = userData?.user?.email
            if (email) {
              await sendWeeklyDigestEmail(email, digestData)
                .catch(err => console.error(`[weekly-digest] email failed for ${profile.id}:`, err))
              digestsSent++
            }
          } catch (err) {
            console.error(`[weekly-digest] failed for admin ${profile.id}:`, err)
          }
        }
      } catch (err) {
        console.error(`[weekly-digest] failed for community ${community.id}:`, err)
      }
    }

    // Send consolidated digest to super admins (all-community totals)
    const { data: superAdmins } = await (admin as any)
      .from('profiles')
      .select('id')
      .eq('is_super_admin', true)

    if ((superAdmins?.length ?? 0) > 0) {
      const [
        { count: totalBusinesses },
        { count: totalPosts },
        { count: totalUsers },
        { count: totalClassifieds },
        { count: totalErrors },
      ] = await Promise.all([
        (admin as any).from('businesses').select('id', { count: 'exact', head: true }).eq('status', 'approved').gte('created_at', sevenDaysAgo),
        (admin as any).from('community_posts').select('id', { count: 'exact', head: true }).eq('status', 'approved').gte('created_at', sevenDaysAgo),
        (admin as any).from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
        (admin as any).from('classifieds').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        (admin as any).from('error_logs').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
      ])

      const superDigest = {
        communityName: 'Todas las comunidades',
        newBusinesses: totalBusinesses ?? 0,
        newPosts: totalPosts ?? 0,
        newUsers: totalUsers ?? 0,
        activeClassifieds: totalClassifieds ?? 0,
        errorCount: totalErrors ?? 0,
        weekStart,
      }

      for (const profile of superAdmins ?? []) {
        try {
          const { data: userData } = await admin.auth.admin.getUserById(profile.id)
          const email = userData?.user?.email
          if (email) {
            await sendWeeklyDigestEmail(email, superDigest)
              .catch(err => console.error(`[weekly-digest] super admin email failed:`, err))
            digestsSent++
          }
        } catch (err) {
          console.error(`[weekly-digest] super admin ${profile.id} failed:`, err)
        }
      }
    }

    return NextResponse.json({
      success: true,
      digestsSent,
      timestamp: now.toISOString(),
    })
  } catch (error) {
    console.error('[weekly-digest] cron failed:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    )
  }
}
