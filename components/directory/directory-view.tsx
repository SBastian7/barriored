'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { BusinessCard } from './business-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  Search, Map, LayoutGrid, ArrowUpDown,
  SortAsc, SortDesc, Clock, AlignLeft
} from 'lucide-react'

const MapView = dynamic(() => import('@/components/map/map-view'), {
  ssr: false,
  loading: () => (
    <div className="h-[500px] border-2 border-black bg-black/5 flex items-center justify-center">
      <p className="font-black uppercase tracking-widest text-black/30 text-sm">Cargando mapa...</p>
    </div>
  ),
})

type SortOption = 'newest' | 'oldest' | 'name_asc' | 'name_desc'

type Business = {
  id: string
  name: string
  slug: string
  description: string | null
  photos: string[] | null
  whatsapp: string | null
  address: string | null
  location?: any
  created_at?: string | null
  categories: { name: string; slug: string } | null
}

type Category = {
  id: string
  name: string
  slug: string
}

type Props = {
  businesses: Business[]
  categories: Category[]
  communitySlug: string
  initialQuery?: string
  initialCategory?: string
}

const SORT_OPTIONS: { value: SortOption; label: string; icon: React.ReactNode }[] = [
  { value: 'newest', label: 'Recientes', icon: <Clock className="h-3 w-3" /> },
  { value: 'oldest', label: 'Antiguos', icon: <Clock className="h-3 w-3 rotate-180" /> },
  { value: 'name_asc', label: 'A-Z', icon: <SortAsc className="h-3 w-3" /> },
  { value: 'name_desc', label: 'Z-A', icon: <SortDesc className="h-3 w-3" /> },
]

export function DirectoryView({
  businesses,
  categories,
  communitySlug,
  initialQuery = '',
  initialCategory,
}: Props) {
  const router = useRouter()
  const [query, setQuery] = useState(initialQuery)
  const [activeCategory, setActiveCategory] = useState<string | null>(initialCategory ?? null)
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid')
  const [showSortMenu, setShowSortMenu] = useState(false)

  // Filter businesses by search query and category
  const filtered = useMemo(() => {
    let result = [...businesses]

    // Filter by search query (client-side for existing results)
    if (query.trim()) {
      const q = query.toLowerCase().trim()
      result = result.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          (b.description?.toLowerCase().includes(q)) ||
          (b.address?.toLowerCase().includes(q)) ||
          (b.categories?.name.toLowerCase().includes(q))
      )
    }

    // Filter by category
    if (activeCategory) {
      result = result.filter((b) => b.categories?.slug === activeCategory)
    }

    // Sort
    switch (sortBy) {
      case 'newest':
        result.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
        break
      case 'oldest':
        result.sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''))
        break
      case 'name_asc':
        result.sort((a, b) => a.name.localeCompare(b.name, 'es'))
        break
      case 'name_desc':
        result.sort((a, b) => b.name.localeCompare(a.name, 'es'))
        break
    }

    return result
  }, [businesses, query, activeCategory, sortBy])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    // For deeper search, navigate to server-side with ?q param
    if (query.trim()) {
      router.push(`/${communitySlug}/directory?q=${encodeURIComponent(query.trim())}`)
    }
  }

  function clearFilters() {
    setQuery('')
    setActiveCategory(null)
    setSortBy('newest')
  }

  const hasActiveFilters = query.trim() || activeCategory || sortBy !== 'newest'
  const currentSort = SORT_OPTIONS.find(o => o.value === sortBy)

  return (
    <div className="space-y-6">
      {/* Search + View toggle toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black/40" />
          <Input
            placeholder="Buscar negocios..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 pr-4"
          />
        </form>

        {/* Sort + View controls */}
        <div className="flex gap-2">
          {/* Sort dropdown */}
          <div className="relative">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="gap-2 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
            >
              <ArrowUpDown className="h-4 w-4" />
              <span className="font-black uppercase text-[10px] tracking-widest hidden sm:inline ">{currentSort?.label}</span>
            </Button>
            {showSortMenu && (
              <div className="absolute right-0 top-full mt-1 z-50 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] min-w-[160px]">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { setSortBy(opt.value); setShowSortMenu(false) }}
                    className={cn(
                      'flex items-center gap-2 w-full px-3 py-2 text-left text-xs font-bold uppercase tracking-wider hover:bg-black/5 transition-colors',
                      sortBy === opt.value && 'bg-primary/10 text-primary'
                    )}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* View toggle */}
          <div className="flex border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-2 transition-colors',
                viewMode === 'grid' ? 'bg-primary text-white' : 'bg-white hover:bg-black/5'
              )}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('map')}
              className={cn(
                'p-2 border-l-2 border-black transition-colors',
                viewMode === 'map' ? 'bg-primary text-white' : 'bg-white hover:bg-black/5'
              )}
            >
              <Map className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Category filter chips */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveCategory(null)}
          className={cn(
            'px-4 py-1.5 text-xs font-black uppercase tracking-widest border-2 border-black transition-all',
            !activeCategory
              ? 'bg-primary text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'
              : 'bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-black/5'
          )}
        >
          Todos
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(activeCategory === cat.slug ? null : cat.slug)}
            className={cn(
              'px-4 py-1.5 text-xs font-black uppercase tracking-widest border-2 border-black transition-all',
              activeCategory === cat.slug
                ? 'bg-secondary text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'
                : 'bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-black/5'
            )}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Active filters summary */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-black uppercase tracking-widest text-black/40">Filtros:</span>
          {query.trim() && (
            <Badge variant="outline" className="text-xs gap-1">
              <Search className="h-3 w-3" /> "{query}"
            </Badge>
          )}
          {activeCategory && (
            <Badge variant="secondary" className="text-xs gap-1">
              {categories.find(c => c.slug === activeCategory)?.name}
            </Badge>
          )}
          {sortBy !== 'newest' && (
            <Badge variant="outline" className="text-xs gap-1">
              {currentSort?.icon} {currentSort?.label}
            </Badge>
          )}
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs font-bold text-primary hover:underline uppercase tracking-wider"
          >
            Limpiar
          </button>
        </div>
      )}

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-black uppercase tracking-widest text-black/40">
          {filtered.length} negocio{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 border-4 border-dashed border-black bg-white/50">
          <p className="text-2xl font-black uppercase italic tracking-tighter text-black/40">
            No se encontraron negocios
          </p>
          <p className="font-bold text-black/60 mt-2">
            Intenta con otra busqueda o categoria.
          </p>
          {hasActiveFilters && (
            <Button
              type="button"
              variant="outline"
              onClick={clearFilters}
              className="mt-4 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            >
              <span className="font-black uppercase text-xs tracking-wider">Limpiar filtros</span>
            </Button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((biz) => (
            <BusinessCard key={biz.id} business={biz} communitySlug={communitySlug} />
          ))}
        </div>
      ) : (
        <div className="h-[500px] border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <MapView businesses={filtered} communitySlug={communitySlug} />
        </div>
      )}
    </div>
  )
}
