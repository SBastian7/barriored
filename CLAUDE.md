# BarrioRed - Project Guide

## What is BarrioRed?

Community digital platform that democratizes commercial visibility and strengthens the social fabric in popular economy neighborhoods. Hyperlocal, multi-tenant, replicable, and low-cost.

**Pilot:** Parque Industrial, Comuna del Cafe, Pereira, Risaralda, Colombia (+30,000 inhabitants)

**Core value:** "Infraestructura digital comunitaria que democratiza la visibilidad comercial y fortalece el tejido social en barrios de economia popular"

## Tech Stack

- **Frontend:** Next.js 16 (App Router, PWA) + React 19 + Tailwind CSS
- **Backend/DB:** Supabase (PostgreSQL, Auth, Storage, RLS)
- **Maps:** Leaflet + React-Leaflet
- **UI:** Radix UI primitives + custom components
- **Auth:** Supabase Auth (email + WhatsApp OTP planned)
- **Language:** TypeScript throughout
- **Package Manager:** npm

## Brand Guidelines - Neo-Brutalist Tropical

### Visual Identity
- **Style:** Neo-Brutalist with tropical Latin American warmth
- **Borders:** 2-4px solid black, always present
- **Shadows:** Hard offset shadows (e.g., `shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`)
- **Typography:** Outfit (headings, font-black, uppercase, tracking-tighter, italic) + Inter (body)
- **Buttons:** `.brutalist-button` class - 2px black border, hard shadow, uppercase, bold
- **Cards:** `.brutalist-card` class - 2px border, 4px shadow, hover lift effect
- **Inputs:** `.brutalist-input` class - 2px black border, hard shadow, focus lift

### Color Palette (oklch)
- **Primary (Barrio Red):** `oklch(0.57 0.23 18)` - The signature red
- **Secondary (Sun Yellow):** `oklch(0.85 0.17 85)` - Warm accents, badges, highlights
- **Accent (Street Art Blue):** `oklch(0.5 0.2 260)` - Info elements, links
- **Background:** `oklch(0.99 0.01 60)` - Warm paper white
- **Foreground:** `oklch(0.15 0.02 240)` - Deep navy black
- **Borders:** Pure black `oklch(0 0 0)` for brutalist borders
- **Chart Green:** `oklch(0.5 0.15 150)` - Jungle Green
- **Chart Warm:** `oklch(0.7 0.15 30)` - Terracotta

### Design Patterns
- Rotated badges: `rotate-[-2deg]` for playful elements
- Uppercase + tracking-widest for labels and nav items
- Active states: primary bg + lifted shadow
- Disabled/coming-soon: reduced opacity + "Pronto" badge in secondary color
- Stats strips: white bg, thick black border, divided sections
- Mobile-first responsive, bottom nav on mobile, top nav on desktop

## Architecture - Multi-Tenant

Routes follow pattern: `/{community-slug}/...`

```
barriored.co/parqueindustrial  -> Pilot instance
barriored.co/cuba              -> Future expansion
barriored.co/villasantana      -> Future expansion
```

Each community has isolated data via `community_id` foreign keys. Community context is provided via `CommunityProvider` component.

## Project Structure

```
app/
  [community]/           # Multi-tenant community routes
    page.tsx             # Community homepage (hero + categories + featured)
    directory/           # Business directory listing
      [category]/        # Category-filtered view
    business/[slug]/     # Individual business profile
    map/                 # Map view of all businesses
    register/            # Business registration form
    community/           # [FUTURE] Neighborhood social board
    marketplace/         # [FUTURE] Local buy/sell classifieds
    services/            # [FUTURE] Public services directory
  auth/                  # Login, signup, callback
  admin/                 # Admin panel (business approval, categories)
  dashboard/             # Merchant dashboard (edit business)
  api/                   # API routes (businesses CRUD, auth, upload)

components/
  home/                  # Homepage sections (hero, categories, featured)
  layout/                # TopBar, BottomNav, UserMenu
  business/              # Business profile components
  directory/             # Directory listing components
  registration/          # Multi-step registration form
  community/             # Community context provider
  shared/                # Reusable (search-bar, breadcrumbs, whatsapp-button)
  ui/                    # Base UI primitives (button, card, input, etc.)

lib/
  supabase/              # Supabase client (server, client, middleware)
  types/                 # TypeScript types (database.ts, index.ts)
  validations/           # Zod schemas (auth, business)
  utils.ts               # cn() and utilities
```

