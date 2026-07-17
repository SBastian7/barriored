'use client'

import { useEffect, useState } from 'react'
import { Eye, Phone, Clock } from 'lucide-react'
import { AnalyticsChart } from '@/components/analytics/analytics-chart'

interface BusinessAnalyticsProps {
  businessId: string
}

interface AnalyticsData {
  totals: {
    profileViews: number
    whatsappClicks: number
    lastUpdated: string
  }
  chartData: {
    labels: string[]
    views: number[]
    clicks: number[]
  }
}

export function BusinessAnalytics({ businessId }: BusinessAnalyticsProps) {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch(`/api/businesses/${businessId}/analytics`)
        if (!res.ok) throw new Error('Failed to fetch analytics')
        const analytics = await res.json()
        setData(analytics)
      } catch (err) {
        setError('Error al cargar analíticas')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [businessId])

  if (loading) {
    return (
      <div className="brutalist-card p-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded mb-4 w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-24 bg-gray-200 rounded" />
          <div className="h-24 bg-gray-200 rounded" />
          <div className="h-24 bg-gray-200 rounded" />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="brutalist-card p-6 border-4 border-red-500">
        <p className="text-red-600 font-bold uppercase tracking-widest">
          {error || 'Sin datos disponibles'}
        </p>
      </div>
    )
  }

  const lastUpdated = new Date(data.totals.lastUpdated).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })

  return (
    <div className="space-y-6">
      {/* Section Heading */}
      <h2 className="font-black text-2xl uppercase tracking-widest italic">
        Analíticas
      </h2>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Views */}
        <div className="brutalist-card p-4 bg-white hover:translate-y-[-2px] transition-transform">
          <div className="flex items-center gap-3 mb-2">
            <Eye className="w-6 h-6" aria-hidden="true" />
            <span className="text-xs font-bold uppercase tracking-widest text-gray-600">
              Vistas Totales
            </span>
          </div>
          <p className="text-3xl font-black">{data.totals.profileViews.toLocaleString()}</p>
        </div>

        {/* Total Clicks */}
        <div className="brutalist-card p-4 bg-white hover:translate-y-[-2px] transition-transform">
          <div className="flex items-center gap-3 mb-2">
            <Phone className="w-6 h-6" aria-hidden="true" />
            <span className="text-xs font-bold uppercase tracking-widest text-gray-600">
              Clics WhatsApp
            </span>
          </div>
          <p className="text-3xl font-black">{data.totals.whatsappClicks.toLocaleString()}</p>
        </div>

        {/* Last Updated */}
        <div className="brutalist-card p-4 bg-white hover:translate-y-[-2px] transition-transform">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-6 h-6" aria-hidden="true" />
            <span className="text-xs font-bold uppercase tracking-widest text-gray-600">
              Última Actualización
            </span>
          </div>
          <p className="text-lg font-black">{lastUpdated}</p>
        </div>
      </div>

      {/* Analytics Chart */}
      <AnalyticsChart data={data.chartData} />
    </div>
  )
}
