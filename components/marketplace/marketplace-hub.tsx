'use client'

import { useState, useEffect } from 'react'
import { ClassifiedGrid } from './classified-grid'
import { ClassifiedCard } from './classified-card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Filter } from 'lucide-react'
import type { ClassifiedWithRelations } from '@/lib/types/database'

interface MarketplaceHubProps {
  classifieds: ClassifiedWithRelations[]
  communitySlug: string
  userId?: string | null
  favoritedIds?: string[]
}

export function MarketplaceHub({
  classifieds,
  communitySlug,
  userId,
  favoritedIds = []
}: MarketplaceHubProps) {
  const [filters, setFilters] = useState({
    category: 'all',
    search: ''
  })
  const [filteredClassifieds, setFilteredClassifieds] = useState(classifieds)

  // Get 3 newest for featured section
  const featuredClassifieds = classifieds.slice(0, 3)

  // Client-side filtering
  useEffect(() => {
    let filtered = classifieds

    // Filter by category
    if (filters.category !== 'all') {
      filtered = filtered.filter(c =>
        c.marketplace_categories.slug === filters.category
      )
    }

    // Filter by search query
    if (filters.search) {
      const query = filters.search.toLowerCase()
      filtered = filtered.filter(c =>
        c.title.toLowerCase().includes(query) ||
        c.description.toLowerCase().includes(query)
      )
    }

    setFilteredClassifieds(filtered)
  }, [filters, classifieds])

  return (
    <div className="space-y-8">
      {/* Featured Section */}
      {featuredClassifieds.length > 0 && (
        <section className="bg-secondary/20 border-4 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center gap-2 mb-6">
            <div className="bg-secondary px-3 py-1 border-2 border-black rotate-[-2deg]">
              <span className="text-[10px] font-black uppercase tracking-widest">
                Lo Más Nuevo
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {featuredClassifieds.map((classified) => (
              <ClassifiedCard
                key={classified.id}
                classified={classified}
                variant="public"
                userId={userId}
                isFavorited={favoritedIds.includes(classified.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Filter Bar */}
      <section className="flex flex-col md:flex-row gap-4 p-6 border-4 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex items-center gap-2 shrink-0">
          <Filter className="h-5 w-5 text-primary" />
          <span className="font-black uppercase tracking-widest text-[10px] text-black/40">
            Filtros:
          </span>
        </div>

        <div className="flex flex-col md:flex-row gap-4 flex-1">
          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <label className="font-black uppercase tracking-widest text-[10px] text-black/60 shrink-0">
              Categoría:
            </label>
            <Select
              value={filters.category}
              onValueChange={(v) => setFilters(prev => ({ ...prev, category: v }))}
            >
              <SelectTrigger className="brutalist-input w-full md:w-40 h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-2 border-black rounded-none">
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="vendo">Vendo</SelectItem>
                <SelectItem value="compro">Compro</SelectItem>
                <SelectItem value="arriendo">Arriendo</SelectItem>
                <SelectItem value="servicios">Servicios</SelectItem>
                <SelectItem value="trabajo">Trabajo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 flex-1">
            <label className="font-black uppercase tracking-widest text-[10px] text-black/60 shrink-0">
              Buscar:
            </label>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black/40" />
              <Input
                type="text"
                placeholder="Buscar por título o descripción..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="brutalist-input pl-10 h-10"
              />
            </div>
          </div>
        </div>

        {/* Result Count */}
        <div className="text-[10px] font-black uppercase tracking-widest text-black/40 self-center">
          Mostrando {filteredClassifieds.length} clasificados
        </div>
      </section>

      {/* Results Grid */}
      <ClassifiedGrid
        classifieds={filteredClassifieds}
        communitySlug={communitySlug}
        userId={userId}
        favoritedIds={favoritedIds}
      />
    </div>
  )
}
