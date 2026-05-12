import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { HeroBanner } from '@/components/home/hero-banner'
import { QuickNav } from '@/components/home/quick-nav'
import { BusinessSection } from '@/components/home/featured-businesses'
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
          .select('id, name, slug, description, photos, whatsapp, address, is_featured, categories(name, slug)')
          .eq('community_id', community.id)
          .eq('status', 'approved')
          .eq('is_featured', true)
          .order('featured_order', { ascending: true, nullsFirst: false })
          .limit(3),

        (admin as any).from('businesses')
          .select('id, name, slug, description, photos, whatsapp, address, is_featured, categories(name, slug)')
          .eq('community_id', community.id)
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
          .limit(10),
      ])

      const featuredIds = (featuredRes.data ?? []).map((b: any) => b.id)
      const recentBusinesses = (recentRes.data ?? [])
        .filter((b: any) => !featuredIds.includes(b.id))
        .slice(0, 3)

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
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <BannerRotator placement="homepage" communityId={community.id} />
      </div>
      <QuickNav communitySlug={slug} />

      {/* Featured businesses section */}
      {featuredBusinesses.length > 0 && (
        <BusinessSection
          businesses={featuredBusinesses}
          communitySlug={slug}
          title="Destacados"
          showBadge={true}
        />
      )}

      {/* Recent businesses section */}
      {recentBusinesses.length > 0 && (
        <BusinessSection
          businesses={recentBusinesses}
          communitySlug={slug}
          title="Recientes"
          showBadge={false}
        />
      )}

      <RegisterCTA communitySlug={slug} />
    </>
  )
}
