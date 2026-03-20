import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  // Verify cron secret (security)
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  try {
    // Expire subscriptions
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

    // Expire banners
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

    return NextResponse.json({
      success: true,
      expiredSubscriptions: expiredSubs?.length || 0,
      expiredBanners: expiredBanners?.length || 0,
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
