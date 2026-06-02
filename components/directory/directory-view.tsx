'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { BusinessCard } from './business-card'
import { cn } from '@/lib/utils'
import { whatsappUrl } from '@/lib/utils'
import { getCategoryStyle } from '@/lib/category-colors'
import { Search, SortAsc, SortDesc, Clock, Filter } from 'lucide-react'

const MapView = dynamic(() => import('@/components/map/map-view'), {
  ssr: false,
  loading: () => (
    <div className="h-full border-2 border-black bg-[#EAE2D2] flex items-center justify-center">
      <p className="font-mono text-[11px] tracking-widest uppercase text-black/40">Cargando mapa...</p>
    </div>
  ),
})

const DEFAULT_CENTER = { lat: 4.8233, lng: -75.7313 }

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371
  const toRad = (d: number) => d * Math.PI / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function businessCoords(b: Business): { lat: number; lng: number } | null {
  const loc = b.location as any
  if (loc?.coordinates?.[0] != null && loc?.coordinates?.[1] != null) {
    return { lat: loc.coordinates[1], lng: loc.coordinates[0] }
  }
  if (b.latitude != null && b.longitude != null) {
    return { lat: b.latitude, lng: b.longitude }
  }
  return null
}

type SortOption = 'nearest' | 'newest' | 'oldest' | 'name_asc' | 'name_desc'

type Business = {
  id: string
  name: string
  slug: string
  description: string | null
  photos: string[] | null
  whatsapp: string | null
  address: string | null
  location?: any
  latitude?: number | null
  longitude?: number | null
  created_at?: string | null
  categories: { name: string; slug: string } | null
  is_featured?: boolean | null
  average_rating?: number | null
  review_count?: number | null
}

type Category = { id: string; name: string; slug: string }

type Props = {
  businesses: Business[]
  categories: Category[]
  communitySlug: string
  initialQuery?: string
  initialCategory?: string
  communityBoundary?: [number, number][]
  communityCenter?: { lat: number; lng: number }
}

function WhatsAppIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zm-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.002-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884zm8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  )
}

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex gap-px text-[12px]">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} style={{ color: i < Math.round(value) ? '#E11D48' : 'rgba(0,0,0,0.18)' }}>★</span>
      ))}
    </span>
  )
}

