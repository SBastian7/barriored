import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PendingItemsSummary } from '@/components/admin/dashboard/pending-items-summary'
import { StatsCards } from '@/components/admin/dashboard/stats-cards'
import { QuickActions } from '@/components/admin/dashboard/quick-actions'
import { RecentActivity } from '@/components/admin/dashboard/recent-activity'
import { Suspense } from 'react'

export const revalidate = 60 // Revalidate every 60 seconds

export const metadata = {
  title: 'Panel de Administración | BarrioRed',
  description: 'Dashboard administrativo de BarrioRed',
}

function LoadingCard() {
  return (
    <div className="brutalist-card p-6 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
      <div className="h-8 bg-gray-200 rounded w-1/3"></div>
    </div>
  )
}

function LoadingStats() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <LoadingCard key={i} />
      ))}
    </div>
  )
}

export default async function AdminDashboard() {
  const supabase = await createClient()

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/login')
  }

  // Check admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  if (!profile || profile.role !== 'admin') {
    redirect('/')
  }

  // Get community context (hardcoded for now, should come from context in multi-tenant)
  const { data: community } = await supabase
    .from('communities')
    .select('id, name')
    .single() as { data: { id: string; name: string } | null }

  if (!community) {
    return <div className="p-8">Error: No se encontró la comunidad</div>
  }

  return (
    <div className="p-8 space-y-6">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black uppercase tracking-tighter italic mb-2">
          Panel de Administración
        </h1>
        <p className="text-gray-600">
          Administración de {community.name}
        </p>
      </div>

      {/* Pending Items Alert Banner */}
      <Suspense fallback={<div className="h-20 animate-pulse bg-gray-100 border-2 border-black"></div>}>
        <PendingItemsSummary communityId={community.id} />
      </Suspense>

      {/* Stats Cards */}
      <Suspense fallback={<LoadingStats />}>
        <StatsCards communityId={community.id} />
      </Suspense>

      {/* Quick Actions */}
      <Suspense fallback={<div className="h-32 animate-pulse bg-gray-100"></div>}>
        <QuickActions communityId={community.id} />
      </Suspense>

      {/* Recent Activity */}
      <Suspense fallback={<div className="h-64 animate-pulse bg-gray-100"></div>}>
        <RecentActivity communityId={community.id} />
      </Suspense>
    </div>
  )
}
