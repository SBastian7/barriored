'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, Plus } from 'lucide-react'
import { ClassifiedCardVertical } from './classified-card-vertical'
import type { ClassifiedWithRelations } from '@/lib/types/database'

const SORT_OPTIONS = [
  { value: 'recent', label: 'MÁS RECIENTE' },
  { value: 'price-asc', label: 'MENOR PRECIO' },
  { value: 'price-desc', label: 'MAYOR PRECIO' },
]

function parsePrice(priceStr: string | null): number {
  if (!priceStr) return 0
  return parseInt(priceStr.replace(/[^0-9]/g, ''), 10) || 0
}

const ROTATIONS = [-0.5, 0, 0.5, -1, 0, 0.5, -0.5, 0]

const MARQUEE_ITEMS = [
  'COMPRA Y VENDE EN TU BARRIO',
  'SIN INTERMEDIARIOS',
  'DIRECTO AL VECINO',
  'PRECIO JUSTO',
  'PUBLICACIÓN GRATIS',
  'CLASIFICADOS LOCALES',
]

interface MarketplaceHubProps {
  classifieds: ClassifiedWithRelations[]
  communitySlug: string
  communityName: string
  coverImageUrl?: string | null
  userId?: string | null
  favoritedIds?: string[]
}

export function MarketplaceHub({
  classifieds,
  communitySlug,
  communityName,
  coverImageUrl,
  userId,
  favoritedIds = [],
}: MarketplaceHubProps) {
  const [activeCategory, setActiveCategory] = useState('todos')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('recent')

  const categories = useMemo(() => {
    const seen = new Map<string, string>()
    classifieds.forEach(c => {
      const slug = c.marketplace_categories?.slug
      const name = c.marketplace_categories?.name
      if (slug && name && !seen.has(slug)) seen.set(slug, name)
    })
    return Array.from(seen.entries()).map(([slug, name]) => ({ slug, name }))
  }, [classifieds])

  const featuredClassifieds = useMemo(
    () => classifieds.filter(c => c.is_featured).slice(0, 3),
    [classifieds]
  )

  const filteredClassifieds = useMemo(() => {
    let result = [...classifieds]

    if (activeCategory !== 'todos') {
      result = result.filter(c => c.marketplace_categories?.slug === activeCategory)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        c =>
          c.title.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q)
      )
    }

    switch (sort) {
      case 'price-asc':
        result.sort((a, b) => parsePrice(a.price) - parsePrice(b.price))
        break
      case 'price-desc':
        result.sort((a, b) => parsePrice(b.price) - parsePrice(a.price))
        break
    }

    return result
  }, [classifieds, activeCategory, search, sort])

  const sortLabel = SORT_OPTIONS.find(o => o.value === sort)?.label ?? 'MÁS RECIENTE'

  return (
    <div>
      {/* ── HERO ──────────────────────────────────────── */}
      <section
        className={`relative overflow-hidden border-b-4 border-black ${coverImageUrl ? '' : 'bg-[#FFF7ED]'}`}
        style={coverImageUrl ? { backgroundImage: `url(${coverImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
      >
        {/* Overlay */}
        {coverImageUrl ? (
          <div className="absolute inset-0 bg-black/65 pointer-events-none" />
        ) : (
          <div
            className="absolute inset-0 pointer-events-none opacity-25"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(10,10,10,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(10,10,10,0.08) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />
        )}
        {/* Decorative shapes — always visible */}
        <div className="absolute -top-16 -right-16 w-72 h-72 md:w-80 md:h-80 rounded-full bg-[#FBBF24] border-4 border-black shadow-[-12px_12px_0_0_#0A0A0A] pointer-events-none" />
        <div className="absolute top-16 right-28 w-20 h-20 bg-[#2563EB] border-[3px] border-black -rotate-12 shadow-[6px_6px_0_0_#0A0A0A] pointer-events-none hidden md:block" />
        <div className="absolute -bottom-5 right-56 w-28 h-28 bg-[#E11D48] border-[3px] border-black rotate-8 shadow-[6px_6px_0_0_#0A0A0A] pointer-events-none opacity-85 hidden md:block" />

        <div className="relative px-6 md:px-8 py-10 md:py-14 max-w-350 mx-auto">
          {/* Stickers */}
          <div className="flex flex-wrap gap-2 items-center mb-4">
            <span className="inline-block px-3 py-1.5 bg-[#FBBF24] border-[2.5px] border-black shadow-[2px_2px_0_0_#0A0A0A] font-heading font-black italic text-xs uppercase tracking-wide -rotate-2">
              🛒 COMPRA Y VENDE
            </span>
            <span className="inline-block bg-[#0A0A0A] text-white font-mono text-[11px] tracking-widest uppercase px-2 py-1">
              {communityName.toUpperCase()}
            </span>
          </div>

          {/* Big heading */}
          <h1
            className="font-heading font-black italic uppercase leading-[0.86] tracking-tight"
            style={{ fontSize: 'clamp(60px, 12vw, 110px)' }}
          >
            <span className={`block ${coverImageUrl ? 'text-white' : ''}`}>CLASI</span>
            <span className="block text-[#E11D48] ml-6 md:ml-8">FICADOS</span>
          </h1>

          <p className={`mt-4 text-base font-medium leading-relaxed max-w-md ${coverImageUrl ? 'text-white/80' : ''}`}>
            Compra, vende y arrienda con tus vecinos de{' '}
            <strong>{communityName}</strong>. Sin intermediarios, directo al barrio.
          </p>

          {/* CTAs */}
          {userId && (
            <div className="flex flex-wrap gap-3 mt-6">
              <Link
                href="/dashboard/marketplace/new"
                className="inline-flex items-center gap-2 px-5 py-3 bg-[#E11D48] text-white border-2 border-black font-heading font-black text-sm uppercase tracking-wider shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
              >
                <Plus className="h-4 w-4" />
                PUBLICAR CLASIFICADO
              </Link>
            </div>
          )}

          {/* Stats */}
          <div className="flex flex-wrap gap-2.5 mt-6">
            <div
              className="border-[3px] border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] px-4 py-2.5 flex items-baseline gap-2.5"
              style={{ background: '#E11D48', color: 'white' }}
            >
              <span className="font-heading font-black italic text-3xl leading-none">{classifieds.length}</span>
              <span className="font-mono text-[10px] font-black tracking-wider">ACTIVOS</span>
            </div>
            <div
              className="border-[3px] border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] px-4 py-2.5 flex items-baseline gap-2.5"
              style={{ background: '#0A0A0A', color: 'white' }}
            >
              <span className="font-heading font-black italic text-3xl leading-none">100%</span>
              <span className="font-mono text-[10px] font-black tracking-wider">LOCAL</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── FILTER BAR ────────────────────────────────── */}
      <section className="border-b-[3px] border-black bg-[#F5E6CB]">
        <div className="px-6 md:px-8 py-5 max-w-350 mx-auto">
          {/* Row 1: Search + Category + Sort */}
          <div className="flex gap-2.5 items-stretch flex-wrap md:flex-nowrap">
            <div className="flex-1 relative min-w-40">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-40 pointer-events-none" />
              <input
                type="text"
                placeholder="Busca lo que necesitas..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-3 bg-white border-[2.5px] border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] font-sans text-sm outline-none focus:shadow-[4px_4px_0px_rgba(0,0,0,1)] transition-all h-full"
              />
            </div>
            <div className="relative shrink-0">
              <select
                value={activeCategory}
                onChange={e => setActiveCategory(e.target.value)}
                className="appearance-none h-full pr-8 pl-3 py-3 bg-white border-[2.5px] border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] font-heading font-black text-[11px] uppercase tracking-wider outline-none cursor-pointer"
              >
                <option value="todos">CATEGORÍA</option>
                {categories.map(c => (
                  <option key={c.slug} value={c.slug}>
                    {c.name.toUpperCase()}
                  </option>
                ))}
              </select>
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-xs">▾</span>
            </div>
            <div className="relative shrink-0">
              <select
                value={sort}
                onChange={e => setSort(e.target.value)}
                className="appearance-none h-full pr-8 pl-3 py-3 bg-white border-[2.5px] border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] font-heading font-black text-[11px] uppercase tracking-wider outline-none cursor-pointer"
              >
                {SORT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-xs">▾</span>
            </div>
          </div>

          {/* Row 2: Type tabs + count */}
          <div className="flex justify-between items-center mt-3 flex-wrap gap-2">
            <div className="flex border-[2.5px] border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] w-fit overflow-x-auto">
              <button
                onClick={() => setActiveCategory('todos')}
                className={`px-3 py-2 font-heading font-black text-[11px] uppercase tracking-wider border-r-2 border-black transition-colors whitespace-nowrap cursor-pointer ${
                  activeCategory === 'todos' ? 'bg-[#0A0A0A] text-white' : 'bg-white hover:bg-black/5'
                }`}
              >
                TODOS
              </button>
              {categories.slice(0, 6).map((cat, i) => (
                <button
                  key={cat.slug}
                  onClick={() => setActiveCategory(cat.slug)}
                  className={`px-3 py-2 font-heading font-black text-[11px] uppercase tracking-wider transition-colors whitespace-nowrap cursor-pointer ${
                    i < Math.min(categories.length - 1, 5) ? 'border-r-2 border-black' : ''
                  } ${activeCategory === cat.slug ? 'bg-[#E11D48] text-white' : 'bg-white hover:bg-black/5'}`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
            <span className="font-mono text-[10px] uppercase tracking-wider opacity-55">
              {filteredClassifieds.length} CLASIFICADOS · {communityName.toUpperCase()}
            </span>
          </div>
        </div>
      </section>

      {/* ── FEATURED: LO MÁS NUEVO ────────────────────── */}
      {featuredClassifieds.length > 0 && (
        <section className="border-b-4 border-black bg-[#0A0A0A] relative overflow-hidden">
          <div className="absolute inset-0 br-pattern-dots opacity-[0.04] pointer-events-none" />
          <div className="relative px-6 md:px-8 py-8 md:py-10 max-w-350 mx-auto">
            <div className="flex justify-between items-end mb-6 flex-wrap gap-3">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-[#FBBF24] mb-2">
                  ★ {featuredClassifieds.length} DESTACADOS · ACTUALIZADOS HOY
                </div>
                <h2 className="font-heading font-black italic uppercase text-5xl md:text-6xl text-white leading-none">
                  LO MÁS <span className="text-[#E11D48]">NUEVO</span>
                </h2>
              </div>
              <span className="inline-block px-3 py-1.5 bg-[#FBBF24] border-2 border-black font-heading font-black italic text-xs uppercase -rotate-2 shadow-[2px_2px_0_0_#0A0A0A]">
                🔥 HOT
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {featuredClassifieds.map((c, i) => (
                <ClassifiedCardVertical
                  key={c.id}
                  classified={c}
                  communitySlug={communitySlug}
                  userId={userId}
                  isFavorited={favoritedIds.includes(c.id)}
                  rotation={[-1, 0, 1][i] ?? 0}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── MAIN GRID ─────────────────────────────────── */}
      <section className="px-6 md:px-8 py-8 max-w-350 mx-auto">
        <div className="flex justify-between items-end mb-5 flex-wrap gap-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest mb-1 opacity-55">
              {filteredClassifieds.length} CLASIFICADOS · ORDEN: {sortLabel}
            </div>
            <h2 className="font-heading font-black italic uppercase text-4xl md:text-5xl">
              TODOS LOS <span className="text-[#E11D48]">CLASIFICADOS</span>
            </h2>
          </div>
        </div>

        {filteredClassifieds.length === 0 ? (
          <div className="border-[3px] border-black shadow-[6px_6px_0px_rgba(0,0,0,1)] bg-white p-12 text-center space-y-4">
            <div className="font-heading font-black italic uppercase text-6xl text-black/10">🛒</div>
            <h3 className="font-heading font-black italic uppercase text-2xl">SIN CLASIFICADOS</h3>
            <p className="text-black/55">No se encontraron clasificados que coincidan con tu búsqueda</p>
            <button
              onClick={() => { setSearch(''); setActiveCategory('todos') }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-black font-heading font-black text-sm uppercase tracking-wider shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_rgba(0,0,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all cursor-pointer"
            >
              VER TODOS
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* First 5 */}
            {filteredClassifieds.slice(0, 5).map((c, i) => (
              <ClassifiedCardVertical
                key={c.id}
                classified={c}
                communitySlug={communitySlug}
                userId={userId}
                isFavorited={favoritedIds.includes(c.id)}
                rotation={ROTATIONS[i] ?? 0}
              />
            ))}

            {/* Interstitial tip card — only if 6+ classifieds */}
            {filteredClassifieds.length > 5 && (
              <div className="sm:col-span-2 lg:col-span-3 border-[3px] border-black shadow-[6px_6px_0px_rgba(0,0,0,1)] overflow-hidden grid grid-cols-1 md:grid-cols-2">
                <div className="p-6 md:p-8 relative bg-white">
                  <div className="absolute inset-0 br-pattern-diag opacity-15 pointer-events-none" />
                  <div className="relative">
                    <span className="inline-flex items-center px-2.5 py-1 bg-[#FBBF24] border-2 border-black font-heading font-black text-[10px] uppercase tracking-wider shadow-[2px_2px_0px_rgba(0,0,0,1)] mb-3">
                      💡 TIP DEL BARRIO
                    </span>
                    <h3 className="font-heading font-black italic uppercase text-3xl mt-2">
                      ¿VENDIENDO ALGO?
                    </h3>
                    <p className="text-sm mt-3 leading-relaxed max-w-sm text-black/70">
                      Agrega buenas fotos y un precio justo para vender más rápido. Los clasificados con foto reciben muchos más mensajes.
                    </p>
                    {userId ? (
                      <Link
                        href="/dashboard/marketplace/new"
                        className="inline-flex items-center gap-2 mt-5 px-4 py-2.5 bg-[#E11D48] text-white border-2 border-black font-heading font-black text-sm uppercase tracking-wider shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_rgba(0,0,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
                      >
                        <Plus className="h-4 w-4" /> PUBLICAR AHORA
                      </Link>
                    ) : (
                      <Link
                        href="/auth/login"
                        className="inline-flex items-center gap-2 mt-5 px-4 py-2.5 bg-[#E11D48] text-white border-2 border-black font-heading font-black text-sm uppercase tracking-wider shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_rgba(0,0,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
                      >
                        PUBLICAR GRATIS
                      </Link>
                    )}
                  </div>
                </div>
                <div className="p-6 md:p-8 bg-[#0A0A0A] text-white flex gap-4 md:gap-6 items-center justify-center border-t-[3px] md:border-t-0 md:border-l-[3px] border-black">
                  {[
                    ['01', 'DESCRIBE', 'Título y fotos en 1 minuto.'],
                    ['02', 'PUBLICA', 'Aparece al instante.'],
                    ['03', 'CONECTA', 'Te escriben por WhatsApp.'],
                  ].map(([n, t, d]) => (
                    <div key={n} className="flex-1 text-center">
                      <div className="font-heading font-black italic text-4xl text-[#E11D48] leading-none">{n}</div>
                      <div className="font-heading font-black italic uppercase text-sm md:text-base mt-1">{t}</div>
                      <div className="font-mono text-[9px] uppercase tracking-wider opacity-60 mt-1 leading-tight">{d}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Remaining */}
            {filteredClassifieds.slice(5).map((c, i) => (
              <ClassifiedCardVertical
                key={c.id}
                classified={c}
                communitySlug={communitySlug}
                userId={userId}
                isFavorited={favoritedIds.includes(c.id)}
                rotation={ROTATIONS[(i + 5) % ROTATIONS.length] ?? 0}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── MARQUEE ───────────────────────────────────── */}
      <div className="bg-[#E11D48] border-y-4 border-black py-3 overflow-hidden">
        <div className="flex">
          {[0, 1].map(copy => (
            <div key={copy} className="br-marquee-track flex gap-0 shrink-0" aria-hidden={copy === 1}>
              {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((text, i) => (
                <span key={i} className="flex items-center gap-6 px-6">
                  <span className="font-heading font-black italic uppercase text-white text-2xl whitespace-nowrap leading-none">
                    {text}
                  </span>
                  <span className="text-[#FBBF24] text-xl">✦</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── PUBLICA GRATIS CTA ────────────────────────── */}
      <section className="px-6 md:px-8 py-10 md:py-14 max-w-350 mx-auto">
        <div className="border-[3px] border-black shadow-[8px_8px_0px_rgba(0,0,0,1)] overflow-hidden grid grid-cols-1 md:grid-cols-[1.2fr_1fr]">
          <div className="p-8 md:p-10 relative bg-white">
            <div className="absolute inset-0 br-pattern-dots opacity-[0.12] pointer-events-none" />
            <div className="relative">
              <span className="inline-block bg-[#E11D48] text-white font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 mb-4">
                CLASIFICADOS
              </span>
              <h2
                className="font-heading font-black italic uppercase leading-[0.88]"
                style={{ fontSize: 'clamp(52px, 8vw, 80px)' }}
              >
                PUBLICA
                <br />
                <span className="text-[#E11D48]">GRATIS.</span>
              </h2>
              <p className="mt-4 text-base leading-relaxed max-w-md text-black/75">
                Vende lo que ya no usas o encuentra lo que buscas entre tus vecinos. Sin comisiones, sin trucos, puro barrio.
              </p>
              <div className="flex flex-wrap gap-3 mt-6">
                <Link
                  href={userId ? '/dashboard/marketplace/new' : '/auth/login'}
                  className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#E11D48] text-white border-2 border-black font-heading font-black text-sm uppercase tracking-wider shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
                >
                  + PUBLICAR AHORA
                </Link>
              </div>
              <p className="mt-3 font-mono text-[10px] uppercase tracking-wider opacity-45">
                * Gratis para vecinos de {communityName}
              </p>
            </div>
          </div>
          <div className="p-8 bg-[#0A0A0A] text-white flex flex-col gap-5 justify-center border-t-[3px] md:border-t-0 md:border-l-[3px] border-black">
            <div className="font-mono text-[10px] uppercase tracking-widest text-[#FBBF24]">EN 3 PASOS SIMPLES</div>
            {[
              ['01', 'DESCRIBE', 'Título, fotos y precio en 1 minuto.'],
              ['02', 'PUBLICA', 'Tu clasificado aparece al instante.'],
              ['03', 'CONECTA', 'Los interesados te escriben por WhatsApp.'],
            ].map(([n, t, d]) => (
              <div key={n} className="grid grid-cols-[52px_1fr] gap-4 items-center">
                <span className="font-heading font-black italic text-5xl text-[#E11D48] leading-none">{n}</span>
                <div>
                  <div className="font-heading font-black italic uppercase text-lg leading-tight">{t}</div>
                  <div className="text-sm opacity-70 mt-0.5">{d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
