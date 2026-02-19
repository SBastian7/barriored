import { createClient } from '@/lib/supabase/server'
import { HeroBanner } from '@/components/home/hero-banner'
import { QuickNav } from '@/components/home/quick-nav'
import { FeaturedBusinesses } from '@/components/home/featured-businesses'
import { RegisterCTA } from '@/components/home/register-cta'

export default async function CommunityHomePage({ params }: { params: Promise<{ community: string }> }) {
  const { community: slug } = await params
  const supabase = await createClient()

  const { data: community } = await supabase
    .from('communities')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!community) return null

  const [businessCountRes, recentRes] = await Promise.all([
    supabase.from('businesses').select('id', { count: 'exact', head: true })
      .eq('community_id', community.id).eq('status', 'approved'),
    supabase.from('businesses').select('id, name, slug, description, photos, whatsapp, address, categories(name, slug)')
      .eq('community_id', community.id).eq('status', 'approved')
      .order('created_at', { ascending: false }).limit(3),
  ])

  return (
    <>
      <HeroBanner community={community} businessCount={businessCountRes.count ?? 0} />
      <QuickNav communitySlug={slug} />
      <FeaturedBusinesses businesses={recentRes.data ?? []} communitySlug={slug} />
      <RegisterCTA communitySlug={slug} />
    </>
  )
}
