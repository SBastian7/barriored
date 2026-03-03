'use client'

import { Building2, Users, MessageSquare, Bell, Shield } from 'lucide-react'

interface Props {
  community: any
}

export function CommunityStatsPanel({ community }: Props) {
  const stats = community.stats || {}

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <StatCard
        icon={<Building2 className="h-8 w-8" />}
        label="Negocios"
        value={stats.businesses_count || 0}
        color="bg-blue-500"
      />
      <StatCard
        icon={<Users className="h-8 w-8" />}
        label="Usuarios"
        value={stats.users_count || 0}
        color="bg-green-500"
      />
      <StatCard
        icon={<Shield className="h-8 w-8" />}
        label="Admins/Moderadores"
        value={stats.admins_count || 0}
        color="bg-purple-500"
      />
      <StatCard
        icon={<MessageSquare className="h-8 w-8" />}
        label="Posts Comunitarios"
        value={stats.posts_count || 0}
        color="bg-yellow-500"
      />
      <StatCard
        icon={<Bell className="h-8 w-8" />}
        label="Alertas Activas"
        value={stats.alerts_count || 0}
        color="bg-red-500"
      />
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: number
  color: string
}) {
  return (
    <div className="brutalist-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${color} text-white`}>{icon}</div>
      </div>
      <div className="text-4xl font-black mb-2">{value}</div>
      <div className="text-sm uppercase tracking-widest font-bold text-muted-foreground">
        {label}
      </div>
    </div>
  )
}
