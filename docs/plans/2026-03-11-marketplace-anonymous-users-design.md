# Marketplace Anonymous Users - Design Document

**Date:** 2026-03-11
**Author:** Claude Code
**Status:** Approved
**Phase:** Phase 4 - Marketplace (Clasificados) - Anonymous User Features

## Executive Summary

This document outlines the design for implementing marketplace (clasificados) features for anonymous visitors in BarrioRed. This builds on the completed admin marketplace infrastructure to enable public browsing, filtering, searching, and viewing of classified listings with WhatsApp contact functionality.

## Requirements Summary

Anonymous visitors must be able to:
- ✅ View marketplace hub page
- ✅ Browse all active classifieds
- ✅ Filter classifieds by category
- ✅ Search classifieds by keyword
- ✅ View classified listing detail
- ✅ Click WhatsApp to contact seller (redirects to app)

## Key Design Decisions

### 1. Hub Page Structure
**Decision:** Hybrid approach (Featured + Browse)
**Rationale:** Combines discovery (3 newest items in featured section) with functional browsing (filters + grid). Balances visual appeal with usability.

### 2. Featured Section Size
**Decision:** 3 items (minimal)
**Rationale:** Compact, doesn't dominate the page. Shows what's new without overwhelming. Horizontal row on desktop, stacks on mobile.

### 3. Detail Page Layout
**Decision:** Two-column split (images left, details right)
**Rationale:** Desktop-optimized layout that keeps important info visible while browsing images. Mobile stacks vertically for responsive experience.

### 4. Filter/Search Strategy
**Decision:** Client-side filtering with 50-item limit
**Rationale:**
- Fast UX (instant filtering, no server roundtrips)
- Simple implementation (reuses existing components)
- Sufficient for hyperlocal pilot community
- Can upgrade to server-side pagination later if needed

### 5. Component Reuse
**Decision:** Leverage existing admin marketplace components
**Rationale:**
- Fastest path to MVP
- Proven components already styled and tested
- Type-safe with existing database schema
- Just hide admin actions for public view

### 6. Navigation Activation
**Decision:** Enable marketplace in top bar and bottom nav
**Rationale:** Currently marked as inactive (`active: false`). Set to `true` to make marketplace accessible to all users.

---

## Architecture & File Structure

### New Files to Create

```
app/[community]/marketplace/
  ├── page.tsx                    # Server Component - marketplace hub
  └── [id]/
      └── page.tsx                # Server Component - classified detail

components/marketplace/
  ├── marketplace-hub.tsx         # Client - featured section + filters + grid wrapper
  ├── classified-grid.tsx         # Client - filterable grid of cards
  └── classified-detail-view.tsx  # Client - two-column detail layout
```

### Reused Components

- `components/marketplace/classified-card.tsx` - Adapt for public view (hide admin actions)
- `components/marketplace/marketplace-filters.tsx` - Reuse, remove status filter for public
- `components/marketplace/classified-status-badge.tsx` - Reuse as-is

### Navigation Updates

**Files to modify:**
- `components/layout/top-bar.tsx` - Set marketplace `active: true` (line 13)
- `components/layout/bottom-nav.tsx` - Set marketplace `active: true`

### Database Access Pattern

**Server Components:**
- Direct Supabase queries (no API routes needed)
- Hub page: Fetch all active classifieds with relations
- Detail page: Fetch single classified with full relations

**Query Examples:**

```typescript
// Hub page - fetch active classifieds
const { data: classifieds } = await supabase
  .from('classifieds')
  .select(`
    *,
    profiles(full_name, avatar_url),
    marketplace_categories(name, slug, icon)
  `)
  .eq('community_id', community.id)
  .eq('status', 'active')
  .order('created_at', { ascending: false })
  .limit(50)

// Detail page - fetch single classified
const { data: classified } = await supabase
  .from('classifieds')
  .select(`
    *,
    profiles(full_name, avatar_url),
    marketplace_categories(name, slug, icon),
    communities(name, slug)
  `)
  .eq('id', id)
  .eq('status', 'active')
  .single()
```

---

## Page Components

