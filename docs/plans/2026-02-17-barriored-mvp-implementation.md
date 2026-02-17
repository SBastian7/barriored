# BarrioRed MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a multi-tenant community platform (PWA) for local business visibility in Pereira, Colombia.

**Architecture:** Next.js 15 App Router (Vercel) + Supabase (PostgreSQL/PostGIS, Auth, Storage, RLS). No Django, no server actions. All mutations via API Routes. Multi-tenant from day one.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, Supabase, Zod, Leaflet, @ducanh2912/next-pwa

**Design Doc:** `docs/plans/2026-02-17-barriored-mvp-design.md`

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `.env.local.example`, `.gitignore`

**Step 1: Initialize Next.js project**

Run:
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --turbopack
```

Expected: Next.js 15 project created with App Router, Tailwind, TypeScript.

**Step 2: Install core dependencies**

Run:
```bash
npm install @supabase/supabase-js @supabase/ssr zod lucide-react
npm install -D @types/node
```

**Step 3: Install shadcn/ui**

Run:
```bash
npx shadcn@latest init -d
```

Then add initial components:
```bash
npx shadcn@latest add button input label card badge tabs sheet dialog select textarea separator skeleton toast
```

**Step 4: Create environment file**

Create `.env.local.example`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GETOTP_API_KEY=your_getotp_api_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Copy to `.env.local` and fill with real values.

**Step 5: Update .gitignore**

Ensure `.env.local` is in `.gitignore` (create-next-app includes it by default). Add:
```
.env.local
.env*.local
```

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js 15 project with Tailwind, shadcn/ui, Supabase deps"
```

---

## Task 2: Supabase Project Setup

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`
- Create: `supabase/seed.sql`

**Step 1: Create Supabase project**

Go to https://supabase.com/dashboard and create a new project called "barriored". Copy the URL and anon key to `.env.local`.

**Step 2: Write initial migration**

Create `supabase/migrations/001_initial_schema.sql`:

```sql
-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- Communities table
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

-- Categories table (global)
CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  icon text,
  parent_id uuid REFERENCES categories(id),
  sort_order int DEFAULT 0
);

-- Profiles table (extends auth.users)
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  community_id uuid REFERENCES communities(id),
  full_name text,
  phone text,
  role text DEFAULT 'neighbor' CHECK (role IN ('neighbor', 'merchant', 'admin')),
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

-- Businesses table
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

-- Indexes
CREATE INDEX idx_businesses_community ON businesses(community_id);
CREATE INDEX idx_businesses_category ON businesses(category_id);
CREATE INDEX idx_businesses_status ON businesses(status);
CREATE INDEX idx_businesses_location ON businesses USING GIST(location);
CREATE INDEX idx_businesses_search ON businesses USING GIN(
  to_tsvector('spanish', name || ' ' || COALESCE(description, ''))
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
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

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER businesses_updated_at
  BEFORE UPDATE ON businesses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Full-text search function
CREATE OR REPLACE FUNCTION search_businesses(query text, comm_id uuid)
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

-- Nearby businesses function
CREATE OR REPLACE FUNCTION nearby_businesses(lat float, lng float, radius_km float, comm_id uuid)
RETURNS SETOF businesses AS $$
  SELECT *
  FROM businesses
  WHERE community_id = comm_id
    AND status = 'approved'
    AND ST_DWithin(location, ST_MakePoint(lng, lat)::geography, radius_km * 1000)
  ORDER BY ST_Distance(location, ST_MakePoint(lng, lat)::geography);
$$ LANGUAGE sql STABLE;
```

**Step 3: Run migration in Supabase**

Go to Supabase Dashboard > SQL Editor. Paste and run `001_initial_schema.sql`.

Verify: Tables appear in Table Editor (communities, categories, profiles, businesses).

**Step 4: Commit**

```bash
git add supabase/
git commit -m "feat: add initial database schema with PostGIS, RLS functions, and indexes"
```

---

## Task 3: Supabase RLS Policies

**Files:**
- Create: `supabase/migrations/002_rls_policies.sql`

**Step 1: Write RLS policies**

Create `supabase/migrations/002_rls_policies.sql`:

```sql
-- Enable RLS on all tables
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

-- COMMUNITIES: public read for active
CREATE POLICY "communities_select_active" ON communities
  FOR SELECT USING (is_active = true);

-- CATEGORIES: public read
CREATE POLICY "categories_select_all" ON categories
  FOR SELECT USING (true);

CREATE POLICY "categories_admin_insert" ON categories
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "categories_admin_update" ON categories
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "categories_admin_delete" ON categories
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- PROFILES
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "profiles_select_admin" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles AS p
      WHERE p.id = auth.uid() AND p.role = 'admin' AND p.community_id = profiles.community_id
    )
  );

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "profiles_admin_update_role" ON profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles AS p
      WHERE p.id = auth.uid() AND p.role = 'admin' AND p.community_id = profiles.community_id
    )
  );

-- BUSINESSES: public read approved
CREATE POLICY "businesses_select_approved" ON businesses
  FOR SELECT USING (
    status = 'approved' AND is_active = true
    AND EXISTS (SELECT 1 FROM communities WHERE id = community_id AND is_active = true)
  );

-- Owner can see own businesses (any status)
CREATE POLICY "businesses_select_own" ON businesses
  FOR SELECT USING (owner_id = auth.uid());

-- Admin can see all in their community
CREATE POLICY "businesses_select_admin" ON businesses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin' AND community_id = businesses.community_id
    )
  );

-- Authenticated users can insert in their community
CREATE POLICY "businesses_insert_own" ON businesses
  FOR INSERT WITH CHECK (
    auth.uid() = owner_id
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND community_id = businesses.community_id
    )
  );

-- Owner can update own business
CREATE POLICY "businesses_update_own" ON businesses
  FOR UPDATE USING (owner_id = auth.uid());

-- Admin can update businesses in their community
CREATE POLICY "businesses_update_admin" ON businesses
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin' AND community_id = businesses.community_id
    )
  );

-- Admin can delete in their community
CREATE POLICY "businesses_delete_admin" ON businesses
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin' AND community_id = businesses.community_id
    )
  );
```

**Step 2: Run in Supabase SQL Editor**

Paste and execute. Verify: RLS enabled badges appear on all tables in Table Editor.

**Step 3: Commit**

```bash
git add supabase/
git commit -m "feat: add Row Level Security policies for multi-tenant isolation"
```

---

## Task 4: Supabase Storage Setup

**Files:**
- Create: `supabase/migrations/003_storage.sql`

**Step 1: Create storage bucket and policies**

Create `supabase/migrations/003_storage.sql`:

```sql
-- Create business-images bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('business-images', 'business-images', true);

-- Anyone can view images (public bucket)
CREATE POLICY "business_images_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'business-images');

-- Authenticated users can upload
CREATE POLICY "business_images_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'business-images' AND auth.role() = 'authenticated');

-- Users can update/delete their own uploads
CREATE POLICY "business_images_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'business-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "business_images_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'business-images' AND auth.uid()::text = (storage.foldername(name))[1]);
```

**Step 2: Run in Supabase SQL Editor**

**Step 3: Commit**

```bash
git add supabase/
git commit -m "feat: add Supabase Storage bucket and policies for business images"
```

---

## Task 5: Supabase Client Utilities

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/middleware.ts`
- Create: `lib/types/database.ts`

**Step 1: Generate database types**

Run:
```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/types/database.ts
```

Or manually create `lib/types/database.ts` with the type definitions matching our schema. This file will be regenerated as the schema evolves.

**Step 2: Create browser client**

Create `lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/types/database'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**Step 3: Create server client**

Create `lib/supabase/server.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/types/database'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll called from Server Component -- ignore
          }
        },
      },
    }
  )
}
```

**Step 4: Create middleware helper**

Create `lib/supabase/middleware.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  await supabase.auth.getUser()

  return supabaseResponse
}
```

**Step 5: Commit**

```bash
git add lib/
git commit -m "feat: add Supabase client utilities for browser, server, and middleware"
```

---

## Task 6: Middleware (Multi-tenant + Auth)

**Files:**
- Create: `middleware.ts`

**Step 1: Write middleware**

Create `middleware.ts` at project root:

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/auth', '/api', '/_next', '/favicon.ico', '/manifest.json', '/sw.js']
const PROTECTED_ROUTES = ['/dashboard', '/admin']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip public/static routes
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return updateSession(request)
  }

  // Auth guard for protected routes
  if (PROTECTED_ROUTES.some((route) => pathname.startsWith(route))) {
    const { supabase, response } = await createMiddlewareClient(request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      const loginUrl = new URL('/auth/login', request.url)
      loginUrl.searchParams.set('returnUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Admin guard
    if (pathname.startsWith('/admin')) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'admin') {
        return NextResponse.redirect(new URL('/', request.url))
      }
    }

    return response
  }

  // Community resolution: /[community]/*
  // Landing page (root /) passes through
  if (pathname === '/') {
    return updateSession(request)
  }

  // Extract community slug from first path segment
  const segments = pathname.split('/').filter(Boolean)
  const communitySlug = segments[0]

  if (communitySlug) {
    const { supabase, response } = await createMiddlewareClient(request)
    const { data: community } = await supabase
      .from('communities')
      .select('id, slug, is_active')
      .eq('slug', communitySlug)
      .eq('is_active', true)
      .single()

    if (!community) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    // Inject community ID in header for downstream consumption
    response.headers.set('x-community-id', community.id)
    response.headers.set('x-community-slug', community.slug)
    return response
  }

  return updateSession(request)
}

async function createMiddlewareClient(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  return { supabase, response }
}

async function updateSession(request: NextRequest) {
  const { response } = await createMiddlewareClient(request)
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

**Step 2: Commit**

```bash
git add middleware.ts
git commit -m "feat: add middleware for multi-tenant resolution and auth guards"
```

---

## Task 7: Zod Schemas & Shared Types

**Files:**
- Create: `lib/validations/business.ts`
- Create: `lib/validations/auth.ts`
- Create: `lib/types/index.ts`

**Step 1: Create business validation schemas**

Create `lib/validations/business.ts`:

```typescript
import { z } from 'zod'

