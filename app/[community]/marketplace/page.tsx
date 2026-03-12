import { createClient } from '@/lib/supabase/server'
import { Breadcrumbs } from '@/components/shared/breadcrumbs'
import { MarketplaceHub } from '@/components/marketplace/marketplace-hub'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
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

  // Fetch community
  const { data: community } = await supabase
    .from('communities')
    .select('id, name, slug')
    .eq('slug', slug)
    .single<{ id: string; name: string; slug: string }>()

  if (!community) notFound()

  // Fetch active classifieds with relations
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

  // Check which classifieds user has favorited
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
    <div className="container mx-auto max-w-6xl px-4 py-8 pb-24">
      <Breadcrumbs
        items={[
          { label: community.name, href: `/${slug}` },
          { label: 'Marketplace', active: true },
        ]}
      />

      <header className="mb-12">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-4">
          <div className="space-y-2">
            <h1 className="text-5xl md:text-7xl font-heading font-black uppercase tracking-tighter italic">
              Clasifi<span className="text-primary">cados</span>
            </h1>
            <p className="text-lg font-bold text-black/60 uppercase tracking-widest">
              Compra, vende y arrienda en tu barrio
            </p>
          </div>

          {/* Create Classified CTA - Only for authenticated users */}
          {user && (
            <Link href="/dashboard/marketplace/new" className="md:mt-4">
              <Button className="brutalist-button bg-primary text-primary-foreground gap-2 w-full md:w-auto">
                <Plus className="h-5 w-5" />
                <span className="uppercase tracking-widest font-bold">Publicar Clasificado</span>
              </Button>
            </Link>
          )}
        </div>
      </header>

      <MarketplaceHub
        classifieds={(classifieds ?? []) as ClassifiedWithRelations[]}
        communitySlug={slug}
        userId={user?.id}
        favoritedIds={favoritedIds}
      />
    </div>
  )
}