### 1. Marketplace Hub Page (`app/[community]/marketplace/page.tsx`)

**Server Component - Data Fetching:**
- Fetch community by slug
- Fetch 50 most recent active classifieds with relations
- Pass data to client component

**Layout Structure:**
1. Breadcrumbs - "Community > Marketplace"
2. Page Header - Large brutalist heading + subtitle
3. Featured Section - 3 newest classifieds (yellow bg, "LO MÁS NUEVO" label)
4. Filter Bar - Category dropdown + search input
5. Results Grid - Filtered classifieds (responsive grid)

**Metadata:**
```typescript
export async function generateMetadata({ params }) {
  const { community: slug } = await params
  const supabase = await createClient()
  const { data: community } = await supabase
    .from('communities')
    .select('name')
    .eq('slug', slug)
    .single()

  return {
    title: `Marketplace - Clasificados en ${community.name} | BarrioRed`,
    description: `Compra, vende y arrienda en ${community.name}. Clasificados locales de tu barrio.`
  }
}
```

---

### 2. Classified Detail Page (`app/[community]/marketplace/[id]/page.tsx`)

**Server Component - Data Fetching:**
- Fetch classified by ID
- Verify status is 'active' (otherwise show not available message)
- Pass to client component

**Layout Structure:**

**Desktop (Two-Column):**
- Left (60%): Image gallery with thumbnails
- Right (40%): Details card

**Mobile (Stacked):**
- Gallery on top
- Details below
- WhatsApp button sticky at bottom

**Details Card Content:**
- Category badge + date posted
- Title (large, bold, uppercase)
- Price (primary color, prominent)
- Description (readable text)
- Seller info (avatar, name, "Publicado hace X días")
- WhatsApp CTA button (brutalist, primary color, large)

**WhatsApp Button:**
```tsx
<a
  href={`https://wa.me/${classified.whatsapp}?text=Hola, vi tu clasificado "${classified.title}" en BarrioRed`}
  target="_blank"
  rel="noopener noreferrer"
  className="brutalist-button w-full bg-primary text-primary-foreground text-lg py-4 gap-2"
>
  <MessageCircle className="h-5 w-5" />
  CONTACTAR POR WHATSAPP