const colombianPhone = z.string().regex(/^57[0-9]{10}$/, 'Numero colombiano invalido (57XXXXXXXXXX)')

export const createBusinessSchema = z.object({
  community_id: z.string().uuid(),
  category_id: z.string().uuid(),
  name: z.string().min(2, 'Minimo 2 caracteres').max(100),
  description: z.string().max(500).optional(),
  address: z.string().min(5).max(200),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  phone: z.string().optional(),
  whatsapp: colombianPhone,
  email: z.string().email().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
  hours: z.record(z.object({
    open: z.string(),
    close: z.string(),
  })).optional(),
  photos: z.array(z.string().url()).max(5).optional(),
})

export const updateBusinessSchema = createBusinessSchema.partial().omit({ community_id: true })

export type CreateBusinessInput = z.infer<typeof createBusinessSchema>
export type UpdateBusinessInput = z.infer<typeof updateBusinessSchema>
```

**Step 2: Create auth validation schemas**

Create `lib/validations/auth.ts`:

```typescript
import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(6, 'Minimo 6 caracteres'),
})

export const signupSchema = z.object({
  full_name: z.string().min(2, 'Minimo 2 caracteres'),
  email: z.string().email('Email invalido'),
  phone: z.string().optional(),
  password: z.string().min(6, 'Minimo 6 caracteres'),
  community_id: z.string().uuid(),
})

export const whatsappOtpSendSchema = z.object({
  phone: z.string().regex(/^57[0-9]{10}$/, 'Numero colombiano invalido'),
})

export const whatsappOtpVerifySchema = z.object({
  phone: z.string().regex(/^57[0-9]{10}$/),
  otp: z.string().length(6, 'Codigo de 6 digitos'),
  request_id: z.string(),
})
```

**Step 3: Create shared types**

Create `lib/types/index.ts`:

```typescript
export type CommunityData = {
  id: string
  name: string
  slug: string
  municipality: string
  department: string
  description: string | null
  logo_url: string | null
  primary_color: string
}

export type BusinessStatus = 'pending' | 'approved' | 'rejected'
export type UserRole = 'neighbor' | 'merchant' | 'admin'
```

**Step 4: Commit**

```bash
git add lib/
git commit -m "feat: add Zod validation schemas and shared types"
```

---

## Task 8: Root Layout, Providers & Landing Page

**Files:**
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Create: `components/providers/toast-provider.tsx`
- Create: `lib/utils.ts`

**Step 1: Create utility function**

Create `lib/utils.ts`:

```typescript
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function whatsappUrl(number: string, message?: string): string {
  const base = `https://wa.me/${number}`
  return message ? `${base}?text=${encodeURIComponent(message)}` : base
}
```

**Step 2: Create root layout**

Replace `app/layout.tsx`:

```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'BarrioRed - Tu barrio, conectado',
  description: 'Plataforma digital comunitaria para la visibilidad comercial y el fortalecimiento del tejido social.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={inter.className}>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
```

**Step 3: Create landing page**

Replace `app/page.tsx`:

```typescript
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { MapPin } from 'lucide-react'

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: communities } = await supabase
    .from('communities')
    .select('id, name, slug, municipality, description')
    .eq('is_active', true)
    .order('name')

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-blue-900 mb-4">BarrioRed</h1>
          <p className="text-xl text-gray-600">
            Tu barrio, conectado. Descubre los negocios de tu comunidad.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {communities?.map((community) => (
            <Link key={community.id} href={`/${community.slug}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-blue-600" />
                    <CardTitle>{community.name}</CardTitle>
                  </div>
                  <CardDescription>
                    {community.municipality} - {community.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>

        {(!communities || communities.length === 0) && (
          <p className="text-center text-gray-500 mt-8">
            Pronto estaremos en tu barrio. ¡Mantente atento!
          </p>
        )}
      </div>
    </main>
  )
}
```

**Step 4: Verify dev server runs**

Run: `npm run dev`
Expected: App loads at localhost:3000, shows landing page (empty communities list for now).

**Step 5: Commit**

```bash
git add app/ lib/ components/
git commit -m "feat: add root layout, landing page, and utility functions"
```

---

## Task 9: Community Layout & Homepage

**Files:**
- Create: `app/[community]/layout.tsx`
- Create: `app/[community]/page.tsx`
- Create: `components/community/community-provider.tsx`
- Create: `components/layout/top-bar.tsx`
- Create: `components/layout/bottom-nav.tsx`
- Create: `components/home/hero-banner.tsx`
- Create: `components/home/category-grid.tsx`
- Create: `components/home/featured-businesses.tsx`

**Step 1: Create CommunityProvider**

Create `components/community/community-provider.tsx`:

```typescript
'use client'

import { createContext, useContext } from 'react'
import type { CommunityData } from '@/lib/types'

const CommunityContext = createContext<CommunityData | null>(null)

export function CommunityProvider({
  community,
  children,
}: {
  community: CommunityData
  children: React.ReactNode
}) {
  return (
    <CommunityContext.Provider value={community}>
      {children}
    </CommunityContext.Provider>
  )
}

export function useCommunity() {
  const context = useContext(CommunityContext)
  if (!context) throw new Error('useCommunity must be used within CommunityProvider')
  return context
}
```

**Step 2: Create community layout**

Create `app/[community]/layout.tsx`:

```typescript
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CommunityProvider } from '@/components/community/community-provider'
import { TopBar } from '@/components/layout/top-bar'
import { BottomNav } from '@/components/layout/bottom-nav'

export async function generateMetadata({ params }: { params: Promise<{ community: string }> }) {
  const { community: slug } = await params
  const supabase = await createClient()
  const { data: community } = await supabase
    .from('communities')
    .select('name, municipality')
    .eq('slug', slug)
    .single()

  if (!community) return {}
  return {
    title: `${community.name} | BarrioRed`,
    description: `Directorio comercial y red vecinal de ${community.name}, ${community.municipality}`,
  }
}

export default async function CommunityLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ community: string }>
}) {
  const { community: slug } = await params
  const supabase = await createClient()
  const { data: community } = await supabase
    .from('communities')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (!community) notFound()

  return (
    <CommunityProvider community={community}>
      <div className="min-h-screen pb-16 md:pb-0">
        <TopBar />
        <main>{children}</main>
        <BottomNav />
      </div>
    </CommunityProvider>
  )
}
```

**Step 3: Create TopBar**

Create `components/layout/top-bar.tsx`:

```typescript
'use client'

import Link from 'next/link'
import { useCommunity } from '@/components/community/community-provider'
import { SearchBar } from '@/components/shared/search-bar'
import { Button } from '@/components/ui/button'
import { User } from 'lucide-react'

export function TopBar() {
  const community = useCommunity()

  return (
    <header className="sticky top-0 z-50 bg-white border-b shadow-sm">
      <div className="container mx-auto px-4 h-14 flex items-center gap-4">
        <Link href={`/${community.slug}`} className="font-bold text-lg shrink-0" style={{ color: community.primary_color }}>
          BarrioRed
        </Link>
        <div className="flex-1 hidden sm:block">
          <SearchBar />
        </div>
        <Link href="/auth/login">
          <Button variant="ghost" size="icon">
            <User className="h-5 w-5" />
          </Button>
        </Link>
      </div>
      <div className="sm:hidden px-4 pb-2">
        <SearchBar />
      </div>
    </header>
  )
}
```

**Step 4: Create SearchBar**

Create `components/shared/search-bar.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCommunity } from '@/components/community/community-provider'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

export function SearchBar() {
  const [query, setQuery] = useState('')
  const router = useRouter()
  const community = useCommunity()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/${community.slug}/directory?q=${encodeURIComponent(query.trim())}`)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      <Input
        placeholder="Buscar negocios..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="pl-9"
      />
    </form>
  )
}
```

**Step 5: Create BottomNav**

Create `components/layout/bottom-nav.tsx`:

```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCommunity } from '@/components/community/community-provider'
import { Home, Grid3X3, Map, PlusCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'Inicio', icon: Home, path: '' },
  { label: 'Directorio', icon: Grid3X3, path: '/directory' },
  { label: 'Mapa', icon: Map, path: '/map' },
  { label: 'Registrar', icon: PlusCircle, path: '/register' },
]

