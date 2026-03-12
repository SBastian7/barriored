# Marketplace Anonymous Users Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable anonymous visitors to browse, filter, search, and view classified listings in the marketplace with WhatsApp contact functionality.

**Architecture:** Hybrid hub page (featured + browse) using Server Components for data fetching and Client Components for filtering. Reuses existing admin marketplace components adapted for public view. Two-column detail page with image gallery and WhatsApp CTA.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase, Tailwind CSS, existing marketplace components

---

## Task 1: Enable Marketplace Navigation

**Files:**
- Modify: `components/layout/top-bar.tsx:13`
- Modify: `components/layout/bottom-nav.tsx` (find marketplace nav item)

**Step 1: Update top-bar navigation**

Open `components/layout/top-bar.tsx` and change line 13:

```typescript
// FROM:
{ label: 'Marketplace', icon: ShoppingBag, path: '/marketplace', active: false },

// TO:
{ label: 'Marketplace', icon: ShoppingBag, path: '/marketplace', active: true },
```

**Step 2: Update bottom-nav navigation**

Open `components/layout/bottom-nav.tsx` and find the marketplace nav item, change `active: false` to `active: true`:

```typescript
// FROM:
{ label: 'Marketplace', icon: ShoppingBag, path: '/marketplace', active: false },

// TO:
{ label: 'Marketplace', icon: ShoppingBag, path: '/marketplace', active: true },
```

**Step 3: Test navigation appears**

Run: `npm run dev`

Navigate to: `http://localhost:3000/parqueindustrial`