</a>
```

**Metadata:**
```typescript
export async function generateMetadata({ params }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: classified } = await supabase
    .from('classifieds')
    .select('title, description, images')
    .eq('id', id)
    .single()

  if (!classified) return {}

  return {
    title: `${classified.title} | Marketplace BarrioRed`,
    description: classified.description.substring(0, 160),
    openGraph: {
      images: classified.images?.[0] || '/og-image.png'
    }
  }
}
```

---

## Client Components

### 1. MarketplaceHub (`components/marketplace/marketplace-hub.tsx`)

**Type:** Client Component (`'use client'`)

**Props:**
```typescript
interface MarketplaceHubProps {
  classifieds: ClassifiedWithRelations[]
  communitySlug: string
}
```

**Responsibilities:**
- Display featured section (3 newest items)
- Manage filter state (category, search query)
- Client-side filtering logic
- Pass filtered results to ClassifiedGrid

**State Management:**
```typescript
const [filters, setFilters] = useState({
  category: 'all',
  search: ''
})
const [filteredClassifieds, setFilteredClassifieds] = useState(classifieds)

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
```

**UI Sections:**
1. **Featured Section** - Yellow bg, thick border, "LO MÁS NUEVO" label, 3 cards horizontal
2. **Filters** - Adapted MarketplaceFilters (category + search only, no status)
3. **Grid** - ClassifiedGrid component with filtered results

---

### 2. ClassifiedGrid (`components/marketplace/classified-grid.tsx`)

**Type:** Client Component

**Props:**
```typescript
interface ClassifiedGridProps {
  classifieds: ClassifiedWithRelations[]
  communitySlug: string
}
```

**Responsibilities:**
- Render classifieds in responsive grid
- Show empty state if no results
- Use ClassifiedCard component with variant="public"

**Layout:**
- 3 columns on lg screens
- 2 columns on md screens
- 1 column on mobile

**Empty State:**
```tsx
{classifieds.length === 0 && (
  <div className="brutalist-card p-8 text-center">
    <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-black/20" />
    <p className="text-lg font-bold text-black/60">
      No se encontraron clasificados
    </p>
  </div>
)}
```

---

### 3. ClassifiedDetailView (`components/marketplace/classified-detail-view.tsx`)

**Type:** Client Component

**Props:**
```typescript
interface ClassifiedDetailViewProps {
  classified: ClassifiedWithRelations
}
```

**Responsibilities:**
- Two-column layout (desktop) / stacked (mobile)
- Image gallery with thumbnail navigation
- Details card with all info
- WhatsApp contact button

**Image Gallery:**
- Main image (large, Next.js Image optimized)
- Thumbnail strip below (if multiple images)
- Navigation arrows for switching
- Brutalist borders on containers
- Placeholder if no images

**Details Card:**
- White bg, 4px black border, hard shadow
- Sections divided by 2px horizontal lines
- Labels uppercase (tracking-widest)
- Content normal case

---

### 4. ClassifiedCard Adaptation

**Modification to existing component:**

Add `variant` prop:
```typescript
interface ClassifiedCardProps {
  classified: ClassifiedWithRelations
  variant?: 'admin' | 'public'
  // ... existing props
}
```

**When variant="public":**
- Hide admin action buttons (Mark Sold, Archive, Delete)
- Show only "Ver Detalle" link
- Link to `/{community}/marketplace/{id}` (not admin panel)
- Keep all brutalist styling

**When variant="admin" (default):**
- Show all admin actions
- Link to `/admin/marketplace/{id}`
- Existing behavior

---

## UI/UX Design (Neo-Brutalist Tropical)

### Hub Page Header

```tsx
<header className="space-y-2 mb-12">
  <h1 className="text-5xl md:text-7xl font-heading font-black uppercase tracking-tighter italic">
    Clasifi<span className="text-primary">cados</span>
  </h1>
  <p className="text-lg font-bold text-black/60 uppercase tracking-widest">
    Compra, vende y arrienda en tu barrio
  </p>
</header>
```

### Featured Section Design

```tsx
<section className="bg-secondary/20 border-4 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-8">
  <div className="flex items-center gap-2 mb-4">
    <div className="bg-secondary px-2 py-1 border-2 border-black rotate-[-2deg]">
      <span className="text-[10px] font-black uppercase tracking-widest">
        Lo Más Nuevo
      </span>
    </div>
  </div>

  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    {/* 3 ClassifiedCard components */}
  </div>
</section>
```

### Filter Bar Styling

- Reuse `<MarketplaceFilters>` component
- Remove status dropdown (public users don't need it)
- Keep category + search input
- Brutalist input styling (2px borders, hard shadows)
- Show result count: "Mostrando X clasificados"

### Classified Cards (Public View)

- Same brutalist styling as admin cards
- 2px black border, 4px offset shadow
- Hover effect: shadow disappears, card shifts 4px
- Thumbnail on left (square, 128px)
- Content in center (title, price, description preview)
- Single action button: "Ver Detalle"

### Detail Page Design Elements

**Image Gallery Container:**
```tsx
<div className="border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white">
  {/* Next.js Image with main photo */}
  {/* Thumbnail strip below */}
</div>
```

**Details Card:**
```tsx
<div className="brutalist-card p-6 space-y-6 sticky top-20">
  {/* Category + Date badges */}
  {/* Title */}
  {/* Price */}
  {/* Divider */}
  {/* Description */}
  {/* Divider */}
  {/* Seller info */}
  {/* Divider */}
  {/* WhatsApp button */}
</div>
```

**WhatsApp Button Styling:**
- Full width
- Large padding (py-4)
- Primary background color
- Uppercase text
- Icon + text
- Brutalist shadow/border
- Hover: lift effect

---

## Data Flow

```
1. User visits /{community}/marketplace
   ↓
2. Server Component fetches:
   - Community by slug
   - 50 active classifieds with relations
   ↓
3. Renders page with MarketplaceHub client component
   ↓
