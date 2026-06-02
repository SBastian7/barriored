import { createClient } from '@/lib/supabase/server'
import { MarketplaceHub } from '@/components/marketplace/marketplace-hub'
import { notFound } from 'next/navigation'
import type { ClassifiedWithRelations } from '@/lib/types/database'

export async function generateMetadata({ params }: { params: Promise<{ community: string }> }) {
  const { community: slug } = await params
  const supabase = await createClient()
  const { data: community } = await supabase
    .from('communities')
    .select('name')
    .eq('slug', slug)
    .single<{ name: string }>()

  if (!community) return {}

  return {
    title: `Marketplace - Clasificados en ${community.name} | BarrioRed`,
    description: `Compra, vende y arrienda en ${community.name}. Clasificados locales de tu barrio.`
  }
}

export default async function MarketplacePage({
  params,
}: {
  params: Promise<{ community: string }>
}) {
  const { community: slug } = await params
  const supabase = await createClient()

  const { data: community } = await supabase
    .from('communities')
    .select('id, name, slug, cover_image_url')
    .eq('slug', slug)
    .single<{ id: string; name: string; slug: string; cover_image_url: string | null }>()

  if (!community) notFound()

  const { data: classifieds } = await supabase
    .from('classifieds')
    .select(`
      *,
      profiles!classifieds_user_id_fkey(full_name, avatar_url),
      marketplace_categories(name, slug, icon),
      communities(name, slug)
    `)
    .eq('community_id', community.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(50)

  const { data: { user } } = await supabase.auth.getUser()
  let favoritedIds: string[] = []

  if (user) {
    const { data: favorites } = await supabase
      .from('classified_favorites')
      .select('classified_id')
      .eq('user_id', user.id)

    favoritedIds = favorites?.map(f => f.classified_id) || []
  }

  return (
    <div className="pb-24 md:pb-0">
      <MarketplaceHub
        classifieds={(classifieds ?? []) as ClassifiedWithRelations[]}
        communitySlug={slug}
        communityName={community.name}
        coverImageUrl={community.cover_image_url}
        userId={user?.id}
        favoritedIds={favoritedIds}
      />
    </div>
  )
}
