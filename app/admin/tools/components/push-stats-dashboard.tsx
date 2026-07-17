'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Bell, TrendingUp, Users, Calendar } from 'lucide-react'
import { toast } from 'sonner'

interface PushStats {
  overview: {
    total_sent: number
    delivery_rate: number
    active_subscribers: number
    avg_per_day: number
  }
}

export function PushStatsDashboard() {
  const [stats, setStats] = useState<PushStats | null>(null)
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const [statsRes, logsRes] = await Promise.all([
        fetch('/api/admin/notifications/stats?days=30'),
        fetch('/api/admin/notifications/logs?limit=10')
      ])

      if (!statsRes.ok || !logsRes.ok) throw new Error('Failed to fetch')

      const statsData = await statsRes.json()
      const logsData = await logsRes.json()

      setStats(statsData)
      setLogs(logsData.logs || [])
    } catch (error) {
      console.error('Fetch error:', error)
      toast.error('Error al cargar estadísticas')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-black/40 font-bold uppercase">
          No hay datos disponibles
        </p>
      </div>
    )
  }

  const statCards = [
    {
      title: 'Total Enviadas',
      value: stats.overview.total_sent,
      icon: Bell,
      color: 'bg-primary'
    },
    {
      title: 'Tasa de Entrega',
      value: `${(stats.overview.delivery_rate * 100).toFixed(1)}%`,
      icon: TrendingUp,
      color: 'bg-accent'
    },
    {
      title: 'Suscriptores',
      value: stats.overview.active_subscribers,
      icon: Users,
      color: 'bg-secondary'
    },
    {
      title: 'Promedio Diario',
      value: stats.overview.avg_per_day.toFixed(1),
      icon: Calendar,
      color: 'bg-[oklch(0.5_0.15_150)]'
    }
  ]

  return (
    <div className="space-y-8">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <Card
              key={card.title}
              className="border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden"
            >
              <CardContent className="p-0">
                <div className="flex">
                  <div className={`w-16 flex items-center justify-center ${card.color}`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="p-4 flex-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-1">
                      {card.title}
                    </p>
                    <p className="text-3xl font-heading font-black italic">
                      {card.value}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Recent Logs */}
      <Card className="border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <CardHeader>
          <CardTitle className="font-heading font-black uppercase italic">
            Notificaciones Recientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-center text-black/40 py-8">
              No hay notificaciones registradas
            </p>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 border-2 border-black rounded-none"
                >
                  <div className="flex-1">
                    <p className="font-bold">{log.title}</p>
                    <p className="text-xs text-black/60">
                      {log.communities?.name} • {new Date(log.sent_at).toLocaleDateString('es-CO')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-green-600">
                      ✓ {log.sent_count}
                    </p>
                    {log.failed_count > 0 && (
                      <p className="text-xs text-red-600">
                        ✗ {log.failed_count}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
