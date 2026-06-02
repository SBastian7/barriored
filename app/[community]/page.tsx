import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { HeroBanner } from '@/components/home/hero-banner'
import { MarqueeStrip } from '@/components/home/marquee-strip'
import { QuickNav } from '@/components/home/quick-nav'
import { FeaturedSection, RecentSection } from '@/components/home/featured-businesses'
import { RegisterCTA } from '@/components/home/register-cta'
import { BannerRotator } from '@/components/banners/banner-rotator'

function getCommunityHomepageData(slug: string) {
  return unstable_cache(
    async () => {
      const admin = createAdminClient()

      const { data: community } = await (admin as any)
        .from('communities')
        .select('*')
        .eq('slug', slug)
        .single()

      if (!community) return null

      const [businessCountRes, featuredRes, recentRes] = await Promise.all([
        (admin as any).from('businesses').select('id', { count: 'exact', head: true })
          .eq('community_id', community.id).eq('status', 'approved'),

        (admin as any).from('businesses')
          .select('id, name, slug, description, photos, whatsapp, address, created_at, is_featured, categories(name, slug)')
          .eq('community_id', community.id)
          .eq('status', 'approved')
          .eq('is_featured', true)
          .order('featured_order', { ascending: true, nullsFirst: false })
          .limit(4),

        (admin as any).from('businesses')
          .select('id, name, slug, description, photos, whatsapp, address, created_at, is_featured, categories(name, slug)')
          .eq('community_id', community.id)
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
          .limit(12),
      ])

      const featuredIds = (featuredRes.data ?? []).map((b: any) => b.id)
      const recentBusinesses = (recentRes.data ?? [])
        .filter((b: any) => !featuredIds.includes(b.id))
        .slice(0, 6)

      return {
        community,
        businessCount: businessCountRes.count ?? 0,
        featuredBusinesses: featuredRes.data ?? [],
        recentBusinesses,
      }
    },
    [`community-homepage-${slug}`],
    { revalidate: 3600, tags: [`businesses-${slug}`] }
  )()
}

export default async function CommunityHomePage({ params }: { params: Promise<{ community: string }> }) {
  const { community: slug } = await params

  const data = await getCommunityHomepageData(slug)
  if (!data) return null
  const { community, businessCount, featuredBusinesses, recentBusinesses } = data

  return (
    <>
      <HeroBanner community={community} businessCount={businessCount} />
      <MarqueeStrip />
      <QuickNav communitySlug={slug} />

      {featuredBusinesses.length > 0 && (
        <FeaturedSection businesses={featuredBusinesses} communitySlug={slug} />
      )}

      {/* Banner ads between sections */}
      <div className="px-6 md:px-8 py-6 max-w-350 mx-auto">
        <BannerRotator placement="homepage" communityId={community.id} />
      </div>

      {recentBusinesses.length > 0 && (
        <RecentSection businesses={recentBusinesses} communitySlug={slug} />
      )}

      <RegisterCTA communitySlug={slug} />
    </>
  )
}