4. Client component displays:
   - Featured section (3 newest)
   - Filter controls
   - Full grid of classifieds
   ↓
5. User applies filter (category: "vendo")
   ↓
6. Client-side filtering (instant):
   - Filter array in memory
   - Update filteredClassifieds state
   - Re-render ClassifiedGrid
   ↓
7. User types search query "bicicleta"
   ↓
8. Client-side search:
   - Filter by title/description match
   - Combine with category filter
   - Update grid instantly
   ↓
9. User clicks "Ver Detalle"
   ↓
10. Navigate to /{community}/marketplace/{id}
    ↓
11. Server Component fetches single classified
    ↓
12. Renders ClassifiedDetailView
    ↓
13. User clicks "Contactar por WhatsApp"
    ↓
14. Opens WhatsApp app/web with pre-filled message:
    "Hola, vi tu clasificado '{title}' en BarrioRed"
```

---

## Error Handling & Edge Cases

### Empty States

**No classifieds in community:**
```tsx
<div className="brutalist-card p-12 text-center space-y-4">
  <ShoppingBag className="h-16 w-16 mx-auto text-black/20" />
  <h3 className="font-heading font-black uppercase text-2xl">
    Sin clasificados aún
  </h3>
  <p className="text-black/60">
    Sé el primero en publicar algo en el marketplace
  </p>
  <Link
    href={`/${slug}/auth/login`}
    className="brutalist-button inline-block"
  >
    Publicar Clasificado
  </Link>
</div>
```

**No search results:**
```tsx
<div className="brutalist-card p-8 text-center space-y-4">
  <p className="text-lg font-bold text-black/60">
    No se encontraron clasificados para "{searchQuery}"
  </p>
  <button
    onClick={() => setFilters({ category: 'all', search: '' })}
    className="brutalist-button"
  >
    Limpiar Filtros
  </button>
