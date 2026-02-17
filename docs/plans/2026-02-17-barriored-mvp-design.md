# BarrioRed MVP Design

**Date:** 2026-02-17
**Status:** Approved
**Scope:** Full MVP -- homepage, directory, business profiles, registration, admin panel

## Overview

BarrioRed is a community digital platform (PWA) that provides commercial visibility for small and informal businesses in popular neighborhoods in Pereira, Colombia. Pilot: Parque Industrial, Comuna del Cafe (~30,000 inhabitants).

Key differentiators: inclusion of informal businesses (no RUT required), WhatsApp-first communication, hyperlocal per commune, multi-tenant replicable architecture.

## Stack

| Layer | Technology | Justification |
|---|---|---|
| Frontend | Next.js 15 (App Router, PWA) | SSR for SEO, installable without app store |
| UI | Tailwind CSS + shadcn/ui | Accessible components, modern design, no dependency lock-in |
| Backend | Supabase (PostgreSQL + PostGIS) | Zero backend ops, free tier, RLS for multi-tenant |
| Auth | Supabase Auth + GetOTP.co | Email/password + WhatsApp OTP |
| Storage | Supabase Storage | Images with CDN, integrated with DB |
| Maps | Leaflet + OpenStreetMap | Free, no API limits |
| Hosting | Vercel | Free tier, auto-deploy from GitHub, CDN |
| Validation | Zod | Runtime type safety on all API inputs |

**No server actions.** All mutations go through API Routes (`app/api/`) or direct Supabase client SDK calls.

## Data Model

All tables live in Supabase PostgreSQL with RLS enabled for multi-tenant isolation.

### communities

```sql
CREATE TABLE communities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  municipality text NOT NULL,
  department text NOT NULL,
  description text,
  logo_url text,
  primary_color text DEFAULT '#1E40AF',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

### categories

Global across communities.

```sql
CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  icon text,
  parent_id uuid REFERENCES categories(id),
  sort_order int DEFAULT 0
);
```

### businesses

```sql
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES communities(id),
  owner_id uuid NOT NULL REFERENCES auth.users(id),
  category_id uuid NOT NULL REFERENCES categories(id),
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  address text,
  location geography(Point, 4326),
  phone text,
  whatsapp text,
  email text,
  website text,
  hours jsonb,
  photos text[],
  is_verified boolean DEFAULT false,
  is_active boolean DEFAULT true,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (community_id, slug)
);

CREATE INDEX idx_businesses_community ON businesses(community_id);
CREATE INDEX idx_businesses_category ON businesses(category_id);
CREATE INDEX idx_businesses_status ON businesses(status);
CREATE INDEX idx_businesses_location ON businesses USING GIST(location);
CREATE INDEX idx_businesses_search ON businesses USING GIN(to_tsvector('spanish', name || ' ' || COALESCE(description, '')));
```

### profiles

Extension of Supabase `auth.users`.

```sql
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  community_id uuid REFERENCES communities(id),
  full_name text,
  phone text,
  role text DEFAULT 'neighbor' CHECK (role IN ('neighbor', 'merchant', 'admin')),
  avatar_url text,
  created_at timestamptz DEFAULT now()
);
```

### Database Functions

```sql
-- Auto-create profile on signup
CREATE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Nearby businesses search
CREATE FUNCTION nearby_businesses(lat float, lng float, radius_km float, comm_id uuid)
RETURNS SETOF businesses AS $$
  SELECT *
  FROM businesses
  WHERE community_id = comm_id
    AND status = 'approved'
    AND ST_DWithin(location, ST_MakePoint(lng, lat)::geography, radius_km * 1000)
  ORDER BY ST_Distance(location, ST_MakePoint(lng, lat)::geography);
$$ LANGUAGE sql STABLE;

-- Full-text search
CREATE FUNCTION search_businesses(query text, comm_id uuid)
RETURNS SETOF businesses AS $$
  SELECT *
  FROM businesses
  WHERE community_id = comm_id
    AND status = 'approved'
    AND to_tsvector('spanish', name || ' ' || COALESCE(description, ''))
        @@ plainto_tsquery('spanish', query)
  ORDER BY ts_rank(
    to_tsvector('spanish', name || ' ' || COALESCE(description, '')),
    plainto_tsquery('spanish', query)
  ) DESC;