Expected:
- Top bar (desktop) shows "Marketplace" link without "Pronto" badge
- Bottom nav (mobile) shows marketplace icon without disabled state
- Links are clickable (will 404 for now, that's expected)

**Step 4: Commit**

```bash
git add components/layout/top-bar.tsx components/layout/bottom-nav.tsx
git commit -m "feat(nav): enable marketplace navigation

- Set marketplace active: true in top bar
- Set marketplace active: true in bottom nav
- Marketplace now accessible to all users

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Create Marketplace Hub Page Route

**Files:**
- Create: `app/[community]/marketplace/page.tsx`

**Step 1: Create marketplace directory**

```bash
mkdir -p "app/[community]/marketplace"
```

**Step 2: Create hub page with basic structure**

Create `app/[community]/marketplace/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { Breadcrumbs } from '@/components/shared/breadcrumbs'
import { MarketplaceHub } from '@/components/marketplace/marketplace-hub'
import { notFound } from 'next/navigation'
import type { ClassifiedWithRelations } from '@/lib/types/database'

export async function generateMetadata({ params }: { params: Promise<{ community: string }> }) {
  const { community: slug } = await params
  const supabase = await createClient()
  const { data: community } = await supabase
    .from('communities')
    .select('name')
    .eq('slug', slug)
    .single<{ name: string }>()

  if (!community) return {}

  return {
    title: `Marketplace - Clasificados en ${community.name} | BarrioRed`,
    description: `Compra, vende y arrienda en ${community.name}. Clasificados locales de tu barrio.`
  }
}

export default async function MarketplacePage({
  params,
}: {
  params: Promise<{ community: string }>
}) {
  const { community: slug } = await params
  const supabase = await createClient()

  // Fetch community
  const { data: community } = await supabase
    .from('communities')
    .select('id, name, slug')
    .eq('slug', slug)
    .single<{ id: string; name: string; slug: string }>()

  if (!community) notFound()

  // Fetch active classifieds with relations
  const { data: classifieds } = await supabase
    .from('classifieds')
    .select(`
      *,
      profiles!classifieds_user_id_fkey(full_name, avatar_url),
      marketplace_categories(name, slug, icon)
    `)
    .eq('community_id', community.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 pb-24">
      <Breadcrumbs
        items={[
          { label: community.name, href: `/${slug}` },
          { label: 'Marketplace', active: true },
        ]}
      />

      <header className="space-y-2 mb-12">
        <h1 className="text-5xl md:text-7xl font-heading font-black uppercase tracking-tighter italic">
          Clasifi<span className="text-primary">cados</span>
        </h1>
        <p className="text-lg font-bold text-black/60 uppercase tracking-widest">
          Compra, vende y arrienda en tu barrio
        </p>
      </header>

      <MarketplaceHub
        classifieds={(classifieds ?? []) as ClassifiedWithRelations[]}
        communitySlug={slug}
      />
    </div>
  )
}
```

**Step 3: Test page loads (will fail on MarketplaceHub)**

Navigate to: `http://localhost:3000/parqueindustrial/marketplace`

Expected: Error about MarketplaceHub component not found (this is expected, we'll create it next)

**Step 4: Commit**

```bash
git add "app/[community]/marketplace/page.tsx"
git commit -m "feat(marketplace): add hub page route

- Server Component fetches active classifieds
- Metadata for SEO
- Breadcrumbs and header
- Passes data to MarketplaceHub client component

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Create ClassifiedGrid Component

**Files:**
- Create: `components/marketplace/classified-grid.tsx`

**Step 1: Create ClassifiedGrid component**

Create `components/marketplace/classified-grid.tsx`:

```typescript
'use client'

import { ClassifiedCard } from './classified-card'
import { ShoppingBag } from 'lucide-react'
import type { ClassifiedWithRelations } from '@/lib/types/database'

interface ClassifiedGridProps {
  classifieds: ClassifiedWithRelations[]
  communitySlug: string
}

export function ClassifiedGrid({ classifieds, communitySlug }: ClassifiedGridProps) {
  if (classifieds.length === 0) {
    return (
      <div className="brutalist-card p-12 text-center space-y-4">
        <ShoppingBag className="h-16 w-16 mx-auto text-black/20" />
        <h3 className="font-heading font-black uppercase text-2xl">
          Sin clasificados aún
        </h3>
        <p className="text-black/60">
          No se encontraron clasificados que coincidan con tu búsqueda
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      {classifieds.map((classified) => (
        <ClassifiedCard
          key={classified.id}
          classified={classified}
          variant="public"
        />
      ))}
    </div>
  )
}
```

**Step 2: Test component compiles**

Run: `npm run build` (or let dev server auto-compile)

Expected: No TypeScript errors (will still fail at runtime because ClassifiedCard doesn't have variant prop yet)

**Step 3: Commit**

```bash
git add components/marketplace/classified-grid.tsx
git commit -m "feat(marketplace): add classified grid component

- Displays classifieds in responsive grid
- Empty state with icon and message
- 1/2/3 columns based on screen size

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Adapt ClassifiedCard for Public View

**Files:**
- Modify: `components/marketplace/classified-card.tsx`

**Step 1: Add variant prop to ClassifiedCard**

Open `components/marketplace/classified-card.tsx` and update the interface:

```typescript
interface ClassifiedCardProps {
  classified: ClassifiedWithRelations
  variant?: 'admin' | 'public'
  onMarkSold?: (id: string) => void
  onArchive?: (id: string) => void
  onDelete?: (id: string) => void
}
```

**Step 2: Update component to handle variant**

Update the component logic:

```typescript
export function ClassifiedCard({
  classified,
  variant = 'admin',
  onMarkSold,
  onArchive,
  onDelete,
}: ClassifiedCardProps) {
  const thumbnail = classified.images?.[0] || '/placeholder-image.png'
  const isPublicView = variant === 'public'
  const detailHref = isPublicView
    ? `/${classified.communities.slug}/marketplace/${classified.id}`
    : `/admin/marketplace/${classified.id}`

  return (
    <Card
      className={`border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all overflow-hidden bg-white ${
        classified.status === 'flagged' ? 'border-red-500 border-4' : ''
      }`}
    >
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row divide-y-2 md:divide-y-0 md:divide-x-2 divide-black">
          {/* Thumbnail */}
          <div className="relative w-full md:w-32 h-32 shrink-0">
            <Image
              src={thumbnail}
              alt={classified.title}
              fill
              className="object-cover"
            />
          </div>

          {/* Content */}
          <div className="p-4 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-widest text-black/40">
              <Badge
                variant="outline"
                className="text-[10px] rounded-none py-0 px-1 border-black"
              >
                {classified.marketplace_categories.name}
              </Badge>
              {!isPublicView && <ClassifiedStatusBadge status={classified.status} />}
              <span>•</span>
              <span>{classified.profiles.full_name}</span>
              <span>•</span>
              <span>{new Date(classified.created_at).toLocaleDateString()}</span>
            </div>

            <h3 className="font-heading font-black uppercase text-lg leading-tight">
              {classified.title}
            </h3>

            {classified.price && (
              <p className="text-primary font-black text-xl">
                {classified.price}
              </p>
            )}

            <p className="text-sm text-black/60 line-clamp-2">
              {classified.description}
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col divide-y-2 divide-black md:w-48">
            <Link
              href={detailHref}
              className="flex-1 flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest text-accent hover:bg-black/5 transition-colors p-4"
            >
              <Eye className="h-3 w-3" /> Ver Detalle
            </Link>

            {!isPublicView && classified.status === 'active' && onMarkSold && (
              <button
                onClick={() => onMarkSold(classified.id)}
                className="flex-1 flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest text-blue-600 hover:bg-blue-50 transition-colors p-4"
              >
                <Check className="h-3 w-3" /> Marcar Vendido
              </button>
            )}

            {!isPublicView && classified.status === 'active' && onArchive && (
              <button
                onClick={() => onArchive(classified.id)}
                className="flex-1 flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest text-gray-600 hover:bg-gray-50 transition-colors p-4"
              >
                <Archive className="h-3 w-3" /> Archivar
              </button>
            )}

            {!isPublicView && onDelete && (
              <button
                onClick={() => onDelete(classified.id)}
                className="flex-1 flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest text-red-600 hover:bg-red-50 transition-colors p-4"
              >
                <Trash2 className="h-3 w-3" /> Eliminar
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

**Step 3: Test component compiles**

Run: `npm run build`

Expected: No TypeScript errors

**Step 4: Commit**

```bash
git add components/marketplace/classified-card.tsx
git commit -m "feat(marketplace): add public variant to classified card

- Add variant prop: admin | public
- Public view hides admin actions
- Public view links to public detail page
- Public view hides status badge

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Create MarketplaceHub Component

**Files:**
- Create: `components/marketplace/marketplace-hub.tsx`

**Step 1: Create MarketplaceHub component**

Create `components/marketplace/marketplace-hub.tsx`:

```typescript
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
}

export function MarketplaceHub({ classifieds, communitySlug }: MarketplaceHubProps) {
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
      />
    </div>
  )
}
```

**Step 2: Test hub page loads**

Navigate to: `http://localhost:3000/parqueindustrial/marketplace`

Expected:
- Page loads successfully
- Shows header "Clasificados"
- Shows featured section if classifieds exist
- Shows filter bar with category dropdown and search
- Shows grid of classifieds
- Shows empty state if no classifieds

**Step 3: Test filtering works**

1. Select a category from dropdown
2. Type in search box
3. Verify results update instantly (client-side)

**Step 4: Commit**

```bash
git add components/marketplace/marketplace-hub.tsx
git commit -m "feat(marketplace): add marketplace hub component

- Featured section with 3 newest classifieds
- Category filter dropdown
- Search input for title/description
- Client-side filtering (instant)
- Result count display

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Create Classified Detail Page Route

**Files:**
- Create: `app/[community]/marketplace/[id]/page.tsx`

**Step 1: Create [id] directory**

```bash
mkdir -p "app/[community]/marketplace/[id]"
```

**Step 2: Create detail page**

Create `app/[community]/marketplace/[id]/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { Breadcrumbs } from '@/components/shared/breadcrumbs'
import { ClassifiedDetailView } from '@/components/marketplace/classified-detail-view'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { ClassifiedWithRelations } from '@/lib/types/database'

export async function generateMetadata({ params }: { params: Promise<{ community: string; id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: classified } = await supabase
    .from('classifieds')
    .select('title, description, images')
    .eq('id', id)
    .single<{ title: string; description: string; images: string[] | null }>()

  if (!classified) return {}

  return {
    title: `${classified.title} | Marketplace BarrioRed`,
    description: classified.description.substring(0, 160),
    openGraph: {
      images: classified.images?.[0] || '/og-image.png'
    }
  }
}

export default async function ClassifiedDetailPage({
  params,
}: {
  params: Promise<{ community: string; id: string }>
}) {
  const { community: slug, id } = await params
  const supabase = await createClient()

  // Fetch community
  const { data: community } = await supabase
    .from('communities')
    .select('id, name, slug')
    .eq('slug', slug)
    .single<{ id: string; name: string; slug: string }>()

  if (!community) notFound()

  // Fetch classified with relations
  const { data: classified } = await supabase
    .from('classifieds')
    .select(`
      *,
      profiles!classifieds_user_id_fkey(full_name, avatar_url),
      marketplace_categories(name, slug, icon),
      communities(name, slug)
    `)
    .eq('id', id)
    .single()

  if (!classified) notFound()

  // Check if classified is active
  if (classified.status !== 'active') {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16">
        <Breadcrumbs
          items={[
            { label: community.name, href: `/${slug}` },
            { label: 'Marketplace', href: `/${slug}/marketplace` },
            { label: 'No Disponible', active: true },
          ]}
        />

        <div className="brutalist-card p-12 text-center space-y-4 mt-8">
          <h2 className="font-heading font-black uppercase text-3xl">
            Clasificado No Disponible
          </h2>
          <p className="text-black/60">
            Este clasificado ya no está activo o ha sido{' '}
            {classified.status === 'sold' ? 'vendido' : 'eliminado'}
          </p>
          <Link
            href={`/${slug}/marketplace`}
            className="brutalist-button inline-block"
          >
            Ver Todos los Clasificados
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 pb-24">
      <Breadcrumbs
        items={[
          { label: community.name, href: `/${slug}` },
          { label: 'Marketplace', href: `/${slug}/marketplace` },
          { label: classified.title, active: true },
        ]}
      />

      <ClassifiedDetailView classified={classified as ClassifiedWithRelations} />
    </div>
  )
}
```

**Step 3: Test detail page route works**

Navigate to: `http://localhost:3000/parqueindustrial/marketplace/{some-id}`

Expected: Error about ClassifiedDetailView not found (expected, we'll create it next)

**Step 4: Commit**

```bash
git add "app/[community]/marketplace/[id]/page.tsx"
git commit -m "feat(marketplace): add classified detail page route

- Server Component fetches single classified
- Checks if classified is active
- Shows not available message for non-active
- Metadata for SEO and Open Graph
- Breadcrumbs navigation

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Create ClassifiedDetailView Component

**Files:**
- Create: `components/marketplace/classified-detail-view.tsx`

**Step 1: Create ClassifiedDetailView component**

Create `components/marketplace/classified-detail-view.tsx`:

```typescript
'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MessageCircle, ChevronLeft, ChevronRight, User, Calendar } from 'lucide-react'
import { ClassifiedStatusBadge } from './classified-status-badge'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import type { ClassifiedWithRelations } from '@/lib/types/database'

interface ClassifiedDetailViewProps {
  classified: ClassifiedWithRelations
}

export function ClassifiedDetailView({ classified }: ClassifiedDetailViewProps) {
  const images = classified.images || []
  const hasImages = images.length > 0
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length)
  }

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  const whatsappMessage = encodeURIComponent(
    `Hola, vi tu clasificado "${classified.title}" en BarrioRed`
  )
  const whatsappUrl = `https://wa.me/${classified.whatsapp}?text=${whatsappMessage}`

  const timeAgo = formatDistanceToNow(new Date(classified.created_at), {
    addSuffix: true,
    locale: es
  })

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mt-8">
      {/* Left Column - Image Gallery (60% / 3 cols) */}
      <div className="lg:col-span-3 space-y-4">
        {hasImages ? (
          <>
            {/* Main Image */}
            <div className="relative aspect-square border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white overflow-hidden">
              <Image
                src={images[currentImageIndex]}
                alt={`${classified.title} - Imagen ${currentImageIndex + 1}`}
                fill
                className="object-cover"
                priority
              />

              {/* Navigation Arrows */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-white border-2 border-black p-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                    aria-label="Imagen anterior"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-white border-2 border-black p-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                    aria-label="Siguiente imagen"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              )}

              {/* Image Counter */}
              {images.length > 1 && (
                <div className="absolute bottom-4 right-4 bg-black text-white px-3 py-1 border-2 border-white text-xs font-black">
                  {currentImageIndex + 1} / {images.length}
                </div>
              )}
            </div>

            {/* Thumbnail Strip */}
            {images.length > 1 && (
              <div className="grid grid-cols-5 gap-2">
                {images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`relative aspect-square border-2 transition-all ${
                      index === currentImageIndex
                        ? 'border-primary shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                        : 'border-black opacity-60 hover:opacity-100'
                    }`}
                  >
                    <Image
                      src={image}
                      alt={`Miniatura ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="aspect-square border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-gray-50 flex items-center justify-center">
            <div className="text-center text-black/40">
              <Image
                src="/placeholder-image.png"
                alt="Sin fotos"
                width={200}
                height={200}
                className="mx-auto opacity-20"
              />
              <p className="mt-4 font-black uppercase text-sm">Sin fotos</p>
            </div>
          </div>
        )}
      </div>

      {/* Right Column - Details Card (40% / 2 cols) */}
      <div className="lg:col-span-2">
        <div className="brutalist-card p-6 space-y-6 lg:sticky lg:top-20">
          {/* Category Badge */}
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-[10px] rounded-none py-1 px-2 border-black font-black uppercase tracking-widest"
            >
              {classified.marketplace_categories.name}
            </Badge>
          </div>

          {/* Title */}
          <h1 className="font-heading font-black uppercase text-3xl md:text-4xl leading-tight">
            {classified.title}
          </h1>

          {/* Price */}
          {classified.price && (
            <div className="text-primary font-black text-4xl">
              {classified.price}
            </div>
          )}

          {/* Divider */}
          <div className="border-t-2 border-black" />

          {/* Description */}
          <div>
            <h2 className="font-black uppercase text-[10px] tracking-widest text-black/60 mb-2">
              Descripción
            </h2>
            <p className="text-base leading-relaxed whitespace-pre-wrap">
              {classified.description}
            </p>
          </div>

          {/* Divider */}
          <div className="border-t-2 border-black" />

          {/* Seller Info */}
          <div>
            <h2 className="font-black uppercase text-[10px] tracking-widest text-black/60 mb-3">
              Vendedor
            </h2>
            <div className="flex items-center gap-3">
              {classified.profiles.avatar_url ? (
                <Image
                  src={classified.profiles.avatar_url}
                  alt={classified.profiles.full_name || 'Usuario'}
                  width={48}
                  height={48}
                  className="rounded-full border-2 border-black"
                />
              ) : (
                <div className="w-12 h-12 rounded-full border-2 border-black bg-gray-100 flex items-center justify-center">
                  <User className="h-6 w-6 text-black/40" />
                </div>
              )}
              <div>
                <p className="font-bold">{classified.profiles.full_name || 'Usuario'}</p>
                <p className="text-sm text-black/60 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Publicado {timeAgo}
                </p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t-2 border-black" />

          {/* WhatsApp CTA */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="brutalist-button w-full bg-primary text-primary-foreground text-lg py-4 flex items-center justify-center gap-2"
          >
            <MessageCircle className="h-5 w-5" />
            CONTACTAR POR WHATSAPP
          </a>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Install date-fns if not already installed**

```bash
npm install date-fns
```

**Step 3: Test detail page loads**

Navigate to a classified detail page

Expected:
- Two-column layout on desktop (images left, details right)
- Stacked layout on mobile
- Image gallery with navigation if multiple images
- Thumbnail strip below main image
- Details card with all info
- WhatsApp button opens WhatsApp with pre-filled message
- Seller info with avatar
- Time ago display

**Step 4: Commit**

```bash
git add components/marketplace/classified-detail-view.tsx package.json package-lock.json
git commit -m "feat(marketplace): add classified detail view component

- Two-column layout (images left, details right)
- Image gallery with navigation arrows
- Thumbnail strip for multiple images
- Details card with brutalist styling
- WhatsApp CTA button with pre-filled message
- Seller info with avatar and time ago

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Add Placeholder Image

**Files:**
- Add: `public/placeholder-image.png` (if doesn't exist)

**Step 1: Check if placeholder exists**

```bash
ls "public/placeholder-image.png"
```

If it doesn't exist, create a simple placeholder or use an existing one.

**Step 2: Test classifieds without images**

Create a test classified without images in the database or temporarily remove images from a classified.

Expected: Shows placeholder image with "Sin fotos" message

**Step 3: Commit (if new file added)**

```bash
git add public/placeholder-image.png
git commit -m "feat: add placeholder image for classifieds without photos

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Test Complete User Flow

**Files:**
- No file changes

**Step 1: Test navigation**

1. Start at community homepage
2. Click "Marketplace" in top bar or bottom nav
3. Verify marketplace hub loads

**Step 2: Test filtering**

1. Select a category (e.g., "Vendo")
2. Verify grid updates instantly
3. Type search query
4. Verify results filter instantly
5. Clear filters
6. Verify all results show again

**Step 3: Test detail flow**

1. Click "Ver Detalle" on a classified
2. Verify detail page loads
3. Navigate images if multiple exist
4. Click WhatsApp button
5. Verify WhatsApp opens with pre-filled message

**Step 4: Test responsive design**

1. Resize browser to mobile width
2. Verify bottom nav shows marketplace
3. Verify hub page layout stacks properly
4. Verify detail page stacks (gallery on top, details below)
5. Verify WhatsApp button is accessible

**Step 5: Test edge cases**

1. Navigate to marketplace in community with no classifieds
2. Verify empty state shows with message
3. Filter to category with no results
4. Verify empty state shows
5. Navigate to non-existent classified ID
6. Verify 404 page shows
7. Test classified with status !== 'active'
8. Verify "not available" message shows

**Step 6: Document any issues found**

If issues are found, create follow-up tasks to fix them.

---

## Task 10: Performance & Accessibility Check

**Files:**
- No file changes

**Step 1: Run Lighthouse audit**

```bash
# Start dev server
npm run dev

# Open Chrome DevTools > Lighthouse
# Run audit for mobile and desktop
```

Expected scores:
- Performance: 80+
- Accessibility: 90+
- SEO: 90+

**Step 2: Check keyboard navigation**

1. Use Tab key to navigate through marketplace hub
2. Verify all interactive elements are accessible
3. Verify filters can be operated with keyboard
4. Test detail page keyboard navigation
5. Verify WhatsApp button is reachable via Tab

**Step 3: Check screen reader compatibility**

1. Use browser's screen reader (or VoiceOver/NVDA)
2. Navigate marketplace hub
3. Verify images have alt text
4. Verify buttons have labels
5. Verify form inputs have labels

**Step 4: Fix any accessibility issues found**

Add ARIA labels where needed, ensure proper heading hierarchy, add alt text, etc.

---

## Task 11: Final Testing & Documentation

**Files:**
- Modify: `CLAUDE.md` (update marketplace status)

**Step 1: Update CLAUDE.md**

Open `CLAUDE.md` and update the marketplace section in "Development Phases & Roadmap":

```markdown
### Phase 4: Marketplace (Clasificados - USER FEATURES COMPLETE)
- [x] Database schema (marketplace_categories, classifieds, marketplace_user_bans)
- [x] RLS policies for community isolation
- [x] Admin API routes (list, detail, update, delete, flag, ban)
- [x] Admin moderation panel (`/admin/marketplace`)
- [x] Admin classified detail/edit page
- [x] Filters (category, status)
- [x] Stats dashboard (active, sold, flagged, banned)
- [x] Flag/unflag classifieds
- [x] Ban users from marketplace
- [x] Audit logging for all admin actions
- [x] Marketplace navigation in admin sidebar
- [x] **User-facing marketplace hub page**
- [x] **Browse and filter classifieds (anonymous users)**
- [x] **Search classifieds by keyword**
- [x] **Classified detail page with WhatsApp contact**
- [ ] User create classified listing (requires login)
- [ ] User edit own classifieds
- [ ] Featured classified listings (paid monetization)
```

**Step 2: Test one more complete flow**

Full user journey:
1. Anonymous user visits community homepage
2. Clicks marketplace in nav
3. Browses classifieds
4. Filters by category
5. Searches for item
6. Clicks detail
7. Views images
8. Clicks WhatsApp button
9. Contacts seller

**Step 3: Commit CLAUDE.md update**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with completed marketplace features

- Mark user-facing marketplace features as complete
- Anonymous users can browse, filter, search, and contact

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

**Step 4: Create final summary commit (optional)**

```bash
git log --oneline | head -15
```

Review all commits made for this feature and ensure they tell a clear story.

---

## Success Criteria

✅ **Navigation:**
- Marketplace appears in top bar (desktop)
- Marketplace appears in bottom nav (mobile)
- No "Pronto" badge on marketplace links

✅ **Hub Page:**
- Loads with active classifieds from community
- Shows featured section with 3 newest items
- Category filter works (instant)
- Search filter works (instant)
- Empty state shows when no results
- Result count displays correctly

✅ **Detail Page:**
- Two-column layout on desktop
- Stacked layout on mobile
- Image gallery with navigation
- Thumbnail strip for multiple images
- All classified info displayed
- WhatsApp button opens with pre-filled message
- Seller info shows with avatar
- Time ago displays correctly
- "Not available" message for non-active classifieds

✅ **Quality:**
- No TypeScript errors
- No `any` types used
- Follows neo-brutalist design system
- Mobile responsive
- Accessibility compliant
- SEO metadata present

✅ **Performance:**
- Hub page loads in < 2 seconds
- Client filtering is instant (< 100ms)
- Images load progressively

---

## Rollback Plan

If critical issues are discovered:

```bash
# View commit history
git log --oneline

# Rollback to before marketplace features
git reset --hard <commit-before-marketplace>

# Or revert specific commits
git revert <commit-hash>
```

**Note:** Only rollback if there are critical production issues. For bugs, create fix commits instead.

---

## Next Steps (Future Features)

After this implementation is complete and tested:

1. **User Authentication Flow** - Allow logged-in users to create classifieds
2. **User Dashboard** - Manage own classifieds (edit, delete, mark sold)
3. **Image Upload** - Enable users to upload photos when creating classifieds
4. **Featured Classifieds** - Paid promotion for monetization
5. **Save Favorites** - Allow users to bookmark classifieds
6. **Share Functionality** - Social media sharing buttons
7. **Report Content** - Flag inappropriate classifieds
8. **Advanced Filtering** - Price range, date posted, sorting options

---

**Plan Complete!** 🎉

All tasks are designed to be executed sequentially. Each task includes:
- Exact file paths
- Complete code (no pseudo-code)
- Test instructions with expected results
- Commit messages following conventional commits format

Estimated total time: 6-8 hours for a skilled developer with Next.js experience.