export function BottomNav() {
  const community = useCommunity()
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t md:hidden z-50">
      <div className="flex justify-around">
        {navItems.map((item) => {
          const href = `/${community.slug}${item.path}`
          const isActive = item.path === ''
            ? pathname === `/${community.slug}`
            : pathname.startsWith(href)

          return (
            <Link
              key={item.path}
              href={href}
              className={cn(
                'flex flex-col items-center py-2 px-3 text-xs',
                isActive ? 'text-blue-600' : 'text-gray-500'
              )}
            >
              <item.icon className="h-5 w-5 mb-1" />
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
```

**Step 6: Create homepage components**

Create `components/home/hero-banner.tsx`:

```typescript
import { SearchBar } from '@/components/shared/search-bar'
import type { CommunityData } from '@/lib/types'

export function HeroBanner({ community, businessCount }: { community: CommunityData; businessCount: number }) {
  return (
    <section className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-12 px-4">
      <div className="container mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-bold mb-2">{community.name}</h1>
        <p className="text-blue-100 mb-6">
          {businessCount} negocios registrados en tu comunidad
        </p>
        <div className="max-w-md mx-auto">
          <SearchBar />
        </div>
      </div>
    </section>
  )
}
```

Create `components/home/category-grid.tsx`:

```typescript
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import * as Icons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type Category = { id: string; name: string; slug: string; icon: string | null }

export function CategoryGrid({ categories, communitySlug }: { categories: Category[]; communitySlug: string }) {
  return (
    <section className="py-8 px-4">
      <div className="container mx-auto max-w-4xl">
        <h2 className="text-xl font-semibold mb-4">Categorias</h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {categories.map((cat) => {
            const IconComponent = (cat.icon && (Icons as Record<string, LucideIcon>)[cat.icon]) || Icons.Store
            return (
              <Link key={cat.id} href={`/${communitySlug}/directory/${cat.slug}`}>
                <Card className="p-4 text-center hover:shadow-md transition-shadow">
                  <IconComponent className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                  <p className="text-xs font-medium truncate">{cat.name}</p>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
```

Create `components/home/featured-businesses.tsx`:

```typescript
import { BusinessCard } from '@/components/directory/business-card'

type Business = {
  id: string; name: string; slug: string; description: string | null
  photos: string[] | null; whatsapp: string | null; address: string | null
  categories: { name: string; slug: string } | null
}

export function FeaturedBusinesses({ businesses, communitySlug }: { businesses: Business[]; communitySlug: string }) {
  if (businesses.length === 0) return null
  return (
    <section className="py-8 px-4">
      <div className="container mx-auto max-w-4xl">
        <h2 className="text-xl font-semibold mb-4">Negocios recientes</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {businesses.map((biz) => (
            <BusinessCard key={biz.id} business={biz} communitySlug={communitySlug} />
          ))}
        </div>
      </div>
    </section>
  )
}
```

**Step 7: Create community homepage**

Create `app/[community]/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { HeroBanner } from '@/components/home/hero-banner'
import { CategoryGrid } from '@/components/home/category-grid'
import { FeaturedBusinesses } from '@/components/home/featured-businesses'

export default async function CommunityHomePage({ params }: { params: Promise<{ community: string }> }) {
  const { community: slug } = await params
  const supabase = await createClient()

  const { data: community } = await supabase
    .from('communities')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!community) return null

  const [categoriesRes, businessCountRes, recentRes] = await Promise.all([
    supabase.from('categories').select('id, name, slug, icon').order('sort_order'),
    supabase.from('businesses').select('id', { count: 'exact', head: true })
      .eq('community_id', community.id).eq('status', 'approved'),
    supabase.from('businesses').select('id, name, slug, description, photos, whatsapp, address, categories(name, slug)')
      .eq('community_id', community.id).eq('status', 'approved')
      .order('created_at', { ascending: false }).limit(6),
  ])

  return (
    <>
      <HeroBanner community={community} businessCount={businessCountRes.count ?? 0} />
      <CategoryGrid categories={categoriesRes.data ?? []} communitySlug={slug} />
      <FeaturedBusinesses businesses={recentRes.data ?? []} communitySlug={slug} />
    </>
  )
}
```

**Step 8: Commit**

```bash
git add app/ components/ lib/
git commit -m "feat: add community layout, homepage with hero, categories grid, and featured businesses"
```

---

## Task 10: BusinessCard Component & Directory Page

**Files:**
- Create: `components/directory/business-card.tsx`
- Create: `app/[community]/directory/page.tsx`
- Create: `app/[community]/directory/[category]/page.tsx`

**Step 1: Create BusinessCard**

Create `components/directory/business-card.tsx`:

```typescript
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, MessageCircle } from 'lucide-react'
import { whatsappUrl } from '@/lib/utils'

type BusinessCardProps = {
  business: {
    id: string; name: string; slug: string; description: string | null
    photos: string[] | null; whatsapp: string | null; address: string | null
    categories: { name: string; slug: string } | null
  }
  communitySlug: string
}

export function BusinessCard({ business, communitySlug }: BusinessCardProps) {
  const photo = business.photos?.[0]

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <Link href={`/${communitySlug}/business/${business.slug}`}>
        <div className="aspect-video bg-gray-100 relative">
          {photo ? (
            <Image src={photo} alt={business.name} fill className="object-cover" sizes="(max-width: 640px) 100vw, 33vw" />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">Sin foto</div>
          )}
        </div>
      </Link>
      <CardContent className="p-4">
        <Link href={`/${communitySlug}/business/${business.slug}`}>
          <h3 className="font-semibold truncate">{business.name}</h3>
        </Link>
        {business.categories && (
          <Badge variant="secondary" className="mt-1 text-xs">{business.categories.name}</Badge>
        )}
        {business.address && (
          <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
            <MapPin className="h-3 w-3" /> {business.address}
          </p>
        )}
        {business.description && (
          <p className="text-sm text-gray-600 mt-2 line-clamp-2">{business.description}</p>
        )}
        {business.whatsapp && (
          <a href={whatsappUrl(business.whatsapp, `Hola, te encontre en BarrioRed`)} target="_blank" rel="noopener noreferrer">
            <Button size="sm" className="mt-3 w-full bg-green-600 hover:bg-green-700">
              <MessageCircle className="h-4 w-4 mr-2" /> WhatsApp
            </Button>
          </a>
        )}
      </CardContent>
    </Card>
  )
}
```

**Step 2: Create directory page**

Create `app/[community]/directory/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { BusinessCard } from '@/components/directory/business-card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

export async function generateMetadata({ params }: { params: Promise<{ community: string }> }) {
  const { community: slug } = await params
  return { title: `Directorio | BarrioRed` }
}

export default async function DirectoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ community: string }>
  searchParams: Promise<{ q?: string }>
}) {
  const { community: slug } = await params
  const { q } = await searchParams
  const supabase = await createClient()

  const { data: community } = await supabase
    .from('communities').select('id').eq('slug', slug).single()

  if (!community) return null

  const { data: categories } = await supabase
    .from('categories').select('id, name, slug').order('sort_order')

  let businessesQuery = supabase
    .from('businesses')
    .select('id, name, slug, description, photos, whatsapp, address, categories(name, slug)')
    .eq('community_id', community.id)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(20)

  // If search query, use RPC
  let businesses
  if (q) {
    const { data } = await supabase.rpc('search_businesses', { query: q, comm_id: community.id })
    businesses = data ?? []
  } else {
    const { data } = await businessesQuery
    businesses = data ?? []
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6">
      <h1 className="text-2xl font-bold mb-4">
        {q ? `Resultados para "${q}"` : 'Directorio'}
      </h1>

      <div className="flex flex-wrap gap-2 mb-6">
        <Link href={`/${slug}/directory`}>
          <Badge variant={!q ? 'default' : 'secondary'}>Todos</Badge>
        </Link>
        {categories?.map((cat) => (
          <Link key={cat.id} href={`/${slug}/directory/${cat.slug}`}>
            <Badge variant="secondary">{cat.name}</Badge>
          </Link>
        ))}
      </div>

      {businesses.length === 0 ? (
        <p className="text-gray-500 text-center py-12">No se encontraron negocios.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {businesses.map((biz: any) => (
            <BusinessCard key={biz.id} business={biz} communitySlug={slug} />
          ))}
        </div>
      )}
    </div>
  )
}
```

**Step 3: Create category filter page**

Create `app/[community]/directory/[category]/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { BusinessCard } from '@/components/directory/business-card'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export async function generateMetadata({ params }: { params: Promise<{ community: string; category: string }> }) {
  const { category: catSlug } = await params
  const supabase = await createClient()
  const { data: cat } = await supabase.from('categories').select('name').eq('slug', catSlug).single()
  return { title: cat ? `${cat.name} | BarrioRed` : 'Categoria' }
}

export default async function CategoryPage({ params }: { params: Promise<{ community: string; category: string }> }) {
  const { community: slug, category: catSlug } = await params
  const supabase = await createClient()

  const [communityRes, categoryRes] = await Promise.all([
    supabase.from('communities').select('id').eq('slug', slug).single(),
    supabase.from('categories').select('id, name').eq('slug', catSlug).single(),
  ])

  if (!communityRes.data || !categoryRes.data) notFound()

  const { data: businesses } = await supabase
    .from('businesses')
    .select('id, name, slug, description, photos, whatsapp, address, categories(name, slug)')
    .eq('community_id', communityRes.data.id)
    .eq('category_id', categoryRes.data.id)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6">
      <Link href={`/${slug}/directory`}>
        <Button variant="ghost" size="sm" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> Directorio
        </Button>
      </Link>
      <h1 className="text-2xl font-bold mb-6">{categoryRes.data.name}</h1>

      {(!businesses || businesses.length === 0) ? (
        <p className="text-gray-500 text-center py-12">No hay negocios en esta categoria.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {businesses.map((biz: any) => (
            <BusinessCard key={biz.id} business={biz} communitySlug={slug} />
          ))}
        </div>
      )}
    </div>
  )
}
```

**Step 4: Commit**

```bash
git add app/ components/
git commit -m "feat: add directory pages with search, category filtering, and BusinessCard component"
```

---

## Task 11: Business Profile Page

**Files:**
- Create: `app/[community]/business/[slug]/page.tsx`
- Create: `components/business/business-header.tsx`
- Create: `components/business/business-info.tsx`
- Create: `components/business/photo-gallery.tsx`
- Create: `components/business/location-map.tsx`
- Create: `components/shared/whatsapp-button.tsx`

**Step 1: Create WhatsApp button**

Create `components/shared/whatsapp-button.tsx`:

```typescript
'use client'

import { Button } from '@/components/ui/button'
import { MessageCircle } from 'lucide-react'
import { whatsappUrl } from '@/lib/utils'

export function WhatsAppButton({ number, message }: { number: string; message?: string }) {
  return (
    <a href={whatsappUrl(number, message)} target="_blank" rel="noopener noreferrer" className="fixed bottom-20 right-4 md:bottom-6 z-40">
      <Button size="lg" className="bg-green-600 hover:bg-green-700 rounded-full shadow-lg h-14 px-6">
        <MessageCircle className="h-6 w-6 mr-2" /> WhatsApp
      </Button>
    </a>
  )
}
```

**Step 2: Create business header**

Create `components/business/business-header.tsx`:

```typescript
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { CheckCircle } from 'lucide-react'

type Props = {
  name: string
  categoryName: string
  photo: string | null
  isVerified: boolean
}

export function BusinessHeader({ name, categoryName, photo, isVerified }: Props) {
  return (
    <div>
      <div className="aspect-video bg-gray-100 relative w-full">
        {photo ? (
          <Image src={photo} alt={name} fill className="object-cover" sizes="100vw" priority />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 text-lg">Sin foto</div>
        )}
      </div>
      <div className="px-4 pt-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">{name}</h1>
          {isVerified && <CheckCircle className="h-5 w-5 text-blue-600" />}
        </div>
        <Badge variant="secondary" className="mt-1">{categoryName}</Badge>
      </div>
    </div>
  )
}
```

**Step 3: Create business info**

Create `components/business/business-info.tsx`:

```typescript
import { MapPin, Clock, Phone, Globe } from 'lucide-react'
import { Separator } from '@/components/ui/separator'

type Props = {
  address: string | null
  phone: string | null
  email: string | null
  website: string | null
  hours: Record<string, { open: string; close: string }> | null
  description: string | null
}

const DAY_NAMES: Record<string, string> = {
  mon: 'Lunes', tue: 'Martes', wed: 'Miercoles', thu: 'Jueves',
  fri: 'Viernes', sat: 'Sabado', sun: 'Domingo',
}

export function BusinessInfo({ address, phone, email, website, hours, description }: Props) {
  return (
    <div className="px-4 py-4 space-y-4">
      {description && <p className="text-gray-700">{description}</p>}
      <Separator />

      <div className="space-y-3">
        {address && (
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
            <span>{address}</span>
          </div>
        )}
        {phone && (
          <div className="flex items-center gap-3">
            <Phone className="h-5 w-5 text-gray-400" />
            <a href={`tel:${phone}`} className="text-blue-600">{phone}</a>
          </div>
        )}
        {website && (
          <div className="flex items-center gap-3">
            <Globe className="h-5 w-5 text-gray-400" />
            <a href={website} target="_blank" rel="noopener noreferrer" className="text-blue-600 truncate">{website}</a>
          </div>
        )}
      </div>

      {hours && Object.keys(hours).length > 0 && (
        <>
          <Separator />
          <div>
            <h3 className="font-semibold flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-gray-400" /> Horarios
            </h3>
            <div className="grid grid-cols-2 gap-1 text-sm">
              {Object.entries(hours).map(([day, h]) => (
                <div key={day} className="flex justify-between">
                  <span className="text-gray-500">{DAY_NAMES[day] ?? day}</span>
                  <span>{h.open} - {h.close}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
```

**Step 4: Create photo gallery**

Create `components/business/photo-gallery.tsx`:

```typescript
'use client'

import { useState } from 'react'
import Image from 'next/image'

export function PhotoGallery({ photos }: { photos: string[] }) {
  const [selected, setSelected] = useState(0)
  if (photos.length <= 1) return null

  return (
    <div className="px-4 py-2">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {photos.map((photo, i) => (
          <button key={i} onClick={() => setSelected(i)} className={`shrink-0 rounded-md overflow-hidden border-2 ${i === selected ? 'border-blue-600' : 'border-transparent'}`}>
            <Image src={photo} alt={`Foto ${i + 1}`} width={80} height={60} className="object-cover w-20 h-15" />
          </button>
        ))}
      </div>
    </div>
  )
}
```

**Step 5: Create location map (lazy loaded)**

Create `components/business/location-map.tsx`:

```typescript
'use client'

import dynamic from 'next/dynamic'

const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
)
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
)
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
)

export function LocationMap({ lat, lng, name }: { lat: number; lng: number; name: string }) {
  return (
    <div className="px-4 py-4">
      <h3 className="font-semibold mb-2">Ubicacion</h3>
      <div className="h-64 rounded-lg overflow-hidden">
        <MapContainer center={[lat, lng]} zoom={16} className="h-full w-full" scrollWheelZoom={false}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[lat, lng]} />
        </MapContainer>
      </div>
    </div>
  )
}
```

Note: Install leaflet deps:
```bash
npm install leaflet react-leaflet
npm install -D @types/leaflet
```

Also add to `app/layout.tsx` or a CSS import:
```css
@import 'leaflet/dist/leaflet.css';
```

**Step 6: Create business profile page**

Create `app/[community]/business/[slug]/page.tsx`:

```typescript
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BusinessHeader } from '@/components/business/business-header'
import { BusinessInfo } from '@/components/business/business-info'
import { PhotoGallery } from '@/components/business/photo-gallery'
import { LocationMap } from '@/components/business/location-map'
import { WhatsAppButton } from '@/components/shared/whatsapp-button'

export async function generateMetadata({ params }: { params: Promise<{ community: string; slug: string }> }) {
  const { community: commSlug, slug } = await params
  const supabase = await createClient()
  const { data: business } = await supabase
    .from('businesses')
    .select('name, description, categories(name)')
    .eq('slug', slug)
    .single()

  if (!business) return {}
  return {
    title: `${business.name} | BarrioRed`,
    description: business.description || `${business.name} en BarrioRed`,
  }
}

export default async function BusinessProfilePage({ params }: { params: Promise<{ community: string; slug: string }> }) {
  const { community: commSlug, slug } = await params
  const supabase = await createClient()

  const { data: community } = await supabase
    .from('communities').select('id').eq('slug', commSlug).single()

  if (!community) notFound()

  const { data: business } = await supabase
    .from('businesses')
    .select('*, categories(name, slug)')
    .eq('community_id', community.id)
    .eq('slug', slug)
    .eq('status', 'approved')
    .single()

  if (!business) notFound()

  // Extract lat/lng from PostGIS geography
  // Supabase returns location as GeoJSON or null
  const location = business.location as any
  const lat = location?.coordinates?.[1]
  const lng = location?.coordinates?.[0]

  return (
    <div className="max-w-2xl mx-auto pb-24">
      <BusinessHeader
        name={business.name}
        categoryName={business.categories?.name ?? ''}
        photo={business.photos?.[0] ?? null}
        isVerified={business.is_verified}
      />
      {business.photos && business.photos.length > 1 && (
        <PhotoGallery photos={business.photos} />
      )}
      <BusinessInfo
        address={business.address}
        phone={business.phone}
        email={business.email}
        website={business.website}
        hours={business.hours as any}
        description={business.description}
      />
      {lat && lng && <LocationMap lat={lat} lng={lng} name={business.name} />}
      {business.whatsapp && (
        <WhatsAppButton number={business.whatsapp} message={`Hola, te encontre en BarrioRed`} />
      )}
    </div>
  )
}
```

**Step 7: Commit**

```bash
git add app/ components/
git commit -m "feat: add business profile page with photo gallery, info, map, and WhatsApp CTA"
```

---

## Task 12: Auth Pages (Login, Signup, Callback)

**Files:**
- Create: `app/auth/login/page.tsx`
- Create: `app/auth/signup/page.tsx`
- Create: `app/auth/callback/route.ts`
- Create: `components/auth/login-form.tsx`
- Create: `components/auth/signup-form.tsx`

**Step 1: Create login form**

Create `components/auth/login-form.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnUrl = searchParams.get('returnUrl') || '/'
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      toast.error(error.message)
    } else {
      router.push(returnUrl)
      router.refresh()
    }
  }

  return (
    <Tabs defaultValue="email" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="email">Email</TabsTrigger>
        <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
      </TabsList>

      <TabsContent value="email">
        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="password">Contrasena</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </Button>
        </form>
      </TabsContent>

      <TabsContent value="whatsapp">
        <WhatsAppOTPLogin returnUrl={returnUrl} />
      </TabsContent>
    </Tabs>
  )
}

function WhatsAppOTPLogin({ returnUrl }: { returnUrl: string }) {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [requestId, setRequestId] = useState('')
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [loading, setLoading] = useState(false)

  async function sendOTP(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/auth/whatsapp-otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    })
    const data = await res.json()
    setLoading(false)
    if (data.error) {
      toast.error(data.error)
    } else {
      setRequestId(data.request_id)
      setStep('otp')
      toast.success('Codigo enviado por WhatsApp')
    }
  }

  async function verifyOTP(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/auth/whatsapp-otp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp, request_id: requestId }),
    })
    const data = await res.json()
    setLoading(false)
    if (data.error) {
      toast.error(data.error)
    } else {
      router.push(returnUrl)
      router.refresh()
    }
  }

  if (step === 'phone') {
    return (
      <form onSubmit={sendOTP} className="space-y-4">
        <div>
          <Label htmlFor="phone">Numero WhatsApp</Label>
          <Input id="phone" placeholder="573001234567" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          <p className="text-xs text-gray-500 mt-1">Formato: 57 + 10 digitos</p>
        </div>
        <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={loading}>
          {loading ? 'Enviando...' : 'Enviar codigo por WhatsApp'}
        </Button>
      </form>
    )
  }

  return (
    <form onSubmit={verifyOTP} className="space-y-4">
      <div>
        <Label htmlFor="otp">Codigo de verificacion</Label>
        <Input id="otp" placeholder="123456" value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6} required />
        <p className="text-xs text-gray-500 mt-1">Ingresa el codigo de 6 digitos enviado a tu WhatsApp</p>
      </div>
      <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={loading}>
        {loading ? 'Verificando...' : 'Verificar'}
      </Button>
    </form>
  )
}
```

**Step 2: Create login page**

Create `app/auth/login/page.tsx`:

```typescript
import Link from 'next/link'
import { LoginForm } from '@/components/auth/login-form'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export const metadata = { title: 'Ingresar | BarrioRed' }

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-blue-900">BarrioRed</CardTitle>
          <CardDescription>Ingresa a tu cuenta</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
          <p className="text-center text-sm text-gray-500 mt-4">
            No tienes cuenta? <Link href="/auth/signup" className="text-blue-600 hover:underline">Registrate</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
