'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatCard } from '@/components/admin/stat-card'
import {
  Store,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  Star,
  AlertTriangle,
  Loader2,
  Users,
  Shield,
} from 'lucide-react'
import { toast } from 'sonner'

type Stats = {
  businesses: {
    total: number
    pending: number
    approved: number
    rejected: number
    byCategory: { category: string; count: number }[]
    recentRegistrations7d: number
    recentRegistrations30d: number
    featured: number
    deletionRequests: number
  }
  users: {
    total: number
    newUsers7d: number
    newUsers30d: number
    byRole: { role: string; count: number }[]
    suspended: number
  }
}

export default function AdminStatisticsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'7d' | '30d'>('30d')
  const supabase = createClient()

  useEffect(() => {
    fetchStatistics()
  }, [])

  async function fetchStatistics() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('community_id, is_super_admin')
        .eq('id', user.id)
        .single()

      const now = new Date()
      const date7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const date30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      // Build base query
      let businessQuery = supabase.from('businesses').select('*', { count: 'exact' })

      // Filter by community for non-super-admins
      if (!profile?.is_super_admin && profile?.community_id) {
        businessQuery = businessQuery.eq('community_id', profile.community_id)
      }

      // Fetch business stats
      const [
        allBusinesses,
        pending,
        approved,
        rejected,
        featured,
        deletionRequests,
        recent7d,
        recent30d,
      ] = await Promise.all([
        businessQuery,
        businessQuery.eq('status', 'pending'),
        businessQuery.eq('status', 'approved'),
        businessQuery.eq('status', 'rejected'),
        businessQuery.eq('is_featured', true),
        businessQuery.eq('deletion_requested', true),
        businessQuery.gte('created_at', date7d.toISOString()),
        businessQuery.gte('created_at', date30d.toISOString()),
      ])

      // Fetch category breakdown
      let categoryQuery = supabase
        .from('businesses')
        .select('category_id, categories(name)')

      if (!profile?.is_super_admin && profile?.community_id) {
        categoryQuery = categoryQuery.eq('community_id', profile.community_id)
      }

      const { data: bizWithCategories } = await categoryQuery

      const byCategory = bizWithCategories?.reduce((acc, b: any) => {
        const cat = b.categories?.name || 'Sin categoría'
        const existing = acc.find(item => item.category === cat)
        if (existing) {
          existing.count++
        } else {
          acc.push({ category: cat, count: 1 })
        }
        return acc
      }, [] as { category: string; count: number }[]) || []

      // Fetch user stats
      let userQuery = supabase.from('profiles').select('*', { count: 'exact' })

      if (!profile?.is_super_admin && profile?.community_id) {
        userQuery = userQuery.eq('community_id', profile.community_id)
      }

      const [allUsers, newUsers7d, newUsers30d, suspended] = await Promise.all([
        userQuery,
        userQuery.gte('created_at', date7d.toISOString()),
        userQuery.gte('created_at', date30d.toISOString()),
        userQuery.eq('is_suspended', true),
      ])

      // Role distribution
      let roleQuery = supabase.from('profiles').select('role')

      if (!profile?.is_super_admin && profile?.community_id) {
        roleQuery = roleQuery.eq('community_id', profile.community_id)
      }

      const { data: roleData } = await roleQuery

      const byRole = roleData?.reduce((acc, p) => {
        const role = p.role || 'user'
        const existing = acc.find(item => item.role === role)
        if (existing) {
          existing.count++
        } else {
          acc.push({ role, count: 1 })
        }
        return acc
      }, [] as { role: string; count: number }[]) || []

      setStats({
        businesses: {
          total: allBusinesses.count || 0,
          pending: pending.count || 0,
          approved: approved.count || 0,
          rejected: rejected.count || 0,
          byCategory: byCategory.sort((a, b) => b.count - a.count),
          recentRegistrations7d: recent7d.count || 0,
          recentRegistrations30d: recent30d.count || 0,
          featured: featured.count || 0,
          deletionRequests: deletionRequests.count || 0,
        },
        users: {
          total: allUsers.count || 0,
          newUsers7d: newUsers7d.count || 0,
          newUsers30d: newUsers30d.count || 0,
          byRole,
          suspended: suspended.count || 0,
        },
      })
    } catch (error) {
      console.error('Error fetching statistics:', error)
      toast.error('Error al cargar estadísticas')
    } finally {
      setLoading(false)
    }
  }

  if (loading || !stats) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between border-b-4 border-black pb-4">
        <h1 className="text-4xl font-heading font-black uppercase italic tracking-tighter">
          Estadísticas de la <span className="text-primary italic">Plataforma</span>
        </h1>

        <div className="flex gap-2">
          <Button
            variant={period === '7d' ? 'default' : 'outline'}
            onClick={() => setPeriod('7d')}
            className="brutalist-button"
            size="sm"
          >
            7 Días
          </Button>
          <Button
            variant={period === '30d' ? 'default' : 'outline'}
            onClick={() => setPeriod('30d')}
            className="brutalist-button"
            size="sm"
          >
            30 Días
          </Button>
        </div>
      </div>

      {/* Business Stats */}
      <div>
        <h2 className="text-2xl font-black uppercase italic mb-4 flex items-center gap-2">
          <Store className="h-6 w-6" /> Negocios
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={Store}
            label="Total Negocios"
            value={stats.businesses.total}
            bg="bg-white"
          />
          <StatCard
            icon={Clock}
            label="Pendientes"
            value={stats.businesses.pending}
            bg="bg-secondary/20"
          />
          <StatCard
            icon={CheckCircle}
            label="Aprobados"
            value={stats.businesses.approved}
            bg="bg-green-50"
          />
          <StatCard
            icon={XCircle}
            label="Rechazados"
            value={stats.businesses.rejected}
            bg="bg-red-50"
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
          <StatCard
            icon={TrendingUp}
            label={`Nuevos (${period})`}
            value={
              period === '7d'
                ? stats.businesses.recentRegistrations7d
                : stats.businesses.recentRegistrations30d
            }
            bg="bg-accent/10"
          />
          <StatCard
            icon={Star}
            label="Destacados"
            value={stats.businesses.featured}
            bg="bg-yellow-50"
          />
          <StatCard
            icon={AlertTriangle}
            label="Solicitudes Eliminación"
            value={stats.businesses.deletionRequests}
            bg="bg-red-100"
          />
        </div>

        {/* By Category */}
        <Card className="brutalist-card mt-4">
          <CardHeader className="border-b-2 border-black">
            <CardTitle className="font-heading font-black uppercase italic text-lg">
              Negocios por Categoría
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-2">
              {stats.businesses.byCategory.map(({ category, count }) => (
                <div
                  key={category}
                  className="flex justify-between items-center border-b border-black/10 pb-2"
                >
                  <span className="font-bold">{category}</span>
                  <Badge className="brutalist-button">{count}</Badge>
                </div>
              ))}
              {stats.businesses.byCategory.length === 0 && (
                <p className="text-center text-black/40 py-4">No hay datos</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Stats */}
      <div>
        <h2 className="text-2xl font-black uppercase italic mb-4 flex items-center gap-2">
          <Users className="h-6 w-6" /> Usuarios
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Total Usuarios" value={stats.users.total} bg="bg-white" />
          <StatCard
            icon={TrendingUp}
            label={`Nuevos (${period})`}
            value={period === '7d' ? stats.users.newUsers7d : stats.users.newUsers30d}
            bg="bg-accent/10"
          />
          <StatCard
            icon={Shield}
            label="Moderadores/Admins"
            value={stats.users.byRole.filter(r => r.role !== 'user').reduce((sum, r) => sum + r.count, 0)}
            bg="bg-secondary/20"
          />
          <StatCard
            icon={AlertTriangle}
            label="Suspendidos"
            value={stats.users.suspended}
            bg="bg-red-50"
          />
        </div>

        {/* By Role */}
        <Card className="brutalist-card mt-4">
          <CardHeader className="border-b-2 border-black">
            <CardTitle className="font-heading font-black uppercase italic text-lg">
              Usuarios por Rol
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-2">
              {stats.users.byRole.map(({ role, count }) => (
                <div key={role} className="flex justify-between items-center border-b border-black/10 pb-2">
                  <span className="font-bold capitalize">{role}</span>
                  <Badge className="brutalist-button">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
