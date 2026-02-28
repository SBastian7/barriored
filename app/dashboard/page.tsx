import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus, Edit, Zap, MessageSquare, Calendar, Briefcase, Eye, Megaphone } from 'lucide-react'
import { Breadcrumbs } from '@/components/shared/breadcrumbs'
import { JobFilledToggle } from '@/components/community/job-filled-toggle'
import { PostDeleteButton } from '@/components/community/post-delete-button'
import { DeletionRequestButton } from '@/components/business/deletion-request-button'
import type { JobMetadata } from '@/lib/types'

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'accent' }> = {
  pending: { label: 'Pendiente', variant: 'secondary' },
  approved: { label: 'Aprobado', variant: 'default' },
  rejected: { label: 'Rechazado', variant: 'destructive' },
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles').select('community_id, communities(slug)').eq('id', user!.id).single() as { data: any }

  const { data: businesses } = await supabase
    .from('businesses')
    .select('id, name, status, created_at, deletion_requested, deletion_reason, categories(name)')
    .eq('owner_id', user!.id)
    .order('created_at', { ascending: false }) as { data: any }

  const { data: communityPosts } = await supabase
    .from('community_posts')
    .select('id, title, type, status, created_at, metadata, communities(slug, name)')
    .eq('author_id', user!.id)
    .order('created_at', { ascending: false }) as { data: any }

  const communitySlug = (profile?.communities as any)?.slug

  // Check promotion eligibility
  let canPromote = false
  let nextPromotionDate: Date | null = null

  if (businesses && businesses.length > 0 && businesses[0].status === 'approved') {
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    const { data: recentPromotion } = await supabase
      .from('community_posts')
      .select('created_at')
      .eq('type', 'promotion')
      .eq('metadata->>linked_business_id', businesses[0].id)
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
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <Breadcrumbs items={[{ label: 'Panel de Control', active: true }]} />
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <h1 className="text-5xl md:text-6xl font-heading font-black uppercase tracking-tighter italic text-shadow-md">
          Panel de <span className="text-primary italic">Control</span>
        </h1>
        {communitySlug && (
          <Link href={`/${communitySlug}/register`}>
            <Button className="h-12 px-8 text-lg py-6 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all font-black uppercase"><Plus className="h-6 w-6 mr-2" /> Registrar Negocio</Button>
          </Link>
        )}
      </div>

      <h2 className="text-2xl font-black uppercase tracking-tight italic mb-6 underline decoration-primary decoration-4 underline-offset-4">
        Mis Negocios
      </h2>

      {(!businesses || businesses.length === 0) ? (
        <div className="text-center py-20 border-4 border-dashed border-black bg-white/50">
          <p className="text-2xl font-black uppercase italic tracking-tighter text-black/40">No tienes negocios registrados</p>
          <p className="font-bold text-black/60 mt-2">¡Comienza digitalizando tu barrio ahora!</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {businesses.map((biz) => {
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

      {/* Promotion Widget */}
      {businesses && businesses.length > 0 && businesses[0].status === 'approved' && communitySlug && (
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
      {businesses && businesses.length > 0 && businesses[0] && !businesses[0].deletion_requested && (
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
              businessId={businesses[0].id}
              businessName={businesses[0].name}
            />
          </CardContent>
        </Card>
      )}

      {businesses && businesses.length > 0 && businesses[0]?.deletion_requested && (
        <Card className="brutalist-card border-secondary bg-secondary/10 mt-8">
          <CardHeader>
            <CardTitle>Eliminación Pendiente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              Tu solicitud de eliminación está siendo revisada por un administrador.
            </p>
            {businesses[0].deletion_reason && (
              <p className="text-sm text-muted-foreground mt-2">
                Razón: {businesses[0].deletion_reason}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <h2 className="text-2xl font-black uppercase tracking-tight italic mb-6 mt-16 underline decoration-accent decoration-4 underline-offset-4">
        Mis Publicaciones de Comunidad
      </h2>

      {(!communityPosts || communityPosts.length === 0) ? (
        <div className="text-center py-20 border-4 border-dashed border-black bg-white/50">
          <p className="text-2xl font-black uppercase italic tracking-tighter text-black/40">No tienes publicaciones</p>
          <p className="font-bold text-black/60 mt-2">Comparte anuncios, eventos o empleos con tu comunidad</p>
          {communitySlug && (
            <Link href={`/${communitySlug}/community`} className="inline-block mt-6">
              <Button className="h-12 px-8 text-lg border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all font-black uppercase">
                <Plus className="h-6 w-6 mr-2" /> Crear Publicación
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-6">
          {communityPosts.map((post) => {
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
  )
}