```

**Step 3: Create signup form and page**

Create `components/auth/signup-form.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

export function SignupForm() {
  const router = useRouter()
  const supabase = createClient()

  const [communities, setCommunities] = useState<{ id: string; name: string }[]>([])
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '', community_id: '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.from('communities').select('id, name').eq('is_active', true).then(({ data }) => {
      if (data) setCommunities(data)
    })
  }, [supabase])

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.full_name, phone: form.phone, community_id: form.community_id },
      },
    })
    setLoading(false)
    if (error) {
      toast.error(error.message)
    } else {
      // Update profile with community_id (trigger only sets full_name)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('profiles').update({
          community_id: form.community_id,
          phone: form.phone,
          role: 'merchant',
        }).eq('id', user.id)
      }
      toast.success('Cuenta creada exitosamente')
      router.push('/')
      router.refresh()
    }
  }

  return (
    <form onSubmit={handleSignup} className="space-y-4">
      <div>
        <Label htmlFor="full_name">Nombre completo</Label>
        <Input id="full_name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
      </div>
      <div>
        <Label htmlFor="signup_email">Email</Label>
        <Input id="signup_email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
      </div>
      <div>
        <Label htmlFor="signup_phone">Telefono / WhatsApp</Label>
        <Input id="signup_phone" placeholder="573001234567" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      </div>
      <div>
        <Label htmlFor="community">Comunidad</Label>
        <Select value={form.community_id} onValueChange={(v) => setForm({ ...form, community_id: v })}>
          <SelectTrigger><SelectValue placeholder="Selecciona tu barrio" /></SelectTrigger>
          <SelectContent>
            {communities.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="signup_password">Contrasena</Label>
        <Input id="signup_password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Creando cuenta...' : 'Crear cuenta'}
      </Button>
    </form>
  )
}
```

Create `app/auth/signup/page.tsx`:

```typescript
import Link from 'next/link'
import { SignupForm } from '@/components/auth/signup-form'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export const metadata = { title: 'Registrarse | BarrioRed' }

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-blue-900">BarrioRed</CardTitle>
          <CardDescription>Crea tu cuenta</CardDescription>
        </CardHeader>
        <CardContent>
          <SignupForm />
          <p className="text-center text-sm text-gray-500 mt-4">
            Ya tienes cuenta? <Link href="/auth/login" className="text-blue-600 hover:underline">Ingresar</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
