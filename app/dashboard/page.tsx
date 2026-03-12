import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Breadcrumbs } from '@/components/shared/breadcrumbs'
import { DashboardTabsClient } from '@/components/dashboard/dashboard-tabs-client'

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
        <div className="brutalist-card p-12 text-center">
          <p className="text-black/60">Marketplace tab (to implement)</p>
        </div>
      )}

      {activeTab === 'favorites' && (
        <div className="brutalist-card p-12 text-center">
          <p className="text-black/60">Favorites tab (to implement)</p>
        </div>
      )}
    </div>
  )
}
