import { createClient } from '@/lib/supabase/server'
import { HeroBanner } from '@/components/home/hero-banner'
import { CategoryGrid } from '@/components/home/category-grid'
import { FeaturedBusinesses } from '@/components/home/featured-businesses'

export default async function CommunityHomePage({ params }: { params: Promise<{ community: string }> }) {
  const { community: slug } = await params
  const supabase = await createClient()

  const { data: community } = await supabase
    .from('communities')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!community) return null

  const [categoriesRes, businessCountRes, recentRes] = await Promise.all([
    supabase.from('categories').select('id, name, slug, icon').order('sort_order'),
    supabase.from('businesses').select('id', { count: 'exact', head: true })
      .eq('community_id', community.id).eq('status', 'approved'),
    supabase.from('businesses').select('id, name, slug, description, photos, whatsapp, address, categories(name, slug)')
      .eq('community_id', community.id).eq('status', 'approved')
      .order('created_at', { ascending: false }).limit(6),
  ])

  return (
    <>
      <HeroBanner community={community} businessCount={businessCountRes.count ?? 0} />
      <CategoryGrid categories={categoriesRes.data ?? []} communitySlug={slug} />
      <FeaturedBusinesses businesses={recentRes.data ?? []} communitySlug={slug} />
    </>
  )
}