```

**Step 4: Create auth callback**

Create `app/auth/callback/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`)
}
```

**Step 5: Commit**

```bash
git add app/ components/
git commit -m "feat: add auth pages with email/password login, signup, WhatsApp OTP, and callback"
```

---

## Task 13: API Routes (Businesses, Upload, OTP)

**Files:**
- Create: `app/api/businesses/route.ts`
- Create: `app/api/businesses/[id]/route.ts`
- Create: `app/api/businesses/[id]/approve/route.ts`
- Create: `app/api/businesses/[id]/reject/route.ts`
- Create: `app/api/upload/route.ts`
- Create: `app/api/auth/whatsapp-otp/send/route.ts`
- Create: `app/api/auth/whatsapp-otp/verify/route.ts`

**Step 1: Create business CRUD API**

Create `app/api/businesses/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createBusinessSchema } from '@/lib/validations/business'
import { slugify } from '@/lib/utils'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = createBusinessSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const { latitude, longitude, ...rest } = parsed.data
  const slug = slugify(rest.name)

  const { data, error } = await supabase
    .from('businesses')
    .insert({
      ...rest,
      slug,
      owner_id: user.id,
      location: `POINT(${longitude} ${latitude})`,
      status: 'pending',
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Update user role to merchant if not already
  await supabase.from('profiles').update({ role: 'merchant' }).eq('id', user.id)

  return NextResponse.json(data, { status: 201 })
}
```

Create `app/api/businesses/[id]/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateBusinessSchema } from '@/lib/validations/business'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = updateBusinessSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const updateData: Record<string, unknown> = { ...parsed.data }
  if (parsed.data.latitude && parsed.data.longitude) {
    updateData.location = `POINT(${parsed.data.longitude} ${parsed.data.latitude})`
    delete updateData.latitude
    delete updateData.longitude
  }

  const { data, error } = await supabase
    .from('businesses')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
```

**Step 2: Create approve/reject API routes**

Create `app/api/businesses/[id]/approve/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { data, error } = await supabase
    .from('businesses')
    .update({ status: 'approved', is_verified: true })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
```

Create `app/api/businesses/[id]/reject/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { data, error } = await supabase
    .from('businesses')
    .update({ status: 'rejected' })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
```

**Step 3: Create upload API route**

Create `app/api/upload/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { v4 as uuid } from 'uuid'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  // Validate file type and size
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Solo se permiten imagenes (JPG, PNG, WebP)' }, { status: 400 })
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'Imagen muy grande (max 5MB)' }, { status: 400 })
  }

  const ext = file.name.split('.').pop()
  const path = `${user.id}/${uuid()}.${ext}`

  const { data, error } = await supabase.storage
    .from('business-images')
    .upload(path, file)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage
    .from('business-images')
    .getPublicUrl(data.path)

  return NextResponse.json({ url: publicUrl })
}
```

Note: Install uuid: `npm install uuid && npm install -D @types/uuid`

**Step 4: Create WhatsApp OTP API routes**

Create `app/api/auth/whatsapp-otp/send/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { whatsappOtpSendSchema } from '@/lib/validations/auth'

export async function POST(request: Request) {
  const body = await request.json()
  const parsed = whatsappOtpSendSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Numero invalido' }, { status: 400 })
  }

  const { phone } = parsed.data

  // Call GetOTP.co API
  const res = await fetch('https://otp.dev/api/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GETOTP_API_KEY}`,
    },
    body: JSON.stringify({
      phone,
      channel: 'whatsapp',
      expiry: 300, // 5 minutes
      length: 6,
    }),
  })

  const data = await res.json()
  if (!res.ok) {
    return NextResponse.json({ error: 'Error enviando OTP' }, { status: 500 })
  }

  return NextResponse.json({ request_id: data.request_id })
}
```

Create `app/api/auth/whatsapp-otp/verify/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { whatsappOtpVerifySchema } from '@/lib/validations/auth'

export async function POST(request: Request) {
  const body = await request.json()
  const parsed = whatsappOtpVerifySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos invalidos' }, { status: 400 })
  }

  const { phone, otp, request_id } = parsed.data

  // Verify with GetOTP.co
  const verifyRes = await fetch('https://otp.dev/api/verify/check', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GETOTP_API_KEY}`,
    },
    body: JSON.stringify({ request_id, otp }),
  })

  const verifyData = await verifyRes.json()
  if (!verifyRes.ok || !verifyData.valid) {
    return NextResponse.json({ error: 'Codigo invalido o expirado' }, { status: 400 })
  }

  // Use service role to manage users
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Check if user exists with this phone
  const { data: existingProfile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('phone', phone)
    .single()

  let userId: string

  if (existingProfile) {
    userId = existingProfile.id
  } else {
    // Create new user with phone-based email placeholder
    const email = `${phone}@whatsapp.barriored.co`
    const { data: newUser, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      phone,
      email_confirm: true,
      user_metadata: { full_name: '', phone },
    })
    if (error || !newUser.user) {
      return NextResponse.json({ error: 'Error creando usuario' }, { status: 500 })
    }
    userId = newUser.user.id
    await supabaseAdmin.from('profiles').update({ phone }).eq('id', userId)
  }

  // Generate a magic link / session for the user
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: `${phone}@whatsapp.barriored.co`,
  })

  if (linkError) {
    return NextResponse.json({ error: 'Error generando sesion' }, { status: 500 })
  }

  // Return the token hashed properties for client-side session exchange
  return NextResponse.json({
    access_token: linkData.properties?.access_token,
    refresh_token: linkData.properties?.refresh_token,
  })
}
```

**Step 5: Commit**

```bash
git add app/api/
git commit -m "feat: add API routes for business CRUD, image upload, approve/reject, and WhatsApp OTP"
```

---

## Task 14: Business Registration Form

**Files:**
- Create: `app/[community]/register/page.tsx`
- Create: `components/registration/register-business-form.tsx`
- Create: `components/registration/step-basic-info.tsx`
- Create: `components/registration/step-contact.tsx`
- Create: `components/registration/step-location.tsx`
- Create: `components/registration/step-photos.tsx`
- Create: `components/registration/step-confirmation.tsx`

**Step 1: Create multi-step form container**