## Database (Supabase)

Key tables:
- `communities` - Multi-tenant community instances
- `businesses` - Business listings (FK to community)
- `categories` - Business categories with icons
- `profiles` - User profiles linked to Supabase Auth

Business statuses: `pending` -> `approved` / `rejected`

## Development Phases & Roadmap

### MVP (CURRENT - Complete)
- [x] Community hub homepage (hero + quick nav pillars + featured businesses + register CTA)
- [x] Business directory by categories with search
- [x] Business profiles (name, description, photos, hours, map, WhatsApp button)
- [x] Business registration form (multi-step with photo upload + map picker)
- [x] Admin panel for business approval
- [x] Merchant dashboard for editing business
- [x] Supabase Auth (email)
- [x] Multi-tenant architecture
- [x] Neo-Brutalist Tropical brand design
- [x] Mobile-responsive with bottom nav

### Phase 2: Monetization (Next)
- [ ] Premium/featured business profiles (highlighted in listings)
- [ ] Rotating banner ads on homepage
- [ ] Business dashboard with view metrics/analytics
- [ ] Reviews and ratings system
- [ ] Payment integration (Nequi/manual transfer initially, then Wompi/MercadoPago)

### Phase 3: Community (Red Vecinal)
- [ ] `/{community}/community` - Neighborhood announcement board
- [ ] Community alerts (water cuts, construction, security)
- [ ] Local events calendar
- [ ] Local job postings
- [ ] Public services and emergency directory

### Phase 4: Marketplace (Clasificados)
- [ ] `/{community}/marketplace` - Buy/sell classifieds between neighbors
- [ ] Featured classified listings (paid)

### Phase 5: Services Info
- [ ] `/{community}/services` - Emergency contacts, transport, government procedures
- [ ] Curated directory of public services

## Navigation Structure

**TopBar (Desktop):** Logo | Directorio | Comunidad (pronto) | Marketplace (pronto) | Servicios (pronto) | UserMenu

**BottomNav (Mobile):** Inicio | Directorio | Comunidad (pronto) | Marketplace (pronto) | Servicios (pronto)

**Homepage QuickNav:** 4 large cards for each platform pillar (Directorio, Comunidad, Marketplace, Servicios)

Sections marked "pronto" / "Proximamente" are disabled with a yellow badge. Enable them as each phase is implemented by setting `enabled: true` / `active: true` in the respective nav component.

### Homepage Structure
1. **HeroBanner** - Community name, location, description, stats (businesses, vecinos, 100% local)
2. **QuickNav** - 4 platform pillar cards with icons and descriptions
3. **FeaturedBusinesses** - 3 most recent businesses (preview, links to full directory)
4. **RegisterCTA** - Bold CTA for merchants to register their business

## Key Differentiators to Preserve

1. **Informal business inclusion** - No RUT or Camara de Comercio required for basic registration
2. **WhatsApp-first** - WhatsApp is the primary CTA on business profiles (not phone calls or web)
3. **Hyperlocal** - One commune at a time, not city-wide
4. **Multi-tenant replicable** - Architecture supports multiple communities from day one
5. **Low cost** - Supabase free tier, Vercel/Hostinger hosting, minimal infrastructure

## Language & Content

- All user-facing content is in **Spanish (Colombia)**
- Use "tu" (informal) for community members, warm and approachable tone
- Technical/admin content can be in English
- Business categories, descriptions, and labels are in Spanish

## Conventions

- Use `'use client'` directive only when component needs hooks/interactivity
- Server components by default for data fetching
- Supabase server client for server components, browser client for client components
- Follow Next.js App Router patterns (async server components, route handlers)
- Use `cn()` utility for conditional Tailwind classes
- Use lucide-react for all icons
- Keep brutalist design consistent: black borders, hard shadows, uppercase labels

## Metrics & Goals

**MVP Phase (Months 1-2):** 50-100 businesses registered, 200-500 monthly users
**Growth (Months 3-6):** 200-300 businesses, 1000-2000 users, first premium subscribers
**Scale (Month 7+):** 500+ businesses, 5000+ users, $2M+ COP monthly revenue

**Social Impact Metrics:**
- Number of informal businesses getting their first digital presence
- Reported sales increase by participating merchants
- Neighbor connections facilitated
- Local jobs connected through platform
