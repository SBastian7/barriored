import { Building2, Clock, Users, UserPlus, Bell, Flag } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

interface StatsCardsProps {
  communityId: string
}

interface StatCardProps {
  title: string
  value: number
  icon: React.ReactNode
}

function StatCard({ title, value, icon }: StatCardProps) {
  return (
    <div className="brutalist-card p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-sm uppercase tracking-widest font-bold text-gray-600 mb-2">
            {title}
          </p>
          <p className="text-4xl font-black">
            {value.toLocaleString()}
          </p>
        </div>
        <div className="text-primary">
          {icon}
        </div>
      </div>
    </div>
  )
}

async function getStats(communityId: string) {
  const supabase = await createClient()

  // Total businesses
  const { count: totalBusinesses } = await supabase
    .from('businesses')
    .select('*', { count: 'exact', head: true })
    .eq('community_id', communityId)

  // Pending businesses
  const { count: pendingBusinesses } = await supabase
    .from('businesses')
    .select('*', { count: 'exact', head: true })
    .eq('community_id', communityId)
    .eq('status', 'pending')

  // Total users
  const { count: totalUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })

  // New users (last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { count: newUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', sevenDaysAgo)

  // Active alerts
  const { count: activeAlerts } = await supabase
    .from('community_posts')
    .select('*', { count: 'exact', head: true })
    .eq('community_id', communityId)
    .eq('type', 'alert')
    .eq('status', 'active')

  // Total reports
  const { count: totalReports } = await supabase
    .from('reports')
    .select('*', { count: 'exact', head: true })
    .eq('community_id', communityId)

  return {
    totalBusinesses: totalBusinesses || 0,
    pendingBusinesses: pendingBusinesses || 0,
    totalUsers: totalUsers || 0,
    newUsers: newUsers || 0,
    activeAlerts: activeAlerts || 0,
    totalReports: totalReports || 0,
  }
}

export async function StatsCards({ communityId }: StatsCardsProps) {
  const stats = await getStats(communityId)

  return (
    <div>
      <h2 className="text-xl font-black uppercase tracking-widest mb-4">
        Métricas del Sistema
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Total Negocios"
          value={stats.totalBusinesses}
          icon={<Building2 className="h-8 w-8" />}
        />
        <StatCard
          title="Pendientes"
          value={stats.pendingBusinesses}
          icon={<Clock className="h-8 w-8" />}
        />
        <StatCard
          title="Total Usuarios"
          value={stats.totalUsers}
          icon={<Users className="h-8 w-8" />}
        />
        <StatCard
          title="Nuevos (7 días)"
          value={stats.newUsers}
          icon={<UserPlus className="h-8 w-8" />}
        />
        <StatCard
          title="Alertas Activas"
          value={stats.activeAlerts}
          icon={<Bell className="h-8 w-8" />}
        />
        <StatCard
          title="Total Reportes"
          value={stats.totalReports}
          icon={<Flag className="h-8 w-8" />}
        />
      </div>
    </div>
  )
}