Create `components/registration/register-business-form.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCommunity } from '@/components/community/community-provider'
import { StepBasicInfo } from './step-basic-info'
import { StepContact } from './step-contact'
import { StepLocation } from './step-location'
import { StepPhotos } from './step-photos'
import { StepConfirmation } from './step-confirmation'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

type FormData = {
  name: string; category_id: string; description: string
  phone: string; whatsapp: string; email: string; website: string
  address: string; latitude: number; longitude: number
  hours: Record<string, { open: string; close: string }>
  photos: string[]
}

const INITIAL: FormData = {
  name: '', category_id: '', description: '',
  phone: '', whatsapp: '', email: '', website: '',
  address: '', latitude: 4.8133, longitude: -75.6961,
  hours: {}, photos: [],
}

const STEPS = ['Informacion', 'Contacto', 'Ubicacion', 'Fotos', 'Confirmar']

export function RegisterBusinessForm() {
  const community = useCommunity()
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormData>(INITIAL)
  const [loading, setLoading] = useState(false)

  function update(partial: Partial<FormData>) {
    setForm((prev) => ({ ...prev, ...partial }))
  }

  async function handleSubmit() {
    setLoading(true)
    const res = await fetch('/api/businesses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, community_id: community.id }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      toast.error(typeof data.error === 'string' ? data.error : 'Error al registrar')
      return
    }

    toast.success('Negocio registrado. Sera revisado por un administrador.')
    router.push(`/${community.slug}`)
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Progress */}
      <div className="flex gap-1 mb-6">
        {STEPS.map((s, i) => (
          <div key={s} className={`flex-1 h-1 rounded ${i <= step ? 'bg-blue-600' : 'bg-gray-200'}`} />
        ))}
      </div>
      <p className="text-sm text-gray-500 mb-4">Paso {step + 1} de {STEPS.length}: {STEPS[step]}</p>

      {step === 0 && <StepBasicInfo form={form} update={update} />}
      {step === 1 && <StepContact form={form} update={update} />}
      {step === 2 && <StepLocation form={form} update={update} />}
      {step === 3 && <StepPhotos form={form} update={update} />}
      {step === 4 && <StepConfirmation form={form} />}

      <div className="flex gap-3 mt-6">
        {step > 0 && (
          <Button variant="outline" onClick={() => setStep(step - 1)}>Atras</Button>
        )}
        {step < STEPS.length - 1 ? (
          <Button className="flex-1" onClick={() => setStep(step + 1)}>Siguiente</Button>
        ) : (
          <Button className="flex-1" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Registrando...' : 'Registrar negocio'}
          </Button>
        )}
      </div>
    </div>
  )
}
```

**Step 2: Create each step component**

Create `components/registration/step-basic-info.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type Props = { form: any; update: (v: any) => void }

export function StepBasicInfo({ form, update }: Props) {
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const supabase = createClient()

  useEffect(() => {
    supabase.from('categories').select('id, name').order('sort_order').then(({ data }) => {
      if (data) setCategories(data)
    })
  }, [supabase])

  return (
    <div className="space-y-4">
      <div>
        <Label>Nombre del negocio</Label>
        <Input value={form.name} onChange={(e) => update({ name: e.target.value })} placeholder="Ej: Tienda Don Pedro" />
      </div>
      <div>
        <Label>Categoria</Label>
        <Select value={form.category_id} onValueChange={(v) => update({ category_id: v })}>
          <SelectTrigger><SelectValue placeholder="Selecciona una categoria" /></SelectTrigger>
          <SelectContent>
            {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Descripcion</Label>
        <Textarea value={form.description} onChange={(e) => update({ description: e.target.value })} placeholder="Que ofrece tu negocio?" rows={3} />
      </div>
    </div>
  )
}
```

Create `components/registration/step-contact.tsx`:

```typescript
'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Props = { form: any; update: (v: any) => void }

export function StepContact({ form, update }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <Label>WhatsApp (obligatorio)</Label>
        <Input value={form.whatsapp} onChange={(e) => update({ whatsapp: e.target.value })} placeholder="573001234567" />
        <p className="text-xs text-gray-500 mt-1">Formato: 57 + 10 digitos. Este sera tu boton de contacto.</p>
      </div>
      <div>
        <Label>Telefono fijo</Label>
        <Input value={form.phone} onChange={(e) => update({ phone: e.target.value })} placeholder="6061234567" />
      </div>
      <div>
        <Label>Email (opcional)</Label>
        <Input type="email" value={form.email} onChange={(e) => update({ email: e.target.value })} />
      </div>
      <div>
        <Label>Sitio web (opcional)</Label>
        <Input value={form.website} onChange={(e) => update({ website: e.target.value })} placeholder="https://" />
      </div>
    </div>
  )
}
```

Create `components/registration/step-location.tsx`:

```typescript
'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import dynamic from 'next/dynamic'

const LocationPicker = dynamic(() => import('./location-picker'), { ssr: false })

type Props = { form: any; update: (v: any) => void }

export function StepLocation({ form, update }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Direccion</Label>
        <Input value={form.address} onChange={(e) => update({ address: e.target.value })} placeholder="Calle 1 #2-3, Parque Industrial" />
      </div>
      <div>
        <Label>Ubicacion en mapa</Label>
        <p className="text-xs text-gray-500 mb-2">Arrastra el marcador a la ubicacion de tu negocio</p>
        <LocationPicker lat={form.latitude} lng={form.longitude} onChange={(lat: number, lng: number) => update({ latitude: lat, longitude: lng })} />
      </div>
    </div>
  )
}
```

Create `components/registration/location-picker.tsx`:

```typescript
'use client'

import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import { useState } from 'react'
import 'leaflet/dist/leaflet.css'

function DraggableMarker({ lat, lng, onChange }: { lat: number; lng: number; onChange: (lat: number, lng: number) => void }) {
  const [position, setPosition] = useState<[number, number]>([lat, lng])

  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng])
      onChange(e.latlng.lat, e.latlng.lng)
    },
  })

  return <Marker position={position} />
}

export default function LocationPicker({ lat, lng, onChange }: { lat: number; lng: number; onChange: (lat: number, lng: number) => void }) {
  return (
    <div className="h-64 rounded-lg overflow-hidden">
      <MapContainer center={[lat, lng]} zoom={15} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <DraggableMarker lat={lat} lng={lng} onChange={onChange} />
      </MapContainer>
    </div>
  )
}
```

Create `components/registration/step-photos.tsx`:

```typescript
'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { X, Upload } from 'lucide-react'
import { toast } from 'sonner'

type Props = { form: any; update: (v: any) => void }

export function StepPhotos({ form, update }: Props) {
  const [uploading, setUploading] = useState(false)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (form.photos.length >= 5) { toast.error('Maximo 5 fotos'); return }

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    const res = await fetch('/api/upload', { method: 'POST', body: formData })
    const data = await res.json()
    setUploading(false)

    if (!res.ok) { toast.error(data.error); return }
    update({ photos: [...form.photos, data.url] })
  }

  function removePhoto(index: number) {
    update({ photos: form.photos.filter((_: string, i: number) => i !== index) })
  }

  return (
    <div className="space-y-4">
      <Label>Fotos del negocio (max 5)</Label>
      <div className="grid grid-cols-3 gap-2">
        {form.photos.map((url: string, i: number) => (
          <div key={i} className="relative aspect-square rounded-lg overflow-hidden">
            <Image src={url} alt={`Foto ${i + 1}`} fill className="object-cover" />
            <button onClick={() => removePhoto(i)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1">
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
      <div>
        <Input type="file" accept="image/*" onChange={handleUpload} disabled={uploading || form.photos.length >= 5} />
        {uploading && <p className="text-sm text-gray-500 mt-1">Subiendo...</p>}
      </div>
    </div>
  )
}
```

Create `components/registration/step-confirmation.tsx`:

```typescript
import { Card, CardContent } from '@/components/ui/card'

type Props = { form: any }

export function StepConfirmation({ form }: Props) {
  return (
    <Card>
      <CardContent className="p-4 space-y-2 text-sm">
        <h3 className="font-semibold text-lg">{form.name}</h3>
        <p className="text-gray-600">{form.description}</p>
        <p><strong>WhatsApp:</strong> {form.whatsapp}</p>
        {form.phone && <p><strong>Telefono:</strong> {form.phone}</p>}
        {form.email && <p><strong>Email:</strong> {form.email}</p>}
        <p><strong>Direccion:</strong> {form.address}</p>
        <p><strong>Fotos:</strong> {form.photos.length}</p>
        <p className="text-amber-600 text-xs mt-4">
          Tu negocio sera revisado por un administrador antes de aparecer en el directorio.
        </p>
      </CardContent>
    </Card>
  )
}
```

**Step 3: Create register page**

Create `app/[community]/register/page.tsx`:

```typescript
import { RegisterBusinessForm } from '@/components/registration/register-business-form'

export const metadata = { title: 'Registrar negocio | BarrioRed' }

export default function RegisterPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-center">Registra tu negocio</h1>
      <RegisterBusinessForm />
    </div>
  )
}
```

**Step 4: Commit**

```bash
git add app/ components/
git commit -m "feat: add multi-step business registration form with photo upload and map picker"
```

---

## Task 15: Dashboard (Merchant Panel)

**Files:**
- Create: `app/dashboard/layout.tsx`
- Create: `app/dashboard/page.tsx`
- Create: `app/dashboard/business/[id]/edit/page.tsx`

**Step 1: Create dashboard layout**

Create `app/dashboard/layout.tsx`:

```typescript
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export const metadata = { title: 'Mi Panel | BarrioRed' }

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?returnUrl=/dashboard')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-4 h-14 flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <span className="font-bold text-blue-900">Mi Panel</span>
      </header>
      <main className="container mx-auto max-w-4xl px-4 py-6">{children}</main>
    </div>
  )
}
```

