import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Breadcrumbs } from '@/components/shared/breadcrumbs'
import { DashboardTabsClient } from '@/components/dashboard/dashboard-tabs-client'
import { UserClassifiedCard } from '@/components/marketplace/user-classified-card'
import { Plus, ShoppingBag, Heart, Edit, Zap, MessageSquare, Calendar, Briefcase, Megaphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { JobFilledToggle } from '@/components/community/job-filled-toggle'
import { PostDeleteButton } from '@/components/community/post-delete-button'
import { DeletionRequestButton } from '@/components/business/deletion-request-button'
import { BusinessAnalytics } from '@/components/business/business-analytics'
import { PremiumStatusWidget } from '@/components/subscription/premium-status-widget'
import { BannerAdsManager } from '@/components/banners/banner-ads-manager'
import type { JobMetadata } from '@/lib/types'
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
        <BusinessTabContent userId={user.id} communitySlug={communitySlug} />
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

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'accent' }> = {
  pending: { label: 'Pendiente', variant: 'secondary' },
  approved: { label: 'Aprobado', variant: 'default' },
  rejected: { label: 'Rechazado', variant: 'destructive' },
}

// Business Tab Content
async function BusinessTabContent({
  userId,
  communitySlug
}: {
  userId: string
  communitySlug: string
}) {
  const supabase = await createClient()

  // Fetch user's businesses
  const { data: businesses } = await supabase
    .from('businesses')
    .select('id, name, status, created_at, deletion_requested, deletion_reason, categories(name)')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false }) as { data: any }

  // Fetch user's community posts
  const { data: communityPosts } = await supabase
    .from('community_posts')
    .select('id, title, type, status, created_at, metadata, communities(slug, name)')
    .eq('author_id', userId)
    .order('created_at', { ascending: false }) as { data: any }

  // Find first approved business
  const firstApprovedBusiness = businesses?.find(b => b.status === 'approved')

  // Check promotion eligibility
  let canPromote = false
  let nextPromotionDate: Date | null = null

  if (firstApprovedBusiness) {
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    const { data: recentPromotion } = await supabase
      .from('community_posts')
      .select('created_at')
      .eq('type', 'promotion')
      .eq('metadata->>linked_business_id', firstApprovedBusiness.id)
      .gte('created_at', oneWeekAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single() as { data: any }

    canPromote = !recentPromotion

    if (recentPromotion) {
      nextPromotionDate = new Date(recentPromotion.created_at)
      nextPromotionDate.setDate(nextPromotionDate.getDate() + 7)
    }
  }

  return (
    <div className="space-y-8">
      {/* Businesses Section */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black uppercase tracking-tight italic underline decoration-primary decoration-4 underline-offset-4">
            Mis Negocios
          </h2>
          <Link href={`/${communitySlug}/register`}>
            <Button className="h-12 px-8 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all font-black uppercase">
              <Plus className="h-6 w-6 mr-2" /> Registrar Negocio
            </Button>
          </Link>
        </div>

        {(!businesses || businesses.length === 0) ? (
          <div className="text-center py-20 border-4 border-dashed border-black bg-white/50">
            <p className="text-2xl font-black uppercase italic tracking-tighter text-black/40">No tienes negocios registrados</p>
            <p className="font-bold text-black/60 mt-2">¡Comienza digitalizando tu barrio ahora!</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {businesses.map((biz: any) => {
              const s = STATUS_LABELS[biz.status as keyof typeof STATUS_LABELS] ?? STATUS_LABELS.pending
              return (
                <Card key={biz.id} className="border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all bg-white overflow-hidden group rounded-none">
                  <CardHeader className="flex flex-row items-center justify-between p-6">
                    <div className="flex items-center gap-4">
                      <div className="bg-muted border-2 border-black p-3 group-hover:bg-primary transition-colors text-black group-hover:text-white">
                        <Zap className="h-6 w-6 fill-current" />
                      </div>
                      <div>
                        <CardTitle className="text-3xl font-heading font-black uppercase italic tracking-tighter leading-none mb-1 group-hover:text-primary transition-colors">{biz.name}</CardTitle>
                        <p className="text-xs font-black uppercase tracking-widest text-black/50 italic">{(biz.categories as any)?.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant={s.variant as any} className="text-[10px] px-3 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">{s.label}</Badge>
                      <Link href={`/dashboard/business/${biz.id}/edit`}>
                        <Button variant="outline" size="icon" className="h-12 w-12 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-secondary transition-all rounded-none">
                          <Edit className="h-6 w-6" />
                        </Button>
                      </Link>
                    </div>
                  </CardHeader>
                </Card>
              )
            })}
          </div>
        )}

        {/* Business Analytics */}
        {firstApprovedBusiness && (
          <div className="mt-8">
            <BusinessAnalytics businessId={firstApprovedBusiness.id} />
          </div>
        )}

        {/* Premium Status Widget */}
        {firstApprovedBusiness && (
          <div className="mt-8">
            <PremiumStatusWidget businessId={firstApprovedBusiness.id} />
          </div>
        )}

        {/* Banner Ads Manager */}
        {firstApprovedBusiness && (
          <div className="mt-8">
            <BannerAdsManager businessId={firstApprovedBusiness.id} />
          </div>
        )}

        {/* Promotion Widget */}
        {firstApprovedBusiness && (
          <Card className="brutalist-card border-secondary bg-secondary/5 mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-secondary" strokeWidth={3} />
                Promocionar mi Negocio
              </CardTitle>
              <CardDescription>
                Comparte ofertas y novedades con la comunidad
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {canPromote ? (
                <>
                  <p className="text-sm">
                    Crea una promoción para destacar ofertas especiales o novedades de tu negocio.
                  </p>
                  <Button asChild className="brutalist-button w-full">
                    <Link href={`/${communitySlug}/dashboard/promote`}>
                      <Megaphone className="h-4 w-4 mr-2" />
                      Crear Promoción
                    </Link>
                  </Button>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">
                    Ya creaste una promoción esta semana.
                  </p>
                  {nextPromotionDate && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Próxima disponible: {nextPromotionDate.toLocaleDateString('es-CO')}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Deletion Request Section */}
        {firstApprovedBusiness && !firstApprovedBusiness.deletion_requested && (
          <Card className="brutalist-card border-red-600 mt-8">
            <CardHeader>
              <CardTitle className="text-red-600">Zona de Peligro</CardTitle>
              <CardDescription>
                Las acciones aquí son permanentes y requieren aprobación administrativa.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Solicitar la eliminación desactivará tu perfil hasta que un
                administrador revise tu solicitud. Esta acción es reversible por el equipo.
              </p>
              <DeletionRequestButton
                businessId={firstApprovedBusiness.id}
                businessName={firstApprovedBusiness.name}
              />
            </CardContent>
          </Card>
        )}

        {firstApprovedBusiness?.deletion_requested && (
          <Card className="brutalist-card border-secondary bg-secondary/10 mt-8">
            <CardHeader>
              <CardTitle>Eliminación Pendiente</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                Tu solicitud de eliminación está siendo revisada por un administrador.
              </p>
              {firstApprovedBusiness.deletion_reason && (
                <p className="text-sm text-muted-foreground mt-2">
                  Razón: {firstApprovedBusiness.deletion_reason}
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Community Posts Section */}
      <div>
        <h2 className="text-2xl font-black uppercase tracking-tight italic mb-6 underline decoration-accent decoration-4 underline-offset-4">
          Mis Publicaciones de Comunidad
        </h2>

        {(!communityPosts || communityPosts.length === 0) ? (
          <div className="text-center py-20 border-4 border-dashed border-black bg-white/50">
            <p className="text-2xl font-black uppercase italic tracking-tighter text-black/40">No tienes publicaciones</p>
            <p className="font-bold text-black/60 mt-2">Comparte anuncios, eventos o empleos con tu comunidad</p>
            <Link href={`/${communitySlug}/community`} className="inline-block mt-6">
              <Button className="h-12 px-8 text-lg border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all font-black uppercase">
                <Plus className="h-6 w-6 mr-2" /> Crear Publicación
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-6">
            {communityPosts.map((post: any) => {
              const s = STATUS_LABELS[post.status as keyof typeof STATUS_LABELS] ?? STATUS_LABELS.pending
              const typeIcons = {
                announcement: { icon: MessageSquare, label: 'Anuncio', color: 'bg-primary', urlPath: 'anuncios' },
                event: { icon: Calendar, label: 'Evento', color: 'bg-accent', urlPath: 'eventos' },
                job: { icon: Briefcase, label: 'Empleo', color: 'bg-secondary', urlPath: 'empleos' },
              }
              const typeInfo = typeIcons[post.type as keyof typeof typeIcons] || typeIcons.announcement
              const Icon = typeInfo.icon
              const commSlug = (post.communities as any)?.slug

              return (
                <Card key={post.id} className="border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all bg-white overflow-hidden group rounded-none">
                  <CardHeader className="flex flex-row items-center justify-between p-6">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className={`${typeInfo.color} border-2 border-black p-3 transition-colors ${post.type === 'event' ? 'text-black' : 'text-white'}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-3xl font-heading font-black uppercase italic tracking-tighter leading-none mb-1 group-hover:text-primary transition-colors truncate">{post.title}</CardTitle>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <p className="text-xs font-black uppercase tracking-widest text-black/50 italic">{typeInfo.label}</p>
                          <span className="text-black/30">•</span>
                          <p className="text-xs font-black uppercase tracking-widest text-black/50 italic">{(post.communities as any)?.name}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <Badge variant={s.variant as any} className="text-[10px] px-3 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">{s.label}</Badge>
                      {post.type === 'job' && (post.metadata as JobMetadata)?.is_filled && (
                        <Badge className="bg-gray-500 text-white border-black border rounded-none text-[10px] px-3 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                          LLENO
                        </Badge>
                      )}
                      {post.type === 'job' && commSlug && (
                        <JobFilledToggle
                          postId={post.id}
                          isFilled={(post.metadata as JobMetadata)?.is_filled || false}
                          variant="compact"
                        />
                      )}
                      <div className="flex gap-2">
                        {commSlug && (
                          <Link href={`/${commSlug}/community/${typeInfo.urlPath}/${post.id}/edit`}>
                            <Button variant="outline" size="icon" className="h-12 w-12 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-secondary transition-all rounded-none">
                              <Edit className="h-6 w-6" />
                            </Button>
                          </Link>
                        )}
                        <PostDeleteButton postId={post.id} postTitle={post.title} />
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              )
            })}
          </div>
        )}
      </div>
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
