import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Breadcrumbs } from '@/components/shared/breadcrumbs'
import { DashboardTabsClient } from '@/components/dashboard/dashboard-tabs-client'
import { UserClassifiedCard } from '@/components/marketplace/user-classified-card'
import { Plus, ShoppingBag, Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function DashboardPage({
  searchParams
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const params = await searchParams
  const activeTab = (params.tab as 'business' | 'marketplace' | 'favorites') || 'business'

  // Fetch counts for badges
  const { count: classifiedsCount } = await supabase
    .from('classifieds')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const { count: favoritesCount } = await supabase
    .from('classified_favorites')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  // Fetch user's community slug
  const { data: profile } = await supabase
    .from('profiles')
    .select('community_id, communities(slug)')
    .eq('id', user.id)
    .single()

  const communitySlug = (profile?.communities as any)?.slug || 'parqueindustrial'

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <Breadcrumbs items={[{ label: 'Panel de Control', active: true }]} />

      <h1 className="text-4xl md:text-6xl font-heading font-black uppercase tracking-tighter italic border-b-4 border-black pb-4 mb-8">
        Panel de <span className="text-primary">Control</span>
      </h1>

      <DashboardTabsClient
        activeTab={activeTab}
        classifiedsCount={classifiedsCount || 0}
        favoritesCount={favoritesCount || 0}
      />

      {activeTab === 'business' && (
        <div className="brutalist-card p-12 text-center">
          <p className="text-black/60">Business tab content (existing implementation to preserve)</p>
        </div>
      )}

      {activeTab === 'marketplace' && (
        <MarketplaceTabContent userId={user.id} communitySlug={communitySlug} />
      )}

      {activeTab === 'favorites' && (
        <FavoritesTabContent userId={user.id} communitySlug={communitySlug} />
      )}
    </div>
  )
}

// Marketplace Tab Content
async function MarketplaceTabContent({
  userId,
  communitySlug
}: {
  userId: string
  communitySlug: string
}) {
  const supabase = await createClient()

  // Fetch user's classifieds
  const { data: classifieds } = await supabase
    .from('classifieds')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  const activeCount = classifieds?.filter(c => c.status === 'active').length || 0
  const soldCount = classifieds?.filter(c => c.status === 'sold').length || 0
  const archivedCount = classifieds?.filter(c => c.status === 'archived').length || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="font-heading font-black uppercase text-2xl mb-2">
            Mis Clasificados
          </h2>
          <p className="text-sm text-black/60 uppercase tracking-widest">
            {activeCount} activos · {soldCount} vendidos · {archivedCount} archivados
          </p>
        </div>

        <Link href="/dashboard/marketplace/new">
          <Button className="brutalist-button bg-primary text-primary-foreground gap-2">
            <Plus className="h-4 w-4" />
            Publicar Nuevo
          </Button>
        </Link>
      </div>

      {/* Classifieds grid */}
      {classifieds && classifieds.length > 0 ? (
        <div className="grid gap-4">
          {classifieds.map(classified => (
            <UserClassifiedCard
              key={classified.id}
              classified={classified}
              communitySlug={communitySlug}
            />
          ))}
        </div>
      ) : (
        <div className="brutalist-card p-12 text-center space-y-4">
          <ShoppingBag className="h-16 w-16 mx-auto text-black/20" />
          <h3 className="font-heading font-black uppercase text-2xl">
            Sin Clasificados
          </h3>
          <p className="text-black/60">
            ¡Publica tu primer artículo en el marketplace!
          </p>
          <Link href="/dashboard/marketplace/new">
            <Button className="brutalist-button bg-primary inline-flex gap-2">
              <Plus className="h-4 w-4" />
              Publicar Ahora
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}

// Favorites Tab Content
async function FavoritesTabContent({
  userId,
  communitySlug
}: {
  userId: string
  communitySlug: string
}) {
  const supabase = await createClient()

  // Fetch user's favorites with classified data
  const { data: favorites } = await supabase
    .from('classified_favorites')
    .select(`
      id,
      created_at,
      classifieds (
        id,
        title,
        description,
        price,
        images,
        status,
        created_at,
        whatsapp,
        user_id,
        category_id,
        community_id
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  const classifieds = favorites?.map(f => f.classifieds).filter(Boolean) || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-heading font-black uppercase text-2xl mb-2">
          Favoritos
        </h2>
        <p className="text-sm text-black/60 uppercase tracking-widest">
          {classifieds.length} clasificados guardados
        </p>
      </div>

      {/* Favorites grid */}
      {classifieds.length > 0 ? (
        <div className="grid gap-4">
          {classifieds.map((classified: any) => (
            <UserClassifiedCard
              key={classified.id}
              classified={classified}
              communitySlug={communitySlug}
            />
          ))}
        </div>
      ) : (
        <div className="brutalist-card p-12 text-center space-y-4">
          <Heart className="h-16 w-16 mx-auto text-black/20" />
          <h3 className="font-heading font-black uppercase text-2xl">
            Sin Favoritos
          </h3>
          <p className="text-black/60">
            Guarda clasificados que te interesen para encontrarlos fácilmente después
          </p>
          <Link href={`/${communitySlug}/marketplace`}>
            <Button className="brutalist-button bg-primary inline-flex gap-2">
              <ShoppingBag className="h-4 w-4" />
              Explorar Marketplace
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