**Step 2: Create dashboard home**

Create `app/dashboard/page.tsx`:

```typescript
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus, Edit } from 'lucide-react'

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  pending: { label: 'Pendiente', variant: 'secondary' },
  approved: { label: 'Aprobado', variant: 'default' },
  rejected: { label: 'Rechazado', variant: 'destructive' },
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles').select('community_id, communities(slug)').eq('id', user!.id).single()

  const { data: businesses } = await supabase
    .from('businesses')
    .select('id, name, status, created_at, categories(name)')
    .eq('owner_id', user!.id)
    .order('created_at', { ascending: false })

  const communitySlug = (profile?.communities as any)?.slug

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Mis negocios</h1>
        {communitySlug && (
          <Link href={`/${communitySlug}/register`}>
            <Button><Plus className="h-4 w-4 mr-2" /> Registrar negocio</Button>
          </Link>
        )}
      </div>

      {(!businesses || businesses.length === 0) ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            No tienes negocios registrados aun.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {businesses.map((biz) => {
            const s = STATUS_LABELS[biz.status] ?? STATUS_LABELS.pending
            return (
              <Card key={biz.id}>
                <CardHeader className="flex flex-row items-center justify-between py-4">
                  <div>
                    <CardTitle className="text-lg">{biz.name}</CardTitle>
                    <p className="text-sm text-gray-500">{(biz.categories as any)?.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={s.variant}>{s.label}</Badge>
                    <Link href={`/dashboard/business/${biz.id}/edit`}>
                      <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                    </Link>
                  </div>
                </CardHeader>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

**Step 3: Create edit page**

Create `app/dashboard/business/[id]/edit/page.tsx`:

```typescript
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EditBusinessForm } from '@/components/dashboard/edit-business-form'

export default async function EditBusinessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', id)
    .eq('owner_id', user!.id)
    .single()

  if (!business) notFound()

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Editar: {business.name}</h1>
      <EditBusinessForm business={business} />
    </div>
  )
}
```

Create `components/dashboard/edit-business-form.tsx` (reuses step components in a simplified single-page form -- implementation mirrors register form but pre-filled and calls PATCH).

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export function EditBusinessForm({ business }: { business: any }) {
  const router = useRouter()
  const [form, setForm] = useState({
    name: business.name ?? '',
    description: business.description ?? '',
    address: business.address ?? '',
    phone: business.phone ?? '',
    whatsapp: business.whatsapp ?? '',
    email: business.email ?? '',
    website: business.website ?? '',
  })
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch(`/api/businesses/${business.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setLoading(false)

    if (!res.ok) {
      toast.error('Error actualizando negocio')
      return
    }
    toast.success('Negocio actualizado')
    router.push('/dashboard')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      <div><Label>Nombre</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
      <div><Label>Descripcion</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
      <div><Label>Direccion</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
      <div><Label>WhatsApp</Label><Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} /></div>
      <div><Label>Telefono</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
      <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
      <div><Label>Sitio web</Label><Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></div>
      <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar cambios'}</Button>
    </form>
  )
}
```

**Step 4: Commit**

```bash
git add app/dashboard/ components/dashboard/
git commit -m "feat: add merchant dashboard with business list and edit form"
```

---

## Task 16: Admin Panel

**Files:**
- Create: `app/admin/layout.tsx`
- Create: `app/admin/businesses/page.tsx`
- Create: `app/admin/businesses/[id]/page.tsx`
- Create: `app/admin/categories/page.tsx`

**Step 1: Create admin layout**

Create `app/admin/layout.tsx`:

```typescript
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Store, Tag } from 'lucide-react'

export const metadata = { title: 'Admin | BarrioRed' }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?returnUrl=/admin')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-4 h-14 flex items-center gap-4">
        <Link href="/"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <span className="font-bold text-blue-900">Admin</span>
        <nav className="flex gap-2 ml-4">
          <Link href="/admin/businesses"><Button variant="ghost" size="sm"><Store className="h-4 w-4 mr-1" /> Negocios</Button></Link>
          <Link href="/admin/categories"><Button variant="ghost" size="sm"><Tag className="h-4 w-4 mr-1" /> Categorias</Button></Link>
        </nav>
      </header>
      <main className="container mx-auto max-w-4xl px-4 py-6">{children}</main>
    </div>
  )
}
```

**Step 2: Create businesses list page**

Create `app/admin/businesses/page.tsx`:

```typescript
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye } from 'lucide-react'

