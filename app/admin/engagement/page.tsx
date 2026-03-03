'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/admin/stat-card'
import { Badge } from '@/components/ui/badge'
import {
  MessageSquare,
  TrendingUp,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Calendar,
  BarChart3,
  Activity,
  Target
} from 'lucide-react'

type EngagementStats = {
  totalPosts: number
  approvedPosts: number
  pendingPosts: number
  rejectedPosts: number
  approvalRate: number
  recentPosts7d: number
  recentPosts30d: number
  activeAuthors: number
  averageResponseTime: number
  postsByType: { type: string; count: number }[]
  postsByDay: { date: string; count: number }[]
  topAuthors: { name: string; count: number }[]
}

export default function AdminEngagementPage() {
  const [stats, setStats] = useState<EngagementStats | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchStats()
  }, [])

  async function fetchStats() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('community_id, is_super_admin')
        .eq('id', user.id)
        .single() as { data: any }

      const now = new Date()
      const date7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const date30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      // Helper to build fresh posts query
      const buildPostsQuery = () => {
        let query = supabase.from('community_posts').select('*', { count: 'exact' })
        if (!profile?.is_super_admin && profile?.community_id) {
          query = query.eq('community_id', profile.community_id)
        }
        return query
      }

      // Fetch post counts by status
      const [allPosts, approved, pending, rejected, recent7d, recent30d] = await Promise.all([
        buildPostsQuery(),
        buildPostsQuery().eq('status', 'approved'),
        buildPostsQuery().eq('status', 'pending'),
        buildPostsQuery().eq('status', 'rejected'),
        buildPostsQuery().gte('created_at', date7d.toISOString()),
        buildPostsQuery().gte('created_at', date30d.toISOString())
      ])

      // Fetch all posts for detailed analysis
      let detailQuery = supabase
        .from('community_posts')
        .select('*, profiles(full_name)')
        .order('created_at', { ascending: false })

      if (!profile?.is_super_admin && profile?.community_id) {
        detailQuery = detailQuery.eq('community_id', profile.community_id)
      }

      const { data: allPostsData } = await detailQuery

      // Calculate approval rate
      const total = allPosts.count || 0
      const approvedCount = approved.count || 0
      const approvalRate = total > 0 ? Math.round((approvedCount / total) * 100) : 0

      // Posts by type
      const postsByType = (allPostsData || []).reduce((acc, post: any) => {
        const existing = acc.find(item => item.type === post.type)
        if (existing) {
          existing.count++
        } else {
          acc.push({ type: post.type, count: 1 })
        }
        return acc
      }, [] as { type: string; count: number }[])

      // Posts by day (last 30 days)
      const postsByDay: { date: string; count: number }[] = []
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
        const dateStr = date.toISOString().split('T')[0]
        const count = (allPostsData || []).filter((p: any) => {
          const postDate = new Date(p.created_at).toISOString().split('T')[0]
          return postDate === dateStr
        }).length
        postsByDay.push({ date: dateStr, count })
      }

      // Top authors
      const authorCounts = (allPostsData || []).reduce((acc: any, post: any) => {
        const name = post.profiles?.full_name || 'Desconocido'
        acc[name] = (acc[name] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const topAuthors = Object.entries(authorCounts)
        .map(([name, count]): { name: string; count: number } => ({ name, count: count as number }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

      // Active authors (unique authors in last 30 days)
      const recentAuthors = new Set(
        (allPostsData || [])
          .filter((p: any) => new Date(p.created_at) >= date30d)
          .map((p: any) => p.author_id)
      )

      // Average response time (for approved posts)
      const approvedPosts = (allPostsData || []).filter((p: any) => p.status === 'approved')
      const responseTimes = approvedPosts
        .filter((p: any) => p.updated_at && p.created_at)
        .map((p: any) => {
          const created = new Date(p.created_at).getTime()
          const updated = new Date(p.updated_at).getTime()
          return Math.abs(updated - created) / (1000 * 60 * 60) // hours
        })

      const avgResponseTime = responseTimes.length > 0
        ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
        : 0

      setStats({
        totalPosts: total,
        approvedPosts: approvedCount,
        pendingPosts: pending.count || 0,
        rejectedPosts: rejected.count || 0,
        approvalRate,
        recentPosts7d: recent7d.count || 0,
        recentPosts30d: recent30d.count || 0,
        activeAuthors: recentAuthors.size,
        averageResponseTime: avgResponseTime,
        postsByType: postsByType.sort((a, b) => b.count - a.count),
        postsByDay,
        topAuthors
      })
    } catch (error) {
      console.error('Error fetching engagement stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const typeLabels: Record<string, string> = {
    announcement: 'Anuncios',
    event: 'Eventos',
    job: 'Empleos',
    promotion: 'Promociones'
  }

  if (loading || !stats) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b-4 border-black pb-4">
        <h1 className="text-4xl font-heading font-black uppercase italic tracking-tighter">
          Métricas de <span className="text-accent">Engagement</span>
        </h1>
        <p className="font-bold text-black/60 text-sm mt-2">
          Análisis de actividad y participación comunitaria
        </p>
      </div>

      {/* Overview Stats */}
      <div>
        <h2 className="text-2xl font-black uppercase italic mb-4 flex items-center gap-2">
          <Activity className="h-6 w-6" /> Resumen General
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={MessageSquare}
            label="Total Publicaciones"
            value={stats.totalPosts}
            bg="bg-white"
            iconBg="bg-primary"
            iconColor="text-white"
          />
          <StatCard
            icon={CheckCircle}
            label="Tasa de Aprobación"
            value={`${stats.approvalRate}%`}
            bg="bg-green-50"
            iconBg="bg-green-600"
            iconColor="text-white"
          />
          <StatCard
            icon={TrendingUp}
            label="Nuevas (7d)"
            value={stats.recentPosts7d}
            bg="bg-accent/10"
            iconBg="bg-accent"
            iconColor="text-white"
          />
          <StatCard
            icon={Users}
            label="Autores Activos (30d)"
            value={stats.activeAuthors}
            bg="bg-secondary/20"
            iconBg="bg-secondary"
            iconColor="text-black"
          />
        </div>
      </div>

      {/* Moderation Metrics */}
      <div>
        <h2 className="text-2xl font-black uppercase italic mb-4 flex items-center gap-2">
          <Target className="h-6 w-6" /> Métricas de Moderación
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={CheckCircle}
            label="Aprobadas"
            value={stats.approvedPosts}
            bg="bg-green-50"
            iconBg="bg-green-600"
            iconColor="text-white"
          />
          <StatCard
            icon={Clock}
            label="Pendientes"
            value={stats.pendingPosts}
            bg="bg-yellow-50"
            iconBg="bg-secondary"
            iconColor="text-black"
          />
          <StatCard
            icon={XCircle}
            label="Rechazadas"
            value={stats.rejectedPosts}
            bg="bg-red-50"
            iconBg="bg-red-600"
            iconColor="text-white"
          />
          <StatCard
            icon={Calendar}
            label="Tiempo Resp. Promedio"
            value={`${stats.averageResponseTime}h`}
            bg="bg-accent/10"
            iconBg="bg-accent"
            iconColor="text-white"
          />
        </div>
      </div>

      {/* Distribution Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Posts by Type */}
        <Card className="brutalist-card">
          <CardHeader className="border-b-2 border-black">
            <CardTitle className="font-heading font-black uppercase italic text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" /> Distribución por Tipo
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {stats.postsByType.map(({ type, count }) => {
                const percentage = stats.totalPosts > 0
                  ? Math.round((count / stats.totalPosts) * 100)
                  : 0
                return (
                  <div key={type} className="space-y-1">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-bold capitalize">{typeLabels[type] || type}</span>
                      <span className="font-black text-primary">{count}</span>
                    </div>
                    <div className="h-2 bg-black/10 border border-black rounded-none overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-black/40">
                      {percentage}% del total
                    </p>
                  </div>
                )
              })}
              {stats.postsByType.length === 0 && (
                <p className="text-center text-black/30 font-bold uppercase tracking-widest py-4">
                  Sin datos
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Authors */}
        <Card className="brutalist-card">
          <CardHeader className="border-b-2 border-black">
            <CardTitle className="font-heading font-black uppercase italic text-lg flex items-center gap-2">
              <Users className="h-5 w-5" /> Autores Más Activos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {stats.topAuthors.map(({ name, count }, index) => (
                <div
                  key={name}
                  className="flex items-center justify-between p-3 border-2 border-black bg-white hover:bg-primary/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Badge className="brutalist-button w-8 h-8 flex items-center justify-center">
                      {index + 1}
                    </Badge>
                    <span className="font-bold text-sm">{name}</span>
                  </div>
                  <Badge className="bg-accent text-white border-black">
                    {count} {count === 1 ? 'post' : 'posts'}
                  </Badge>
                </div>
              ))}
              {stats.topAuthors.length === 0 && (
                <p className="text-center text-black/30 font-bold uppercase tracking-widest py-4">
                  Sin datos
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Timeline */}
      <Card className="brutalist-card">
        <CardHeader className="border-b-2 border-black">
          <CardTitle className="font-heading font-black uppercase italic text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" /> Actividad (Últimos 30 Días)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Simple bar chart */}
            <div className="flex items-end justify-between gap-1 h-48">
              {stats.postsByDay.map(({ date, count }) => {
                const maxCount = Math.max(...stats.postsByDay.map(d => d.count), 1)
                const height = (count / maxCount) * 100
                const dateObj = new Date(date)
                const dayLabel = dateObj.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })

                return (
                  <div key={date} className="flex-1 flex flex-col items-center gap-1 group">
                    <div className="relative w-full">
                      <div
                        className="w-full bg-primary border border-black transition-all group-hover:bg-accent"
                        style={{ height: `${height}%`, minHeight: count > 0 ? '4px' : '0' }}
                      />
                      {count > 0 && (
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] font-black opacity-0 group-hover:opacity-100 transition-opacity">
                          {count}
                        </div>
                      )}
                    </div>
                    <span className="text-[8px] font-black text-black/40 uppercase rotate-45 origin-left whitespace-nowrap">
                      {dayLabel}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Summary */}
            <div className="flex justify-between items-center pt-4 border-t-2 border-black">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-black/40">
                  Total (30 días)
                </p>
                <p className="text-2xl font-black text-primary">{stats.recentPosts30d}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-black/40">
                  Promedio Diario
                </p>
                <p className="text-2xl font-black text-accent">
                  {Math.round(stats.recentPosts30d / 30)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
