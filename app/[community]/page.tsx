import { createClient } from '@/lib/supabase/server'
import { HeroBanner } from '@/components/home/hero-banner'
import { QuickNav } from '@/components/home/quick-nav'
import { BusinessSection } from '@/components/home/featured-businesses'
import { RegisterCTA } from '@/components/home/register-cta'

export default async function CommunityHomePage({ params }: { params: Promise<{ community: string }> }) {
  const { community: slug } = await params
  const supabase = await createClient()

  const { data: community } = await supabase
    .from('communities')
    .select('*')
    .eq('slug', slug)
    .single<{
      id: string
      name: string
      slug: string
      municipality: string
      department: string
      description: string | null
      logo_url: string | null
      primary_color: string | null
      cover_image_url: string | null
      [key: string]: any
    }>()

  if (!community) return null

  const [businessCountRes, featuredRes, recentRes] = await Promise.all([
    supabase.from('businesses').select('id', { count: 'exact', head: true })
      .eq('community_id', community.id).eq('status', 'approved'),

    // Featured businesses query
    supabase.from('businesses').select('id, name, slug, description, photos, whatsapp, address, categories(name, slug)')
      .eq('community_id', community.id)
      .eq('status', 'approved')
      .eq('is_featured', true)
      .order('featured_order', { ascending: true, nullsFirst: false })
      .limit(3),

    // Recent businesses query (will exclude featured in next step)
    supabase.from('businesses').select('id, name, slug, description, photos, whatsapp, address, categories(name, slug)')
      .eq('community_id', community.id)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(10) // Fetch extra to account for featured exclusions
  ])

  // Exclude featured businesses from recent list
  const featuredIds = (featuredRes.data as any[] ?? []).map((b: any) => b.id)
  const recentBusinesses = (recentRes.data as any[] ?? []).filter((b: any) => !featuredIds.includes(b.id)).slice(0, 3)

  return (
    <>
      <HeroBanner community={community} businessCount={businessCountRes.count ?? 0} />
      <QuickNav communitySlug={slug} />

      {/* Featured businesses section */}
      {featuredRes.data && featuredRes.data.length > 0 && (
        <BusinessSection
          businesses={featuredRes.data}
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