$$ LANGUAGE sql STABLE;
```

## Row Level Security

All tables have RLS enabled. No policies = no access.

### communities
- SELECT: public (active communities)
- INSERT/UPDATE/DELETE: superadmin only (Supabase Dashboard)

### categories
- SELECT: public
- INSERT/UPDATE/DELETE: users with `role = 'admin'`

### businesses
- SELECT public: `status = 'approved'` AND community `is_active = true`
- SELECT owner: own businesses in any status
- SELECT admin: all businesses in their community
- INSERT: authenticated users, `community_id` must match their profile
- UPDATE: business owner OR admin of same community
- DELETE: admin of community only

### profiles
- SELECT: own profile. Admins see profiles in their community.
- INSERT: only via `handle_new_user()` trigger
- UPDATE: own profile. Admins can change `role` in their community.

## URL Structure

```
barriored.co/                                   → Landing (community selector)
barriored.co/[community]/                       → Community homepage
barriored.co/[community]/directory              → Full directory with filters
barriored.co/[community]/directory/[category]   → Businesses by category
barriored.co/[community]/business/[slug]        → Public business profile
barriored.co/[community]/register               → Register business (auth required)
barriored.co/[community]/map                    → Map view

/auth/login                                      → Login
/auth/signup                                     → Signup
/auth/callback                                   → OAuth/OTP callback

/dashboard/                                      → Merchant panel
/dashboard/business/[id]/edit                    → Edit business