export default async function AdminBusinessesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('community_id').eq('id', user!.id).single()

  const { data: businesses } = await supabase
    .from('businesses')
    .select('id, name, status, created_at, categories(name), profiles(full_name)')
    .eq('community_id', profile!.community_id!)
    .order('created_at', { ascending: false })

  const pending = businesses?.filter((b) => b.status === 'pending') ?? []
  const approved = businesses?.filter((b) => b.status === 'approved') ?? []

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Negocios</h1>

      {pending.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Pendientes de aprobacion ({pending.length})</h2>
          <div className="space-y-2">
            {pending.map((biz) => (
              <Card key={biz.id}>
                <CardContent className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">{biz.name}</p>
                    <p className="text-sm text-gray-500">{(biz.categories as any)?.name} - por {(biz.profiles as any)?.full_name}</p>
                  </div>
                  <Link href={`/admin/businesses/${biz.id}`}>
                    <Button size="sm"><Eye className="h-4 w-4 mr-1" /> Revisar</Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <h2 className="text-lg font-semibold mb-3">Aprobados ({approved.length})</h2>
      <div className="space-y-2">
        {approved.map((biz) => (
          <Card key={biz.id}>
            <CardContent className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium">{biz.name}</p>
                <p className="text-sm text-gray-500">{(biz.categories as any)?.name}</p>
              </div>
              <Badge>Aprobado</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
```

**Step 3: Create business review page**

Create `app/admin/businesses/[id]/page.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import Image from 'next/image'

export default function AdminBusinessReviewPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()
  const [business, setBusiness] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase
      .from('businesses')
      .select('*, categories(name), profiles(full_name, phone)')
      .eq('id', id)
      .single()
      .then(({ data }) => setBusiness(data))
  }, [id, supabase])

  async function handleAction(action: 'approve' | 'reject') {
    setLoading(true)
    const res = await fetch(`/api/businesses/${id}/${action}`, { method: 'POST' })
    setLoading(false)
    if (res.ok) {
      toast.success(action === 'approve' ? 'Negocio aprobado' : 'Negocio rechazado')
      router.push('/admin/businesses')
    } else {
      toast.error('Error procesando accion')
    }
  }

  if (!business) return <p>Cargando...</p>

  return (
    <div>
      <Link href="/admin/businesses">
        <Button variant="ghost" size="sm" className="mb-4"><ArrowLeft className="h-4 w-4 mr-1" /> Volver</Button>
      </Link>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>{business.name}</CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                {business.categories?.name} | Registrado por: {business.profiles?.full_name}
              </p>
            </div>
            <Badge variant="secondary">{business.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {business.description && <p>{business.description}</p>}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <p><strong>WhatsApp:</strong> {business.whatsapp}</p>
            <p><strong>Telefono:</strong> {business.phone ?? 'N/A'}</p>
            <p><strong>Email:</strong> {business.email ?? 'N/A'}</p>
            <p><strong>Direccion:</strong> {business.address ?? 'N/A'}</p>
          </div>

          {business.photos?.length > 0 && (
            <div className="flex gap-2 overflow-x-auto">
              {business.photos.map((url: string, i: number) => (
                <Image key={i} src={url} alt={`Foto ${i + 1}`} width={200} height={150} className="rounded-lg object-cover" />
              ))}
            </div>
          )}

          {business.status === 'pending' && (
            <div className="flex gap-3 pt-4">
              <Button onClick={() => handleAction('approve')} disabled={loading} className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="h-4 w-4 mr-2" /> Aprobar
              </Button>
              <Button variant="destructive" onClick={() => handleAction('reject')} disabled={loading}>
                <XCircle className="h-4 w-4 mr-2" /> Rechazar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

**Step 4: Create categories manager**

Create `app/admin/categories/page.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Edit, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { slugify } from '@/lib/utils'

export default function AdminCategoriesPage() {
  const supabase = createClient()
  const [categories, setCategories] = useState<any[]>([])
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  async function load() {
    const { data } = await supabase.from('categories').select('*').order('sort_order')
    if (data) setCategories(data)
  }

  useEffect(() => { load() }, [])

  async function handleSave() {
    const slug = slugify(name)
    if (editId) {
      await supabase.from('categories').update({ name, slug, icon }).eq('id', editId)
      toast.success('Categoria actualizada')
    } else {
      await supabase.from('categories').insert({ name, slug, icon, sort_order: categories.length })
      toast.success('Categoria creada')
    }
    setName(''); setIcon(''); setEditId(null); setOpen(false)
    load()
  }

  async function handleDelete(id: string) {
    await supabase.from('categories').delete().eq('id', id)
    toast.success('Categoria eliminada')
    load()
  }

  function openEdit(cat: any) {
    setName(cat.name); setIcon(cat.icon ?? ''); setEditId(cat.id); setOpen(true)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Categorias</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setName(''); setIcon(''); setEditId(null) }}>
              <Plus className="h-4 w-4 mr-2" /> Nueva
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? 'Editar' : 'Nueva'} categoria</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Nombre</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div><Label>Icono (nombre lucide)</Label><Input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="Store, Utensils, Scissors..." /></div>
              <Button onClick={handleSave} className="w-full">Guardar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {categories.map((cat) => (
          <Card key={cat.id}>
            <CardContent className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium">{cat.name}</p>
                <p className="text-xs text-gray-500">/{cat.slug} - icono: {cat.icon ?? 'ninguno'}</p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => openEdit(cat)}><Edit className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(cat.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
```

**Step 5: Commit**

```bash
git add app/admin/
git commit -m "feat: add admin panel with business approval, review, and category management"
```

---

## Task 17: Map Page

**Files:**
- Create: `app/[community]/map/page.tsx`

**Step 1: Create map page**

Create `app/[community]/map/page.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useCommunity } from '@/components/community/community-provider'
import { createClient } from '@/lib/supabase/client'
import { Skeleton } from '@/components/ui/skeleton'

const MapView = dynamic(() => import('@/components/map/map-view'), { ssr: false, loading: () => <Skeleton className="h-[calc(100vh-8rem)] w-full" /> })

export default function MapPage() {
  const community = useCommunity()
  const supabase = createClient()
  const [businesses, setBusinesses] = useState<any[]>([])

  useEffect(() => {
    supabase
      .from('businesses')
      .select('id, name, slug, address, whatsapp, location, categories(name)')
      .eq('community_id', community.id)
      .eq('status', 'approved')
      .then(({ data }) => { if (data) setBusinesses(data) })
  }, [community.id, supabase])

  return (
    <div className="h-[calc(100vh-8rem)]">
      <MapView businesses={businesses} communitySlug={community.slug} />
    </div>
  )
}
```

Create `components/map/map-view.tsx`:

```typescript
'use client'

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { whatsappUrl } from '@/lib/utils'
import { MessageCircle } from 'lucide-react'
import 'leaflet/dist/leaflet.css'

type Props = {
  businesses: any[]
  communitySlug: string
}

export default function MapView({ businesses, communitySlug }: Props) {
  // Center on Parque Industrial, Pereira
  const center: [number, number] = [4.8133, -75.6961]

  const markers = businesses.filter((b) => {
    const loc = b.location as any
    return loc?.coordinates?.[0] && loc?.coordinates?.[1]
  })

  return (
    <MapContainer center={center} zoom={15} className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {markers.map((biz) => {
        const loc = biz.location as any
        return (
          <Marker key={biz.id} position={[loc.coordinates[1], loc.coordinates[0]]}>
            <Popup>
              <div className="text-sm">
                <Link href={`/${communitySlug}/business/${biz.slug}`} className="font-semibold text-blue-600 hover:underline">
                  {biz.name}
                </Link>
                <p className="text-gray-500">{biz.categories?.name}</p>
                {biz.address && <p className="text-xs">{biz.address}</p>}
                {biz.whatsapp && (
                  <a href={whatsappUrl(biz.whatsapp)} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" className="mt-2 bg-green-600 hover:bg-green-700 w-full">
                      <MessageCircle className="h-3 w-3 mr-1" /> WhatsApp
                    </Button>
                  </a>
                )}
              </div>
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}
```

**Step 2: Commit**

```bash
git add app/ components/map/
git commit -m "feat: add interactive map page with business markers and popups"
```

---

## Task 18: PWA Setup

**Files:**
- Modify: `next.config.ts`
- Create: `public/manifest.json`
- Create: `public/icons/` (placeholder icons)

**Step 1: Install PWA package**

Run:
```bash
npm install @ducanh2912/next-pwa
```

**Step 2: Update next.config.ts**

```typescript
import type { NextConfig } from 'next'
import withPWAInit from '@ducanh2912/next-pwa'

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
})

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
}

export default withPWA(nextConfig)
```

**Step 3: Create manifest.json**

Create `public/manifest.json`:

```json
{
  "name": "BarrioRed - Tu barrio, conectado",
  "short_name": "BarrioRed",
  "description": "Directorio comercial y red vecinal de tu comunidad",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#1E40AF",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

**Step 4: Create placeholder icons**

Generate 192x192 and 512x512 PNG icons with "BR" text or the BarrioRed logo. Place in `public/icons/`.

**Step 5: Add manifest link to layout**

In `app/layout.tsx`, add to `metadata`:

```typescript
export const metadata: Metadata = {
  title: 'BarrioRed - Tu barrio, conectado',
  description: 'Plataforma digital comunitaria para la visibilidad comercial y el fortalecimiento del tejido social.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  manifest: '/manifest.json',
}
```

**Step 6: Commit**

```bash
git add next.config.ts public/ app/layout.tsx
git commit -m "feat: add PWA support with manifest, service worker, and icons"
```

---

## Task 19: SEO (Sitemap, Robots, JSON-LD)

**Files:**
- Create: `app/sitemap.ts`
- Create: `app/robots.ts`

**Step 1: Create dynamic sitemap**

Create `app/sitemap.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'

export default async function sitemap() {
  const supabase = await createClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://barriored.co'

  const { data: communities } = await supabase
    .from('communities').select('slug').eq('is_active', true)

  const { data: businesses } = await supabase
    .from('businesses').select('slug, community_id, updated_at, communities(slug)')
    .eq('status', 'approved')

  const communityUrls = (communities ?? []).map((c) => ({
    url: `${siteUrl}/${c.slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }))

  const businessUrls = (businesses ?? []).map((b) => ({
    url: `${siteUrl}/${(b.communities as any)?.slug}/business/${b.slug}`,
    lastModified: new Date(b.updated_at),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }))

  return [
    { url: siteUrl, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 1 },
    ...communityUrls,
    ...businessUrls,
  ]
}
```

**Step 2: Create robots.txt**

Create `app/robots.ts`:

```typescript
export default function robots() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://barriored.co'
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/dashboard', '/admin', '/api', '/auth'] },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
```

**Step 3: Commit**

```bash
git add app/sitemap.ts app/robots.ts
git commit -m "feat: add dynamic sitemap and robots.txt for SEO"
```

---

## Task 20: Seed Data & Final Verification

**Files:**
- Create: `supabase/seed.sql`

**Step 1: Create seed data**

Create `supabase/seed.sql`:

```sql
-- Seed community
INSERT INTO communities (name, slug, municipality, department, description, primary_color)
VALUES ('Parque Industrial', 'parqueindustrial', 'Pereira', 'Risaralda', 'Comuna del Cafe - Barrio Parque Industrial', '#1E40AF');

-- Seed categories
INSERT INTO categories (name, slug, icon, sort_order) VALUES
  ('Restaurantes', 'restaurantes', 'Utensils', 1),
  ('Tiendas', 'tiendas', 'Store', 2),
  ('Belleza', 'belleza', 'Scissors', 3),
  ('Servicios', 'servicios', 'Wrench', 4),
  ('Salud', 'salud', 'Heart', 5),
  ('Tecnologia', 'tecnologia', 'Monitor', 6),
  ('Educacion', 'educacion', 'GraduationCap', 7),
  ('Talleres', 'talleres', 'Hammer', 8),
  ('Mascotas', 'mascotas', 'PawPrint', 9),
  ('Otros', 'otros', 'MoreHorizontal', 10);
```

**Step 2: Run seed in Supabase SQL Editor**

Go to Supabase Dashboard > SQL Editor. Paste and run `seed.sql`.

Verify: Visit localhost:3000, the landing page should show "Parque Industrial" community. Click it to see the community homepage with categories.

**Step 3: Create an admin user**

1. Sign up via `/auth/signup` with your email
2. In Supabase Dashboard > Table Editor > profiles, update your user's `role` to `admin` and `community_id` to the Parque Industrial community ID

**Step 4: Full verification checklist**

Run `npm run dev` and verify:

- [ ] Landing page shows Parque Industrial community
- [ ] Community homepage shows categories and search bar
- [ ] Directory page lists businesses (empty for now, shows "No se encontraron negocios")
- [ ] Map page loads with Leaflet centered on Pereira
- [ ] Auth: login and signup pages render
- [ ] Register business: multi-step form works
- [ ] Dashboard: shows registered businesses
- [ ] Admin: shows pending businesses, can approve/reject
- [ ] Admin: can create/edit categories
- [ ] Mobile: bottom navigation works

**Step 5: Commit seed data**

```bash
git add supabase/seed.sql
git commit -m "feat: add seed data for pilot community and initial categories"
```

---

## Summary

| Task | Description | Key Deliverable |
|---|---|---|
| 1 | Project scaffolding | Next.js + Tailwind + shadcn + Supabase deps |
| 2 | Supabase schema | Tables, indexes, PostGIS, functions |
| 3 | RLS policies | Multi-tenant security at DB level |
| 4 | Storage setup | business-images bucket + policies |
| 5 | Supabase clients | Browser, server, middleware helpers |
| 6 | Middleware | Multi-tenant resolution + auth guards |
| 7 | Zod schemas | Input validation for all API routes |
| 8 | Root layout + landing | Global layout, landing page |
| 9 | Community layout + homepage | CommunityProvider, TopBar, BottomNav, Hero, Categories |
| 10 | Directory | BusinessCard, search, category filter |
| 11 | Business profile | Full profile with photos, map, WhatsApp CTA |
| 12 | Auth | Login, signup, WhatsApp OTP, callback |
| 13 | API routes | CRUD, upload, approve/reject, OTP |
| 14 | Registration | Multi-step form with photo upload and map picker |
| 15 | Dashboard | Merchant panel with business list and edit |
| 16 | Admin | Business approval, category management |
| 17 | Map | Full map page with markers and popups |
| 18 | PWA | Service worker, manifest, install prompt |
| 19 | SEO | Dynamic sitemap, robots.txt |
| 20 | Seed + verification | Pilot data, full checklist |
