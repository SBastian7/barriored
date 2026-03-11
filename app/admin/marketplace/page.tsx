'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { ClassifiedCard } from '@/components/marketplace/classified-card'
import { MarketplaceFilters } from '@/components/marketplace/marketplace-filters'
import type { ClassifiedWithRelations } from '@/lib/types/database'

export default function AdminMarketplacePage() {
  const supabase = createClient()
  const [classifieds, setClassifieds] = useState<ClassifiedWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    category: 'all',
    status: 'all',
  })
  const [stats, setStats] = useState({
    active: 0,
    soldThisWeek: 0,
    flagged: 0,
    bannedUsers: 0,
  })

  useEffect(() => {
    fetchClassifieds()
    fetchStats()
  }, [filters])

  async function fetchClassifieds() {
    setLoading(true)

    const params = new URLSearchParams()
    if (filters.category !== 'all') params.append('category', filters.category)
    if (filters.status !== 'all') params.append('status', filters.status)

    const response = await fetch(`/api/admin/marketplace?${params.toString()}`)
    const data = await response.json()

    if (response.ok) {
      setClassifieds(data.classifieds || [])
    } else {
      toast.error(data.error || 'Error al cargar clasificados')
    }

    setLoading(false)
  }

  async function fetchStats() {
    // Fetch active count
    const { count: activeCount } = await supabase
      .from('classifieds')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    // Fetch sold this week
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const { count: soldCount } = await supabase
      .from('classifieds')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'sold')
      .gte('sold_at', weekAgo.toISOString())

    // Fetch flagged count
    const { count: flaggedCount } = await supabase
      .from('classifieds')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'flagged')

    // Fetch banned users count
    const { count: bannedCount } = await supabase
      .from('marketplace_user_bans')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)

    setStats({
      active: activeCount || 0,
      soldThisWeek: soldCount || 0,
      flagged: flaggedCount || 0,
      bannedUsers: bannedCount || 0,
    })
  }

  async function handleMarkSold(id: string) {
    const response = await fetch(`/api/admin/marketplace/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'sold' }),
    })

    if (response.ok) {
      toast.success('Clasificado marcado como vendido')
      fetchClassifieds()
      fetchStats()
    } else {
      const data = await response.json()
      toast.error(data.error || 'Error al actualizar')
    }
  }

  async function handleArchive(id: string) {
    const response = await fetch(`/api/admin/marketplace/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'archived' }),
    })

    if (response.ok) {
      toast.success('Clasificado archivado')
      fetchClassifieds()
      fetchStats()
    } else {
      const data = await response.json()
      toast.error(data.error || 'Error al archivar')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Estás seguro de eliminar este clasificado?')) return

    const response = await fetch(`/api/admin/marketplace/${id}`, {
      method: 'DELETE',
    })

    if (response.ok) {
      toast.success('Clasificado eliminado')
      fetchClassifieds()
      fetchStats()
    } else {
      const data = await response.json()
      toast.error(data.error || 'Error al eliminar')
    }
  }

  function handleFilterChange(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  function handleClearFilters() {
    setFilters({ category: 'all', status: 'all' })
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-12">
      <header className="space-y-2">
        <h1 className="text-4xl font-heading font-black uppercase italic tracking-tighter">
          Moderación de <span className="text-primary">Marketplace</span>
        </h1>
        <p className="font-bold text-black/60">
          Gestiona los clasificados de la comunidad.
        </p>
      </header>

      {/* Stats Strip */}
      <div className="flex divide-x-4 divide-black border-4 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex-1 p-6 text-center">
          <p className="text-4xl font-black text-emerald-600">{stats.active}</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mt-1">
            Activos
          </p>
        </div>
        <div className="flex-1 p-6 text-center">
          <p className="text-4xl font-black text-blue-600">
            {stats.soldThisWeek}
          </p>
          <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mt-1">
            Vendidos (7 días)
          </p>
        </div>
        <div className="flex-1 p-6 text-center">
          <p className="text-4xl font-black text-red-600">{stats.flagged}</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mt-1">
            Marcados
          </p>
        </div>
        <div className="flex-1 p-6 text-center">
          <p className="text-4xl font-black text-gray-600">
            {stats.bannedUsers}
          </p>
          <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mt-1">
            Usuarios Suspendidos
          </p>
        </div>
      </div>

      {/* Filters */}
      <MarketplaceFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        totalCount={classifieds.length}
        filteredCount={classifieds.length}
      />

      {/* Classifieds Grid */}
      <section className="space-y-6">
        {classifieds.length === 0 ? (
          <Card className="border-4 border-black border-dashed bg-white shadow-none py-12 text-center">
            <p className="font-bold text-black/30 uppercase tracking-widest">
              No hay clasificados que coincidan con los filtros
            </p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {classifieds.map((classified) => (
              <ClassifiedCard
                key={classified.id}
                classified={classified}
                onMarkSold={handleMarkSold}
                onArchive={handleArchive}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
