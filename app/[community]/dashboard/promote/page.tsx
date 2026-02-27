import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PromotionForm } from '@/components/community/promotion-form'
import { Card, CardContent } from '@/components/ui/card'

export const metadata = {
  title: 'Crear Promoción | BarrioRed',
}

export default async function PromotePage({ params }: { params: Promise<{ community: string }> }) {
  const { community: slug } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${slug}/auth/login`)

  const { data: community } = await supabase
    .from('communities')
    .select('id, name')
    .eq('slug', slug)
    .single<{ id: string; name: string }>()

  if (!community) notFound()

  // Get user's business
  const { data: business } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('owner_id', user.id)
    .eq('community_id', community.id)
    .eq('status', 'approved')
    .single<{ id: string; name: string }>()

  if (!business) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16">
        <Card className="brutalist-card">
          <CardContent className="py-12 text-center">
            <h2 className="text-2xl font-heading font-black uppercase mb-4">
              Negocio Requerido
            </h2>
            <p>Debes tener un negocio aprobado para crear promociones.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Check if business can promote (rate limiting)
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

  const { data: recentPromotion } = await supabase
    .from('community_posts')
    .select('id, created_at')
    .eq('type', 'promotion')
    .eq('metadata->>linked_business_id', business.id)
    .gte('created_at', oneWeekAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single<{ id: string; created_at: string }>()

  if (recentPromotion) {
    const nextAllowed = new Date(recentPromotion.created_at)
    nextAllowed.setDate(nextAllowed.getDate() + 7)

    return (
      <div className="container mx-auto max-w-2xl px-4 py-16">
        <Card className="brutalist-card">
          <CardContent className="py-12 text-center">
            <h2 className="text-2xl font-heading font-black uppercase mb-4">
              Límite Alcanzado
            </h2>
            <p>Ya creaste una promoción esta semana.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Próxima promoción disponible: {nextAllowed.toLocaleDateString('es-CO')}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-4xl md:text-5xl font-heading font-black uppercase italic mb-8">
        Crear <span className="text-primary">Promoción</span>
      </h1>
      <PromotionForm
        communityId={community.id}
        communitySlug={slug}
        businessId={business.id}
        businessName={business.name}
      />
    </div>
  )
}