</div>
```

---

### Error Cases

**Classified not found (404):**
```typescript
// In detail page.tsx
if (!classified) {
  notFound() // Next.js 404 page
}
```

**Classified is not active:**
```tsx
if (classified.status !== 'active') {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-16">
      <div className="brutalist-card p-12 text-center space-y-4">
        <h2 className="font-heading font-black uppercase text-3xl">
          Clasificado No Disponible
        </h2>
        <p className="text-black/60">
          Este clasificado ya no está activo o ha sido {classified.status === 'sold' ? 'vendido' : 'eliminado'}
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
```

**No images in classified:**
- Use placeholder image: `/placeholder-classified.png`
- Show camera icon with "Sin fotos" in gallery
- Still show layout (don't hide gallery section)

**Invalid WhatsApp number:**
- Still render button (don't validate on frontend)
- Browser will handle wa.me URL
- Server-side validation should have caught this on creation

---

### Loading States

**Hub Page:**
- Server Component renders with data (no spinner needed)
- Next.js automatic loading.tsx if needed

**Client-side filtering:**
- Instant (no loading state)
- Show count: "Mostrando X de Y clasificados"

**Detail Page:**
- Server Component renders with data
- Images load progressively with Next.js Image

---

## Security & Permissions

### Access Control

**Anonymous users can:**
- ✅ View all active classifieds
- ✅ Filter and search
- ✅ View detail pages
- ✅ Click WhatsApp contact

**Anonymous users cannot:**
- ❌ Create new classifieds (requires login)
- ❌ Edit any classifieds
- ❌ Delete any classifieds
- ❌ Flag classifieds (requires login)
- ❌ See non-active classifieds (sold, archived, removed, flagged)

### Data Filtering

**RLS Policies (already exist):**
- Public can SELECT where `status = 'active'`
- Authenticated users can SELECT their own (any status)
- Admins can SELECT all in their community

**Server-side enforcement:**
```typescript
// Always filter by status in queries
.eq('status', 'active')
```

### Rate Limiting

- No API routes needed (Server Components)
- Supabase RLS handles access control
- Consider CDN caching for hub page

---

## Performance Considerations

### Server Components Benefits

- Data fetched on server (secure)
- No client-side API calls
- Automatic caching by Next.js
- SEO-friendly (full HTML rendered)

### Client-Side Filtering Trade-offs

**Pros:**
- Instant filtering (no network delay)
- Simple implementation
- Great UX for small datasets

**Cons:**
- Limited to 50 items initially
- All data loaded upfront

**Future Optimization:**
- If community grows >100 classifieds, switch to server-side pagination
- Add URL params for filters (enables link sharing)
- Implement infinite scroll

### Image Optimization

- Use Next.js Image component (automatic optimization)
- Generate thumbnails on upload (already done in admin)
- Lazy load images below fold
- Serve from Supabase Storage CDN

### Bundle Size

- Reusing existing components (no new dependencies)
- Client components minimal (filtering logic only)
- Tree-shaking removes unused code

---

## Migration Strategy

### Phase 1: Navigation & Routes (Day 1)
1. Update top-bar.tsx - set marketplace active: true
2. Update bottom-nav.tsx - set marketplace active: true
3. Create route folders (marketplace, marketplace/[id])
4. Test navigation works

### Phase 2: Hub Page (Day 2)
1. Create marketplace/page.tsx (server component)
2. Implement data fetching
3. Create MarketplaceHub client component
4. Create ClassifiedGrid component
5. Adapt MarketplaceFilters for public use
6. Test filtering and search

### Phase 3: Detail Page (Day 3)
1. Create marketplace/[id]/page.tsx
2. Implement single classified fetch
3. Create ClassifiedDetailView component
4. Build image gallery
5. Add WhatsApp button
6. Test detail page rendering

### Phase 4: Component Adaptation (Day 4)
1. Add variant prop to ClassifiedCard
2. Implement public view logic
3. Test card rendering in both contexts
4. Fix any styling issues

### Phase 5: Error Handling (Day 5)
1. Add empty states
2. Add not found handling
3. Add inactive classified handling
4. Test all edge cases

### Phase 6: Testing & Polish (Day 6)
1. Test full user flow
2. Mobile responsiveness check
3. SEO metadata verification
4. Performance audit
5. Accessibility check

---

## Success Metrics

### MVP Completion Criteria

- ✅ Anonymous users can browse marketplace hub
- ✅ Filtering by category works (instant)
- ✅ Search by keyword works (instant)
- ✅ Detail page shows all classified info
- ✅ WhatsApp button opens with pre-filled message
- ✅ Mobile responsive (bottom nav, stacked layout)
- ✅ No TypeScript errors (no `any` types)
- ✅ Neo-brutalist design consistent with platform

### Performance Targets

- Hub page loads in < 2 seconds
- Client filtering responds in < 100ms
- Images load progressively (lazy loading)
- Mobile-friendly (passes Core Web Vitals)

### Quality Targets

- TypeScript strict mode (no `any`)
- Proper types from database schema
- SEO metadata complete
- Accessibility (ARIA labels where needed)
- Error messages in Spanish

---

## Future Enhancements (Out of Scope)

### Phase 2: Monetization
- Featured classifieds (paid promotion)
- Homepage banner with marketplace highlights
- Analytics (view counts, WhatsApp clicks)

### Phase 3: User Features (Requires Login)
- Create new classified listing
- Edit own classifieds
- Mark as sold
- Archive old listings
- Save favorite classifieds

### Phase 4: Advanced Filtering
- Price range filter
- Date range (posted last week, month, etc.)
- Sort by (newest, oldest, price)
- Server-side pagination with URL params

### Phase 5: Social Features
- Share classified on social media
- Report inappropriate content
- User ratings/reputation

---

## Conclusion

This design provides a complete marketplace browsing experience for anonymous users while:
1. Reusing proven admin infrastructure
2. Following Next.js App Router best practices
3. Maintaining neo-brutalist tropical brand design
4. Delivering fast, responsive UX with client-side filtering
5. Setting foundation for future user features

The hybrid hub approach (featured + browse) balances discovery with functionality, while the two-column detail layout optimizes for desktop viewing while remaining mobile-friendly.

**Next Steps:** Proceed to implementation planning using the writing-plans skill.