/admin/                                          → Admin panel
/admin/businesses                                → Pending/approved businesses
/admin/businesses/[id]                           → Review business
/admin/categories                                → Manage categories
```

## Rendering Strategy

| Route | Rendering | Reason |
|---|---|---|
| `[community]/` | SSR | SEO |
| `[community]/business/[slug]` | SSR | SEO -- each business indexable |
| `[community]/directory` | SSR + client hydration | SEO base + interactive filters |
| `[community]/map` | Client-side | Leaflet requires DOM |
| `/auth/*` | Client-side | No SEO needed |
| `/dashboard/*` | Client-side (protected) | Private data |
| `/admin/*` | Client-side (protected) | Admin only |

## Next.js App Structure

```
app/
  layout.tsx                        → Root layout (providers, fonts)
  page.tsx                          → Landing
  middleware.ts                     → Community resolution, auth guards
  auth/
    login/page.tsx
    signup/page.tsx
    callback/page.tsx
  dashboard/
    layout.tsx                      → Auth guard + sidebar
    page.tsx                        → My businesses
    business/[id]/edit/page.tsx
  admin/
    layout.tsx                      → Admin guard + sidebar
    businesses/page.tsx
    businesses/[id]/page.tsx
    categories/page.tsx
  [community]/
    layout.tsx                      → Load community, validate slug, inject theme
    page.tsx                        → Homepage (search + categories)
    directory/
      page.tsx                      → Listing with filters
      [category]/page.tsx           → Filtered by category
    business/
      [slug]/page.tsx               → Public profile
    register/page.tsx               → Business registration form
    map/page.tsx                    → Map view
  api/
    businesses/
      route.ts                      → POST: create business
    businesses/[id]/
      route.ts                      → PATCH: edit business
    businesses/[id]/approve/
      route.ts                      → POST: approve (admin)
    businesses/[id]/reject/
      route.ts                      → POST: reject (admin)
    upload/
      route.ts                      → POST: signed URL for Storage
    auth/
      whatsapp-otp/
        send/route.ts               → POST: send OTP via GetOTP.co
        verify/route.ts             → POST: verify OTP
```

## Components

### Shared / Layout
- `CommunityProvider` -- Context with community data (colors, name, slug)
- `TopBar` -- Community logo, inline search, auth button
- `BottomNav` (mobile) -- Home, Directory, Map, Register
- `SearchBar` -- Name search with 300ms debounce, Supabase full-text

### Homepage
- `HeroBanner` -- Community name, prominent search, stats
- `CategoryGrid` -- Grid of categories with icon + name
- `FeaturedBusinesses` -- Carousel of recent/featured businesses

### Directory
- `BusinessList` -- Card list/grid with infinite scroll (cursor pagination)
- `BusinessCard` -- Photo, name, category, address, WhatsApp button
- `FilterSidebar` / `FilterSheet` (mobile) -- Category, sort order
- `ActiveFilters` -- Chips showing active filters

### Business Profile
- `BusinessHeader` -- Main photo, name, category, verified badge
- `BusinessInfo` -- Address, hours, phone, WhatsApp CTA
- `PhotoGallery` -- Photo carousel
- `LocationMap` -- Leaflet map with business pin
- `WhatsAppButton` -- Floating "Contact via WhatsApp" button

### Registration
- `RegisterBusinessForm` -- Multi-step:
  1. Basic info (name, category, description)
  2. Contact (phone, whatsapp, email)
  3. Location (address + draggable map pin)
  4. Photos (upload to Supabase Storage)
  5. Confirmation
- Submit via POST to `/api/businesses`, creates with `status: 'pending'`

### Map
- `FullMap` -- Leaflet full map with business markers
- `MapPopup` -- Mini BusinessCard on marker click
- `MapFilters` -- Filter markers by category

### Auth
- `LoginForm` -- Tabs: Email/Password | WhatsApp OTP
- `WhatsAppOTPForm` -- Phone input → GetOTP.co → code input
- `SignupForm` -- Name, email, phone, password, community selection

### Dashboard
- `MyBusinesses` -- User's businesses with status
- `EditBusinessForm` -- Reuses RegisterBusinessForm in edit mode

### Admin
- `PendingBusinessList` -- Businesses with `status: 'pending'`, approve/reject actions
- `BusinessReview` -- Detailed view for review
- `CategoryManager` -- CRUD table + modal

## Key Data Flows

### Search Flow
```
User types in SearchBar → debounce 300ms → Supabase RPC search_businesses(query, community_id)
→ Results render in BusinessList → Click card → navigate to /[community]/business/[slug]
→ SSR loads full profile → Click WhatsApp → opens wa.me/57{number}?text=...
```

### Business Registration Flow
```
1. Unauthenticated user → redirect to /auth/signup with returnUrl
2. Signup (email+pass or WhatsApp OTP) → trigger creates profile → redirect back
3. Multi-step form, local React state per step
4. Photos: POST /api/upload → signed URL → direct upload to Supabase Storage
5. Submit: POST /api/businesses → status: 'pending'
6. Admin reviews → POST /api/businesses/[id]/approve → business goes live
```

### WhatsApp OTP Flow
```
1. User enters phone (+57...)
2. POST /api/auth/whatsapp-otp/send → server calls GetOTP.co → sends WhatsApp code
3. User enters 6-digit code
4. POST /api/auth/whatsapp-otp/verify → server verifies with GetOTP.co
   → user exists? sign in : create user + profile → return session
```

### Multi-tenant Resolution (Middleware)
```
Request: barriored.co/parqueindustrial/directory
→ Extract first segment: "parqueindustrial"
→ Skip known routes (/auth, /dashboard, /admin, /api, /_next)
→ Query: communities.select().eq('slug', 'parqueindustrial').single()
→ Not found or !is_active → 404
→ Found → inject community_id in headers for layouts
```

## PWA

Using `@ducanh2912/next-pwa`:
- Service Worker: precache shell (layout, CSS, fonts), runtime cache images and API
- Manifest: dynamic theme_color per community, `display: standalone`
- Offline: cached directory available offline. Uncached pages show fallback
- Install prompt: custom banner on first mobile visit

## SEO

- `generateMetadata()` on all SSR pages with community and business names
- JSON-LD `LocalBusiness` structured data on business profiles
- Dynamic `sitemap.ts` with all active communities and approved businesses
- `robots.ts` allowing public pages, blocking dashboard/admin
- Open Graph images for WhatsApp share previews

## Performance

- Images: Supabase Storage URL transforms + `next/image` with custom loader
- Pagination: cursor-based infinite scroll (not offset)
- Search: 300ms debounce + `ts_vector` GIN index
- Maps: lazy load Leaflet via `next/dynamic` with `ssr: false`
- Bundle: automatic code splitting per route

## Security

### RLS
All tables have RLS enabled. Policies enforce multi-tenant isolation at DB level.

### API Routes
- All routes validate Supabase session via `createRouteHandlerClient`
- Admin operations verify `role = 'admin'` AND matching `community_id`
- Rate limiting on OTP endpoints (max 3 attempts per phone per 10 minutes)
- Upload: signed URLs with 5-minute expiration, max 5MB, images only

### Input Validation
- Zod schemas on all API route inputs
- Text sanitization (XSS) on business name/description
- Colombian phone validation regex: `^57[0-9]{10}$`

### Auth
- Supabase Auth handles JWT tokens, refresh, session management
- GetOTP.co API key only in server-side env vars
- CORS: only `barriored.co` and `localhost` in development