export function DirectoryView({ businesses, categories, communitySlug, initialQuery = '', initialCategory, communityBoundary, communityCenter }: Props) {
  const router = useRouter()
  const [query, setQuery] = useState(initialQuery)
  const [activeCategory, setActiveCategory] = useState<string | null>(initialCategory ?? null)
  const [sortBy, setSortBy] = useState<SortOption>('nearest')
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list')
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(communityCenter ?? DEFAULT_CENTER)

  const handleCenterChange = useCallback((lat: number, lng: number) => {
    setMapCenter({ lat, lng })
  }, [])

  const filtered = useMemo(() => {
    let result = [...businesses]
    if (query.trim()) {
      const q = query.toLowerCase().trim()
      result = result.filter(b =>
        b.name.toLowerCase().includes(q) ||
        b.description?.toLowerCase().includes(q) ||
        b.address?.toLowerCase().includes(q) ||
        b.categories?.name.toLowerCase().includes(q)
      )
    }
    if (activeCategory) result = result.filter(b => b.categories?.slug === activeCategory)
    return result
  }, [businesses, query, activeCategory])

  // Sort by selected method
  const sorted = useMemo(() => {
    const result = [...filtered]
    const refLat = mapCenter.lat
    const refLng = mapCenter.lng
    switch (sortBy) {
      case 'nearest':
        result.sort((a, b) => {
          const ca = businessCoords(a)
          const cb = businessCoords(b)
          if (!ca && !cb) return 0
          if (!ca) return 1
          if (!cb) return -1
          return haversineKm(refLat, refLng, ca.lat, ca.lng) - haversineKm(refLat, refLng, cb.lat, cb.lng)
        })
        break
      case 'newest': result.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? '')); break
      case 'oldest': result.sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? '')); break
      case 'name_asc': result.sort((a, b) => a.name.localeCompare(b.name, 'es')); break
      case 'name_desc': result.sort((a, b) => b.name.localeCompare(a.name, 'es')); break
    }
    return result
  }, [filtered, sortBy, mapCenter])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (query.trim()) router.push(`/${communitySlug}/directory?q=${encodeURIComponent(query.trim())}`)
  }

  const listBusinesses = sorted.slice(0, 10)
  const gridBusinesses = sorted.slice(10)
  const centerForMap: [number, number] | undefined = communityCenter
    ? [communityCenter.lat, communityCenter.lng]
    : undefined

  return (
    <>
      {/* Search + category ribbon */}
      <div className="border-b-3 border-black bg-[#F5E6CB] px-6 md:px-8 py-4">
        <form onSubmit={handleSearch} className="flex gap-3 items-center mb-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black/40 pointer-events-none" />
            <input
              placeholder="Busca negocios, calles, lo que necesites..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 border-[2.5px] border-black bg-white shadow-[2px_2px_0_0_#0A0A0A] font-sans text-sm outline-none focus:shadow-[4px_4px_0_0_#0A0A0A] transition-all"
            />
          </div>

          {/* Sort */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="flex items-center gap-1.5 px-3 py-2.5 border-[2.5px] border-black bg-white shadow-[2px_2px_0_0_#0A0A0A] font-heading font-bold uppercase text-[10px] tracking-wide hover:-translate-x-px hover:-translate-y-px hover:shadow-[3px_3px_0_0_#0A0A0A] transition-all"
            >
              <Filter className="h-3 w-3" />
              <span className="hidden sm:inline">
                      {sortBy === 'nearest' ? 'CERCANOS' : sortBy === 'newest' ? 'RECIENTES' : sortBy === 'oldest' ? 'ANTIGUOS' : sortBy === 'name_asc' ? 'A-Z' : 'Z-A'}
              </span>
              ▾
            </button>
            {showSortMenu && (
              <div className="absolute right-0 top-full mt-1 z-50 bg-white border-2 border-black shadow-[4px_4px_0_0_#0A0A0A] min-w-40">
                {([
                  { value: 'nearest', label: 'MÁS CERCANOS', icon: Filter },
                  { value: 'newest', label: 'RECIENTES', icon: Clock },
                  { value: 'oldest', label: 'ANTIGUOS', icon: Clock },
                  { value: 'name_asc', label: 'A → Z', icon: SortAsc },
                  { value: 'name_desc', label: 'Z → A', icon: SortDesc },
                ] as const).map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { setSortBy(opt.value); setShowSortMenu(false) }}
                    className={cn(
                      'flex items-center gap-2 w-full px-3 py-2 text-left font-mono text-[10px] tracking-widest uppercase hover:bg-black/5',
                      sortBy === opt.value && 'bg-[#E11D48]/10 text-[#E11D48] font-bold'
                    )}
                  >
                    <opt.icon className="h-3 w-3" /> {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Mobile view toggle */}
          <div className="md:hidden flex border-[2.5px] border-black shadow-[2px_2px_0_0_#0A0A0A]">
            <button
              type="button"
              onClick={() => setMobileView('list')}
              className={cn('px-3 py-2 font-mono text-[10px] tracking-widest uppercase font-bold', mobileView === 'list' ? 'bg-[#E11D48] text-white' : 'bg-white')}
            >
              LISTA
            </button>
            <button
              type="button"
              onClick={() => setMobileView('map')}
              className={cn('px-3 py-2 font-mono text-[10px] tracking-widest uppercase font-bold border-l-2 border-black', mobileView === 'map' ? 'bg-[#E11D48] text-white' : 'bg-white')}
            >
              MAPA
            </button>
          </div>
        </form>

        {/* Category chips */}
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveCategory(null)}
            className={cn(
              'px-3 py-1.5 border-2 border-black font-heading font-bold text-[10px] uppercase tracking-wider transition-all',
              !activeCategory
                ? 'bg-[#E11D48] text-white shadow-[2px_2px_0_0_#0A0A0A]'
                : 'bg-white shadow-[1px_1px_0_0_#0A0A0A] hover:bg-black/5'
            )}
          >
            TODOS
          </button>
          {categories.map(cat => {
            const style = getCategoryStyle(cat.slug)
            const on = activeCategory === cat.slug
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(on ? null : cat.slug)}
                className={cn(
                  'px-3 py-1.5 border-2 border-black font-heading font-bold text-[10px] uppercase tracking-wider transition-all',
                  on
                    ? `${style.bg} ${style.text} shadow-[2px_2px_0_0_#0A0A0A]`
                    : 'bg-white shadow-[1px_1px_0_0_#0A0A0A] hover:bg-black/5'
                )}
              >
                {cat.name}
              </button>
            )
          })}
        </div>

      </div>

      {/* Mobile map view */}
      {mobileView === 'map' && (
        <div className="md:hidden h-[60vh] border-b-3 border-black">
          <MapView
            businesses={filtered}
            communitySlug={communitySlug}
            onCenterChange={handleCenterChange}
            communityBoundary={communityBoundary}
            communityCenter={centerForMap}
          />
        </div>
      )}

      {/* Split view (desktop) + list (mobile) */}
      <div className={cn('border-b-3 border-black', mobileView === 'map' ? 'hidden md:flex' : 'flex flex-col md:flex-row')}>
        {/* LIST PANEL */}
        <div className="md:w-[45%] md:border-r-3 md:border-black bg-[#FFF7ED] dir-list-scroll md:overflow-y-auto md:max-h-200">
          {filtered.length === 0 ? (
            <div className="p-12 text-center border-4 border-dashed border-black/20 m-6">
              <p className="font-heading font-black italic uppercase text-2xl text-black/30">No se encontraron negocios</p>
              <p className="font-mono text-xs tracking-widest uppercase mt-2 text-black/40">Intenta con otra búsqueda o categoría</p>
              <button
                type="button"
                onClick={() => { setQuery(''); setActiveCategory(null) }}
                className="mt-4 px-4 py-2 border-2 border-black bg-white shadow-[2px_2px_0_0_#0A0A0A] font-heading font-bold uppercase text-xs tracking-wide hover:-translate-x-px hover:-translate-y-px transition-all"
              >
                LIMPIAR FILTROS
              </button>
            </div>
          ) : (
            <>
              {listBusinesses.map((b, i) => {
                const catSlug = b.categories?.slug ?? 'otros'
                const catStyle = getCategoryStyle(catSlug, i)
                const coords = businessCoords(b)
                const distKm = coords && sortBy === 'nearest'
                  ? haversineKm(mapCenter.lat, mapCenter.lng, coords.lat, coords.lng)
                  : null

                return (
                  <div
                    key={b.id}
                    className={cn(
                      'grid grid-cols-[44px_1fr_auto] gap-3 px-4 py-3.5 items-start cursor-pointer transition-colors',
                      i < listBusinesses.length - 1 ? 'border-b-2 border-black' : '',
                      i === 0 ? 'bg-[#FFF7ED]' : 'bg-white hover:bg-[#FFF7ED]'
                    )}
                  >
                    {/* Pin number */}
                    <div
                      className="w-11 h-11 shrink-0 border-[2.5px] border-black shadow-[1px_1px_0_0_#0A0A0A] flex items-center justify-center font-heading font-black italic text-lg"
                      style={{ background: catStyle.hex, color: catStyle.textHex }}
                    >
                      {i + 1}
                    </div>
                    {/* Info */}
                    <div className="min-w-0">
                      <div className="flex flex-wrap gap-1.5 items-center mb-1">
                        <Link href={`/${communitySlug}/business/${b.slug}`}>
                          <h3 className="font-heading font-black italic uppercase text-[15px] leading-tight hover:text-[#E11D48] transition-colors">{b.name}</h3>
                        </Link>
                        {b.categories && (
                          <span className={`${catStyle.bg} ${catStyle.text} border-2 border-black px-1.5 py-px font-heading font-bold text-[9px] uppercase tracking-wider shrink-0`}>
                            {b.categories.name}
                          </span>
                        )}
                        {b.is_featured && (
                          <span className="bg-[#FBBF24] border border-black px-1.5 py-px font-mono text-[9px] tracking-widest uppercase">★ DEST.</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] mb-1">
                        {b.average_rating != null && b.review_count != null && b.review_count > 0 && (
                          <>
                            <Stars value={b.average_rating} />
                            <span className="font-mono font-bold">{b.average_rating.toFixed(1)} ({b.review_count})</span>
                            <span className="text-black/30">·</span>
                          </>
                        )}
                        {b.address && (
                          <span className="flex items-center gap-1 font-bold text-black/50 uppercase tracking-wide">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#E11D48" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s-7-7-7-13a7 7 0 0 1 14 0c0 6-7 13-7 13z"/><circle cx="12" cy="9" r="2.5"/></svg>
                            <span className="line-clamp-1 max-w-40">{b.address}</span>
                          </span>
                        )}
                      </div>
                      {distKm != null && (
                        <p className="font-mono text-[9px] tracking-widest uppercase text-[#2563EB] font-bold">
                          {distKm < 1 ? `${Math.round(distKm * 1000)} m` : `${distKm.toFixed(1)} km`}
                        </p>
                      )}
                    </div>
                    {/* CTAs */}
                    <div className="flex flex-col gap-1 shrink-0">
                      {b.whatsapp && (
                        <a
                          href={whatsappUrl(b.whatsapp, `Hola ${b.name}, te encontré en BarrioRed`)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-9 h-9 bg-[#16A34A] text-white border-2 border-black shadow-[1px_1px_0_0_#0A0A0A] flex items-center justify-center hover:-translate-x-px hover:-translate-y-px transition-all"
                        >
                          <WhatsAppIcon />
                        </a>
                      )}
                      <Link
                        href={`/${communitySlug}/business/${b.slug}`}
                        className="w-9 h-9 bg-white border-2 border-black shadow-[1px_1px_0_0_#0A0A0A] flex items-center justify-center font-heading font-bold text-[11px] hover:-translate-x-px hover:-translate-y-px transition-all"
                      >
                        →
                      </Link>
                    </div>
                  </div>
                )
              })}
              <div className="p-4 text-center bg-[#F5E6CB] border-t-2 border-black">
                <span className="font-mono text-[10px] tracking-widest uppercase text-black/50">
                  {filtered.length} negocio{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
                </span>
              </div>
            </>
          )}
        </div>

        {/* MAP PANEL (desktop sticky) */}
        <div className="hidden md:block md:flex-1 sticky top-0 self-start" style={{ height: 'calc(100vh - 60px)', maxHeight: 800 }}>
          <MapView
            businesses={filtered}
            communitySlug={communitySlug}
            onCenterChange={handleCenterChange}
            communityBoundary={communityBoundary}
            communityCenter={centerForMap}
          />
        </div>
      </div>

      {/* MÁS NEGOCIOS — overflow businesses */}
      {gridBusinesses.length > 0 && (
        <div className="px-6 md:px-8 py-8 bg-[#F5E6CB] border-b-3 border-black">
          <div className="max-w-350 mx-auto">
            <div className="flex justify-between items-end mb-5">
              <h2 className="font-heading font-black italic uppercase text-3xl leading-tight">
                MÁS <span className="text-[#E11D48]">NEGOCIOS</span>
              </h2>
              <span className="font-mono text-[10px] tracking-widest uppercase text-black/50">
                {gridBusinesses.length} MÁS
              </span>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {gridBusinesses.map(b => (
                <BusinessCard key={b.id} business={b} communitySlug={communitySlug} compact />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
