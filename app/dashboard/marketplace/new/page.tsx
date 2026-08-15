import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Breadcrumbs } from '@/components/shared/breadcrumbs'
import { ClassifiedForm } from '@/components/marketplace/classified-form'

export const metadata = {
  title: 'Publicar Clasificado | BarrioRed',
  description: 'Publica tu clasificado en el marketplace de tu comunidad'
}

export default async function NewClassifiedPage() {
  const supabase = await createClient()

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/login?redirect=/dashboard/marketplace/new')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('community_id, communities(slug)')
    .eq('id', user.id)
    .single()
  const communitySlug = (profile?.communities as any)?.slug || 'parqueindustrial'

  // Check if banned
  const { data: ban } = await supabase
    .from('marketplace_user_bans')
    .select('reason, expires_at')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (ban && (!ban.expires_at || new Date(ban.expires_at) > new Date())) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-8 space-y-8">
        <Breadcrumbs
          homeHref={`/${communitySlug}`}
          items={[
            { label: 'Panel de Control', href: '/dashboard' },
            { label: 'Marketplace', href: '/dashboard?tab=marketplace' },
            { label: 'Publicar', active: true }
          ]}
        />

        <div className="brutalist-card p-8 border-primary bg-primary/5 max-w-2xl">
          <h2 className="font-heading font-black uppercase text-2xl mb-4">
            Cuenta Suspendida
          </h2>
          <p className="text-black/80 mb-2">
            <strong>Razón:</strong> {ban.reason}
          </p>
          {ban.expires_at ? (
            <p className="text-black/60 text-sm">
              Suspensión válida hasta: {new Date(ban.expires_at).toLocaleDateString('es-CO')}
            </p>
          ) : (
            <p className="text-black/60 text-sm">
              Suspensión permanente
            </p>
          )}
        </div>
      </div>
    )
  }

  // Fetch marketplace categories
  const { data: categories } = await supabase
    .from('marketplace_categories')
    .select('*')
    .eq('is_active', true)
    .order('display_order')

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 space-y-8">
      <Breadcrumbs
        homeHref={`/${communitySlug}`}
        items={[
          { label: 'Panel de Control', href: '/dashboard' },
          { label: 'Marketplace', href: '/dashboard?tab=marketplace' },
          { label: 'Publicar', active: true }
        ]}
      />

      <div>
        <h1 className="text-4xl md:text-6xl font-heading font-black uppercase tracking-tighter italic mb-2">
          Publicar <span className="text-primary">Clasificado</span>
        </h1>
        <p className="text-sm text-black/60 uppercase tracking-widest">
          Completa el formulario para publicar tu artículo
        </p>
      </div>

      <ClassifiedForm
        mode="create"
        categories={categories || []}
      />
    </div>
  )
}
