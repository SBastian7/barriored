# Phase 3: Red Vecinal (Community) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a neighborhood social board at `/{community}/community` with announcements, alerts, events, jobs, and a public services directory.

**Architecture:** Hybrid DB approach with 3 tables: `community_posts` (unified for announcements/events/jobs with JSONB metadata), `community_alerts` (admin-only), `public_services` (admin-curated). All user posts require admin approval. Sectioned dashboard hub page with sub-pages per content type.

**Tech Stack:** Next.js 16 App Router, Supabase (PostgreSQL + RLS), Tailwind CSS, Zod validation, lucide-react icons, Neo-Brutalist Tropical design system.

**Design Doc:** `docs/plans/2026-02-18-phase3-community-design.md`

---

## Task 1: Database Migration — Create Tables

**Files:**
- Migration applied via Supabase MCP tool

**Step 1: Apply migration for all 3 tables + RLS policies**

Apply migration named `create_community_phase3_tables` with this SQL:

```sql
-- ===========================================
-- community_posts: announcements, events, jobs
-- ===========================================
CREATE TABLE public.community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('announcement', 'event', 'job')),
  title text NOT NULL,
  content text NOT NULL,
  image_url text,
  metadata jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  is_pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_community_posts_community ON public.community_posts(community_id);
CREATE INDEX idx_community_posts_type ON public.community_posts(type);
CREATE INDEX idx_community_posts_status ON public.community_posts(status);
CREATE INDEX idx_community_posts_author ON public.community_posts(author_id);

ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

-- Anyone can read approved posts
CREATE POLICY "community_posts_select" ON public.community_posts
  FOR SELECT USING (status = 'approved');

-- Authenticated users can also see their own posts (any status)
CREATE POLICY "community_posts_select_own" ON public.community_posts
  FOR SELECT USING (auth.uid() = author_id);

-- Authenticated users can insert (status forced to pending)
CREATE POLICY "community_posts_insert" ON public.community_posts
  FOR INSERT WITH CHECK (auth.uid() = author_id AND status = 'pending');

-- Authors can update their own pending posts
CREATE POLICY "community_posts_update_own" ON public.community_posts
  FOR UPDATE USING (auth.uid() = author_id AND status = 'pending');

-- Admins can update any post (for approval/rejection)
CREATE POLICY "community_posts_update_admin" ON public.community_posts
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Authors can delete their own posts
CREATE POLICY "community_posts_delete_own" ON public.community_posts
  FOR DELETE USING (auth.uid() = author_id);

-- Admins can delete any post
CREATE POLICY "community_posts_delete_admin" ON public.community_posts
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ===========================================
-- community_alerts: admin-only alerts
-- ===========================================
CREATE TABLE public.community_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('water', 'power', 'security', 'construction', 'general')),
  title text NOT NULL,
  description text,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  is_active boolean NOT NULL DEFAULT true,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_community_alerts_community ON public.community_alerts(community_id);
CREATE INDEX idx_community_alerts_active ON public.community_alerts(is_active);

ALTER TABLE public.community_alerts ENABLE ROW LEVEL SECURITY;

-- Anyone can read alerts
CREATE POLICY "community_alerts_select" ON public.community_alerts
  FOR SELECT USING (true);

-- Only admins can insert/update/delete
CREATE POLICY "community_alerts_insert_admin" ON public.community_alerts
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "community_alerts_update_admin" ON public.community_alerts
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "community_alerts_delete_admin" ON public.community_alerts
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ===========================================
-- public_services: admin-curated directory
-- ===========================================
CREATE TABLE public.public_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('emergency', 'health', 'government', 'transport', 'utilities')),
  name text NOT NULL,
  description text,
  phone text,
  address text,
  hours text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true
);

CREATE INDEX idx_public_services_community ON public.public_services(community_id);
CREATE INDEX idx_public_services_category ON public.public_services(category);

ALTER TABLE public.public_services ENABLE ROW LEVEL SECURITY;

-- Anyone can read active services
CREATE POLICY "public_services_select" ON public.public_services
  FOR SELECT USING (is_active = true);

-- Only admins can insert/update/delete
CREATE POLICY "public_services_insert_admin" ON public.public_services
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "public_services_update_admin" ON public.public_services
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "public_services_delete_admin" ON public.public_services
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
```

**Step 2: Regenerate TypeScript types**

Run: `mcp__supabase__generate_typescript_types` and save the output to `lib/types/database.ts`.

**Step 3: Run security advisors**

Run: `mcp__supabase__get_advisors` with type `security` to verify RLS policies are correct.

**Step 4: Commit**

```bash
git add lib/types/database.ts
git commit -m "feat(db): add community_posts, community_alerts, public_services tables with RLS"
```

---

## Task 2: TypeScript Types & Zod Validations

**Files:**
- Modify: `lib/types/index.ts`
- Create: `lib/validations/community.ts`

**Step 1: Add types to `lib/types/index.ts`**

Append after existing types:

```typescript
// Phase 3: Community types
export type PostType = 'announcement' | 'event' | 'job'
export type PostStatus = 'pending' | 'approved' | 'rejected'
export type AlertType = 'water' | 'power' | 'security' | 'construction' | 'general'
export type AlertSeverity = 'info' | 'warning' | 'critical'
export type ServiceCategory = 'emergency' | 'health' | 'government' | 'transport' | 'utilities'

export type EventMetadata = {
  date: string
  end_date?: string
  location: string
  location_coords?: { lat: number; lng: number }
}

export type JobMetadata = {
  category: string
  salary_range?: string
  contact_method: 'whatsapp' | 'phone' | 'email'
  contact_value: string
}

export type CommunityPost = {
  id: string
  community_id: string
  author_id: string
  type: PostType
  title: string
  content: string
  image_url: string | null
  metadata: EventMetadata | JobMetadata | Record<string, never>
  status: PostStatus
  is_pinned: boolean
  created_at: string
  updated_at: string
  profiles?: { full_name: string; avatar_url: string | null }
}

export type CommunityAlert = {
  id: string
  community_id: string
  author_id: string
  type: AlertType
  title: string
  description: string | null
  severity: AlertSeverity
  is_active: boolean
  starts_at: string
  ends_at: string | null
  created_at: string
}

export type PublicService = {
  id: string
  community_id: string
  category: ServiceCategory
  name: string
  description: string | null
  phone: string | null
  address: string | null
  hours: string | null
  sort_order: number
  is_active: boolean
}
```

**Step 2: Create Zod validation schemas at `lib/validations/community.ts`**

```typescript
import { z } from 'zod'

// Base post schema (shared fields)
const basePostSchema = z.object({
  community_id: z.string().uuid(),
  title: z.string().min(3, 'Minimo 3 caracteres').max(150),
  content: z.string().min(10, 'Minimo 10 caracteres').max(2000),
  image_url: z.string().url().optional().or(z.literal('')),
})

// Announcement: no extra metadata
export const createAnnouncementSchema = basePostSchema.extend({
  type: z.literal('announcement'),
})

// Event: requires date + location
export const createEventSchema = basePostSchema.extend({
  type: z.literal('event'),
  metadata: z.object({
    date: z.string().min(1, 'Fecha requerida'),
    end_date: z.string().optional(),
    location: z.string().min(3, 'Ubicacion requerida'),
    location_coords: z.object({
      lat: z.number(),
      lng: z.number(),
    }).optional(),
  }),
})

// Job: requires category + contact
export const createJobSchema = basePostSchema.extend({
  type: z.literal('job'),
  metadata: z.object({
    category: z.string().min(1, 'Categoria requerida'),
    salary_range: z.string().optional(),
    contact_method: z.enum(['whatsapp', 'phone', 'email']),
    contact_value: z.string().min(1, 'Contacto requerido'),
  }),
})

// Discriminated union for all post types
export const createPostSchema = z.discriminatedUnion('type', [
  createAnnouncementSchema,
  createEventSchema,
  createJobSchema,
])

export type CreatePostInput = z.infer<typeof createPostSchema>

// Alert schema (admin only)
export const createAlertSchema = z.object({
  community_id: z.string().uuid(),
  type: z.enum(['water', 'power', 'security', 'construction', 'general']),
  title: z.string().min(3).max(150),
  description: z.string().max(500).optional(),
  severity: z.enum(['info', 'warning', 'critical']),
  starts_at: z.string().optional(),
  ends_at: z.string().optional(),
})

export type CreateAlertInput = z.infer<typeof createAlertSchema>

// Public service schema (admin only)
export const createServiceSchema = z.object({
  community_id: z.string().uuid(),
  category: z.enum(['emergency', 'health', 'government', 'transport', 'utilities']),
  name: z.string().min(2).max(100),
  description: z.string().max(300).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  hours: z.string().optional(),
  sort_order: z.number().int().optional(),
})

export type CreateServiceInput = z.infer<typeof createServiceSchema>
```

**Step 3: Commit**

```bash
git add lib/types/index.ts lib/validations/community.ts
git commit -m "feat: add Phase 3 TypeScript types and Zod validations"
```

---

## Task 3: API Routes — Community Posts

**Files:**
- Create: `app/api/community/posts/route.ts`
- Create: `app/api/community/posts/[id]/route.ts`

**Step 1: Create `app/api/community/posts/route.ts`**

Follow the pattern from `app/api/businesses/route.ts`:

```typescript
import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createPostSchema } from '@/lib/validations/community'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const communityId = searchParams.get('community_id')
  const type = searchParams.get('type')
  const limit = parseInt(searchParams.get('limit') ?? '20')

  if (!communityId) {
    return NextResponse.json({ error: 'community_id requerido' }, { status: 400 })
  }

  let query = supabase
    .from('community_posts')
    .select('*, profiles(full_name, avatar_url)')
    .eq('community_id', communityId)
    .eq('status', 'approved')
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (type) {
    query = query.eq('type', type)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = createPostSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const { type, title, content, image_url, community_id, ...rest } = parsed.data
  const metadata = 'metadata' in rest ? rest.metadata : {}

  const { data, error } = await supabase
    .from('community_posts')
    .insert({
      community_id,
      author_id: user.id,
      type,
      title,
      content,
      image_url: image_url || null,
      metadata,
      status: 'pending',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data, { status: 201 })
}
```

**Step 2: Create `app/api/community/posts/[id]/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('community_posts')
    .select('*, profiles(full_name, avatar_url)')
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Publicacion no encontrada' }, { status: 404 })
  }

  return NextResponse.json(data)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = await request.json()

  const { data, error } = await supabase
    .from('community_posts')
    .update(body)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { error } = await supabase.from('community_posts').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
```

**Step 3: Commit**

```bash
git add app/api/community/posts/
git commit -m "feat: add community posts API routes (GET, POST, PATCH, DELETE)"
```

---

## Task 4: API Routes — Alerts & Services

**Files:**
- Create: `app/api/community/alerts/route.ts`
- Create: `app/api/community/alerts/[id]/route.ts`
- Create: `app/api/community/services/route.ts`
- Create: `app/api/community/services/[id]/route.ts`

**Step 1: Create `app/api/community/alerts/route.ts`**

```typescript
import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAlertSchema } from '@/lib/validations/community'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const communityId = new URL(request.url).searchParams.get('community_id')
  if (!communityId) return NextResponse.json({ error: 'community_id requerido' }, { status: 400 })

  const { data, error } = await supabase
    .from('community_alerts')
    .select('*')
    .eq('community_id', communityId)
    .eq('is_active', true)
    .order('severity', { ascending: true }) // critical first
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  // Admin check
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const body = await request.json()
  const parsed = createAlertSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })

  const { data, error } = await supabase
    .from('community_alerts')
    .insert({ ...parsed.data, author_id: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
```

**Step 2: Create `app/api/community/alerts/[id]/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = await request.json()
  const { data, error } = await supabase
    .from('community_alerts')
    .update(body)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { error } = await supabase.from('community_alerts').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
```

**Step 3: Create `app/api/community/services/route.ts`**

Same pattern as alerts:

```typescript
import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceSchema } from '@/lib/validations/community'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const communityId = new URL(request.url).searchParams.get('community_id')
  if (!communityId) return NextResponse.json({ error: 'community_id requerido' }, { status: 400 })

  const { data, error } = await supabase
    .from('public_services')
    .select('*')
    .eq('community_id', communityId)
    .eq('is_active', true)
    .order('category')
    .order('sort_order')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const body = await request.json()
  const parsed = createServiceSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })

  const { data, error } = await supabase
    .from('public_services')
    .insert(parsed.data)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
```

**Step 4: Create `app/api/community/services/[id]/route.ts`**

Same PATCH/DELETE pattern as alerts `[id]` route.

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = await request.json()
  const { data, error } = await supabase
    .from('public_services')
    .update(body)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { error } = await supabase.from('public_services').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
```

**Step 5: Commit**

```bash
git add app/api/community/alerts/ app/api/community/services/
git commit -m "feat: add community alerts and public services API routes"
```

---

## Task 5: Community Card Components

**Files:**
- Create: `components/community/post-card.tsx`
- Create: `components/community/alert-card.tsx`
- Create: `components/community/service-card.tsx`

**Step 1: Create `components/community/post-card.tsx`**

Unified card that renders differently by type. Follow patterns from `components/directory/business-card.tsx`:

```tsx
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, MapPin, Briefcase, Pin, User } from 'lucide-react'
import type { CommunityPost, EventMetadata, JobMetadata } from '@/lib/types'

export function PostCard({ post, communitySlug }: { post: CommunityPost; communitySlug: string }) {
  const typeLabels = { announcement: 'Anuncio', event: 'Evento', job: 'Empleo' }
  const typeColors = { announcement: 'default', event: 'accent', job: 'secondary' } as const

  return (
    <Link href={`/${communitySlug}/community/${post.type === 'announcement' ? 'announcements' : post.type === 'event' ? 'events' : 'jobs'}/${post.id}`}>
      <Card className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-none bg-white hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all overflow-hidden group h-full">
        {post.image_url && (
          <div className="aspect-video overflow-hidden border-b-2 border-black">
            <img src={post.image_url} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
          </div>
        )}
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant={typeColors[post.type]}>{typeLabels[post.type]}</Badge>
            {post.is_pinned && (
              <Badge variant="outline" className="gap-1">
                <Pin className="h-3 w-3" /> Fijado
              </Badge>
            )}
          </div>

          <h3 className="font-heading font-black text-lg uppercase tracking-tight italic group-hover:text-primary transition-colors line-clamp-2">
            {post.title}
          </h3>

          <p className="text-sm text-black/60 line-clamp-2">{post.content}</p>

          {/* Type-specific metadata */}
          {post.type === 'event' && (
            <div className="flex flex-col gap-1 text-xs font-bold text-black/50">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {new Date((post.metadata as EventMetadata).date).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {(post.metadata as EventMetadata).location}
              </span>
            </div>
          )}

          {post.type === 'job' && (
            <div className="flex flex-col gap-1 text-xs font-bold text-black/50">
              <span className="flex items-center gap-1">
                <Briefcase className="h-3.5 w-3.5" />
                {(post.metadata as JobMetadata).category}
              </span>
              {(post.metadata as JobMetadata).salary_range && (
                <span className="text-primary font-black">{(post.metadata as JobMetadata).salary_range}</span>
              )}
            </div>
          )}

          {/* Author + date footer */}
          <div className="flex items-center gap-2 pt-2 border-t border-black/10 text-[10px] font-black uppercase tracking-widest text-black/40">
            <User className="h-3 w-3" />
            <span>{post.profiles?.full_name ?? 'Vecino'}</span>
            <span className="ml-auto">{new Date(post.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
```

**Step 2: Create `components/community/alert-card.tsx`**

```tsx
import { AlertTriangle, Droplets, Zap, Shield, Construction, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CommunityAlert } from '@/lib/types'

const alertIcons = {
  water: Droplets,
  power: Zap,
  security: Shield,
  construction: Construction,
  general: Info,
}

const severityStyles = {
  critical: 'bg-primary border-primary text-primary-foreground',
  warning: 'bg-secondary border-black text-secondary-foreground',
  info: 'bg-accent/10 border-accent text-accent-foreground',
}

export function AlertCard({ alert }: { alert: CommunityAlert }) {
  const Icon = alertIcons[alert.type]

  return (
    <div className={cn(
      'flex items-start gap-3 p-4 border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]',
      severityStyles[alert.severity]
    )}>
      <div className="shrink-0 mt-0.5">
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-black uppercase tracking-tight text-sm">{alert.title}</p>
        {alert.description && (
          <p className="text-sm mt-1 opacity-80">{alert.description}</p>
        )}
        {alert.ends_at && (
          <p className="text-[10px] font-bold uppercase tracking-widest mt-2 opacity-60">
            Hasta {new Date(alert.ends_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>
    </div>
  )
}
```

**Step 3: Create `components/community/service-card.tsx`**

```tsx
import { Phone, MapPin, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import type { PublicService } from '@/lib/types'

export function ServiceCard({ service }: { service: PublicService }) {
  return (
    <Card className="border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-none bg-white">
      <CardContent className="p-4 space-y-2">
        <h3 className="font-heading font-black text-base uppercase tracking-tight italic">{service.name}</h3>
        {service.description && <p className="text-sm text-black/60">{service.description}</p>}
        <div className="flex flex-col gap-1 text-xs font-bold text-black/50">
          {service.phone && (
            <a href={`tel:${service.phone}`} className="flex items-center gap-1.5 hover:text-primary transition-colors">
              <Phone className="h-3.5 w-3.5" /> {service.phone}
            </a>
          )}
          {service.address && (
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" /> {service.address}
            </span>
          )}
          {service.hours && (
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> {service.hours}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
```

**Step 4: Commit**

```bash
git add components/community/post-card.tsx components/community/alert-card.tsx components/community/service-card.tsx
git commit -m "feat: add PostCard, AlertCard, ServiceCard community components"
```

---

## Task 6: Community Hub Page (Sectioned Dashboard)

**Files:**
- Create: `app/[community]/community/page.tsx`
- Create: `components/community/alerts-banner.tsx`
- Create: `components/community/announcements-section.tsx`
- Create: `components/community/events-section.tsx`
- Create: `components/community/jobs-section.tsx`
- Create: `components/community/services-section.tsx`
- Create: `components/community/community-cta.tsx`

**Step 1: Create hub section components**

Create `components/community/alerts-banner.tsx`:

```tsx
import { AlertCard } from './alert-card'
import type { CommunityAlert } from '@/lib/types'

export function AlertsBanner({ alerts }: { alerts: CommunityAlert[] }) {
  if (alerts.length === 0) return null

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
        <span className="bg-primary text-primary-foreground px-2 py-0.5 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          {alerts.length}
        </span>
        Alertas Activas
      </h2>
      <div className="space-y-2">
        {alerts.map((alert) => (
          <AlertCard key={alert.id} alert={alert} />
        ))}
      </div>
    </section>
  )
}
```

Create `components/community/announcements-section.tsx`:

```tsx
import Link from 'next/link'
import { PostCard } from './post-card'
import { ArrowRight, Megaphone } from 'lucide-react'
import type { CommunityPost } from '@/lib/types'

export function AnnouncementsSection({ posts, communitySlug }: { posts: CommunityPost[]; communitySlug: string }) {
  return (
    <section>
      <div className="flex items-end justify-between mb-6">
        <h2 className="text-2xl font-heading font-black uppercase italic tracking-tight flex items-center gap-2">
          <Megaphone className="h-6 w-6 text-primary" />
          Anuncios
        </h2>
        <Link href={`/${communitySlug}/community/announcements`} className="text-xs font-black uppercase tracking-widest text-primary hover:underline flex items-center gap-1">
          Ver todos <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      {posts.length === 0 ? (
        <p className="text-sm text-black/40 font-bold italic">No hay anuncios recientes.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} communitySlug={communitySlug} />
          ))}
        </div>
      )}
    </section>
  )
}
```

Create `components/community/events-section.tsx`:

```tsx
import Link from 'next/link'
import { PostCard } from './post-card'
import { ArrowRight, CalendarDays } from 'lucide-react'
import type { CommunityPost } from '@/lib/types'

export function EventsSection({ posts, communitySlug }: { posts: CommunityPost[]; communitySlug: string }) {
  return (
    <section>
      <div className="flex items-end justify-between mb-6">
        <h2 className="text-2xl font-heading font-black uppercase italic tracking-tight flex items-center gap-2">
          <CalendarDays className="h-6 w-6 text-accent" />
          Eventos
        </h2>
        <Link href={`/${communitySlug}/community/events`} className="text-xs font-black uppercase tracking-widest text-accent hover:underline flex items-center gap-1">
          Ver todos <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      {posts.length === 0 ? (
        <p className="text-sm text-black/40 font-bold italic">No hay eventos proximos.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} communitySlug={communitySlug} />
          ))}
        </div>
      )}
    </section>
  )
}
```

Create `components/community/jobs-section.tsx`:

```tsx
import Link from 'next/link'
import { PostCard } from './post-card'
import { ArrowRight, Briefcase } from 'lucide-react'
import type { CommunityPost } from '@/lib/types'

export function JobsSection({ posts, communitySlug }: { posts: CommunityPost[]; communitySlug: string }) {
  return (
    <section>
      <div className="flex items-end justify-between mb-6">
        <h2 className="text-2xl font-heading font-black uppercase italic tracking-tight flex items-center gap-2">
          <Briefcase className="h-6 w-6 text-secondary-foreground" />
          Empleos
        </h2>
        <Link href={`/${communitySlug}/community/jobs`} className="text-xs font-black uppercase tracking-widest text-black/60 hover:underline flex items-center gap-1">
          Ver todos <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      {posts.length === 0 ? (
        <p className="text-sm text-black/40 font-bold italic">No hay empleos publicados.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} communitySlug={communitySlug} />
          ))}
        </div>
      )}
    </section>
  )
}
```

Create `components/community/services-section.tsx`:

```tsx
import Link from 'next/link'
import { ArrowRight, Siren, HeartPulse, Landmark, Bus, Wrench } from 'lucide-react'

const categories = [
  { key: 'emergency', label: 'Emergencias', icon: Siren, color: 'bg-primary text-primary-foreground' },
  { key: 'health', label: 'Salud', icon: HeartPulse, color: 'bg-accent text-accent-foreground' },
  { key: 'government', label: 'Gobierno', icon: Landmark, color: 'bg-secondary text-secondary-foreground' },
  { key: 'transport', label: 'Transporte', icon: Bus, color: 'bg-[oklch(0.5_0.15_150)] text-white' },
  { key: 'utilities', label: 'Servicios Publicos', icon: Wrench, color: 'bg-[oklch(0.7_0.15_30)] text-white' },
]

export function ServicesSection({ communitySlug }: { communitySlug: string }) {
  return (
    <section>
      <div className="flex items-end justify-between mb-6">
        <h2 className="text-2xl font-heading font-black uppercase italic tracking-tight flex items-center gap-2">
          <Siren className="h-6 w-6 text-primary" />
          Servicios y Emergencias
        </h2>
        <Link href={`/${communitySlug}/community/services`} className="text-xs font-black uppercase tracking-widest text-primary hover:underline flex items-center gap-1">
          Ver todos <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {categories.map((cat) => (
          <Link
            key={cat.key}
            href={`/${communitySlug}/community/services?category=${cat.key}`}
            className="flex flex-col items-center gap-2 p-4 border-2 border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
          >
            <div className={`w-10 h-10 flex items-center justify-center border-2 border-black ${cat.color}`}>
              <cat.icon className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-center">{cat.label}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}
```

Create `components/community/community-cta.tsx`:

```tsx
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PenSquare } from 'lucide-react'

export function CommunityCTA({ communitySlug }: { communitySlug: string }) {
  return (
    <section className="bg-accent/10 border-4 border-black p-8 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      <h2 className="text-2xl font-heading font-black uppercase italic tracking-tight mb-2">
        Publica algo en tu <span className="text-primary">barrio</span>
      </h2>
      <p className="text-sm text-black/60 font-medium mb-6">
        Comparte un anuncio, evento o empleo con tus vecinos.
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        <Link href={`/${communitySlug}/community/announcements/new`}>
          <Button className="border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <PenSquare className="h-4 w-4 mr-1.5" /> Anuncio
          </Button>
        </Link>
        <Link href={`/${communitySlug}/community/events/new`}>
          <Button variant="secondary" className="border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <PenSquare className="h-4 w-4 mr-1.5" /> Evento
          </Button>
        </Link>
        <Link href={`/${communitySlug}/community/jobs/new`}>
          <Button variant="outline" className="border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <PenSquare className="h-4 w-4 mr-1.5" /> Empleo
          </Button>
        </Link>
      </div>
    </section>
  )
}
```

**Step 2: Create hub page at `app/[community]/community/page.tsx`**

```tsx
import { createClient } from '@/lib/supabase/server'
import { Breadcrumbs } from '@/components/shared/breadcrumbs'
import { AlertsBanner } from '@/components/community/alerts-banner'
import { AnnouncementsSection } from '@/components/community/announcements-section'
import { EventsSection } from '@/components/community/events-section'
import { JobsSection } from '@/components/community/jobs-section'
import { ServicesSection } from '@/components/community/services-section'
import { CommunityCTA } from '@/components/community/community-cta'

export async function generateMetadata() {
  return { title: 'Comunidad | BarrioRed' }
}

export default async function CommunityHubPage({ params }: { params: Promise<{ community: string }> }) {
  const { community: slug } = await params
  const supabase = await createClient()

  const { data: community } = await supabase
    .from('communities').select('id, name').eq('slug', slug).single()

  if (!community) return null

  // Parallel data fetching
  const [alertsRes, announcementsRes, eventsRes, jobsRes] = await Promise.all([
    supabase.from('community_alerts')
      .select('*')
      .eq('community_id', community.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false }),
    supabase.from('community_posts')
      .select('*, profiles(full_name, avatar_url)')
      .eq('community_id', community.id)
      .eq('status', 'approved')
      .eq('type', 'announcement')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(3),
    supabase.from('community_posts')
      .select('*, profiles(full_name, avatar_url)')
      .eq('community_id', community.id)
      .eq('status', 'approved')
      .eq('type', 'event')
      .order('created_at', { ascending: false })
      .limit(3),
    supabase.from('community_posts')
      .select('*, profiles(full_name, avatar_url)')
      .eq('community_id', community.id)
      .eq('status', 'approved')
      .eq('type', 'job')
      .order('created_at', { ascending: false })
      .limit(3),
  ])

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <Breadcrumbs
        items={[
          { label: community.name, href: `/${slug}` },
          { label: 'Comunidad', active: true },
        ]}
      />

      <h1 className="text-5xl md:text-7xl font-heading font-black uppercase tracking-tighter italic mb-8">
        Red <span className="text-primary italic">Vecinal</span>
      </h1>

      <div className="space-y-12">
        <AlertsBanner alerts={alertsRes.data ?? []} />
        <AnnouncementsSection posts={announcementsRes.data ?? []} communitySlug={slug} />
        <EventsSection posts={eventsRes.data ?? []} communitySlug={slug} />
        <JobsSection posts={jobsRes.data ?? []} communitySlug={slug} />
        <ServicesSection communitySlug={slug} />
        <CommunityCTA communitySlug={slug} />
      </div>
    </div>
  )
}
```

**Step 3: Verify the dev server builds without errors**

Run: `npm run build` (or `npm run dev` and navigate to `/{community}/community`)

**Step 4: Commit**

```bash
git add app/[community]/community/page.tsx components/community/alerts-banner.tsx components/community/announcements-section.tsx components/community/events-section.tsx components/community/jobs-section.tsx components/community/services-section.tsx components/community/community-cta.tsx
git commit -m "feat: add community hub page with sectioned dashboard layout"
```

---

## Task 7: Post List Pages (Announcements, Events, Jobs)

**Files:**
- Create: `app/[community]/community/announcements/page.tsx`
- Create: `app/[community]/community/events/page.tsx`
- Create: `app/[community]/community/jobs/page.tsx`

**Step 1: Create announcements list page**

Follow pattern from `app/[community]/directory/page.tsx`:

```tsx
// app/[community]/community/announcements/page.tsx
import { createClient } from '@/lib/supabase/server'
import { PostCard } from '@/components/community/post-card'
import { Breadcrumbs } from '@/components/shared/breadcrumbs'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PenSquare } from 'lucide-react'

export const metadata = { title: 'Anuncios | BarrioRed' }

export default async function AnnouncementsPage({ params }: { params: Promise<{ community: string }> }) {
  const { community: slug } = await params
  const supabase = await createClient()

  const { data: community } = await supabase
    .from('communities').select('id, name').eq('slug', slug).single()
  if (!community) return null

  const { data: posts } = await supabase
    .from('community_posts')
    .select('*, profiles(full_name, avatar_url)')
    .eq('community_id', community.id)
    .eq('status', 'approved')
    .eq('type', 'announcement')
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <Breadcrumbs items={[
        { label: community.name, href: `/${slug}` },
        { label: 'Comunidad', href: `/${slug}/community` },
        { label: 'Anuncios', active: true },
      ]} />

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <h1 className="text-5xl md:text-7xl font-heading font-black uppercase tracking-tighter italic">
          Anuncios <span className="text-primary italic">del Barrio</span>
        </h1>
        <Link href={`/${slug}/community/announcements/new`}>
          <Button className="border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <PenSquare className="h-4 w-4 mr-1.5" /> Publicar Anuncio
          </Button>
        </Link>
      </div>

      {(posts?.length ?? 0) === 0 ? (
        <div className="text-center py-20 border-4 border-dashed border-black bg-white/50">
          <p className="text-2xl font-black uppercase italic tracking-tighter text-black/40">No hay anuncios todavia</p>
          <p className="font-bold text-black/60 mt-2">Se el primero en publicar un anuncio.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts!.map((post: any) => (
            <PostCard key={post.id} post={post} communitySlug={slug} />
          ))}
        </div>
      )}
    </div>
  )
}
```

**Step 2: Create events list page**

Same pattern, change type to `'event'`, title to "Eventos", CTA to "Publicar Evento", empty state to "No hay eventos proximos". File: `app/[community]/community/events/page.tsx`.

**Step 3: Create jobs list page**

Same pattern, change type to `'job'`, title to "Empleos", CTA to "Publicar Empleo", empty state to "No hay empleos publicados". File: `app/[community]/community/jobs/page.tsx`.

**Step 4: Commit**

```bash
git add app/[community]/community/announcements/page.tsx app/[community]/community/events/page.tsx app/[community]/community/jobs/page.tsx
git commit -m "feat: add list pages for announcements, events, and jobs"
```

---

## Task 8: Post Detail Pages

**Files:**
- Create: `app/[community]/community/announcements/[id]/page.tsx`
- Create: `app/[community]/community/events/[id]/page.tsx`
- Create: `app/[community]/community/jobs/[id]/page.tsx`

**Step 1: Create announcement detail page**

```tsx
// app/[community]/community/announcements/[id]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { Breadcrumbs } from '@/components/shared/breadcrumbs'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { User, Pin } from 'lucide-react'
import { notFound } from 'next/navigation'

export default async function AnnouncementDetailPage({
  params,
}: {
  params: Promise<{ community: string; id: string }>
}) {
  const { community: slug, id } = await params
  const supabase = await createClient()

  const { data: community } = await supabase
    .from('communities').select('id, name').eq('slug', slug).single()
  if (!community) return notFound()

  const { data: post } = await supabase
    .from('community_posts')
    .select('*, profiles(full_name, avatar_url)')
    .eq('id', id)
    .single()

  if (!post || post.status !== 'approved') return notFound()

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <Breadcrumbs items={[
        { label: community.name, href: `/${slug}` },
        { label: 'Comunidad', href: `/${slug}/community` },
        { label: 'Anuncios', href: `/${slug}/community/announcements` },
        { label: post.title, active: true },
      ]} />

      <Card className="border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-none overflow-hidden mt-6">
        {post.image_url && (
          <div className="aspect-video overflow-hidden border-b-4 border-black">
            <img src={post.image_url} alt={post.title} className="w-full h-full object-cover" />
          </div>
        )}
        <CardContent className="p-6 md:p-8 space-y-4">
          <div className="flex items-center gap-2">
            <Badge>Anuncio</Badge>
            {post.is_pinned && <Badge variant="outline"><Pin className="h-3 w-3 mr-1" /> Fijado</Badge>}
          </div>
          <h1 className="text-3xl md:text-4xl font-heading font-black uppercase italic tracking-tighter">
            {post.title}
          </h1>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-black/40">
            <User className="h-3.5 w-3.5" />
            {(post.profiles as any)?.full_name ?? 'Vecino'}
            <span className="mx-2">|</span>
            {new Date(post.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          <div className="prose prose-sm max-w-none border-t-2 border-black pt-4 mt-4 whitespace-pre-wrap">
            {post.content}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

**Step 2: Create event detail page**

Same structure but add event-specific metadata display (date, location, optional map). File: `app/[community]/community/events/[id]/page.tsx`. Show the event date prominently, location with MapPin icon. If `location_coords` exist, consider showing a small static map.

**Step 3: Create job detail page**

Same structure but add job-specific metadata (category, salary, contact). Show a WhatsApp/phone/email CTA button based on `contact_method`. File: `app/[community]/community/jobs/[id]/page.tsx`.

**Step 4: Commit**

```bash
git add app/[community]/community/announcements/[id]/ app/[community]/community/events/[id]/ app/[community]/community/jobs/[id]/
git commit -m "feat: add detail pages for announcements, events, and jobs"
```

---

## Task 9: Post Creation Form

**Files:**
- Create: `components/community/post-form.tsx`
- Create: `app/[community]/community/announcements/new/page.tsx`
- Create: `app/[community]/community/events/new/page.tsx`
- Create: `app/[community]/community/jobs/new/page.tsx`

**Step 1: Create unified post form component `components/community/post-form.tsx`**

This is a `'use client'` component. Follow the pattern from the business registration form. Uses `brutalist-input` and `brutalist-button` classes. Form fields vary by `type` prop:

- All types: title, content, image_url (optional)
- Event: date, end_date (optional), location
- Job: category (select), salary_range (optional), contact_method (select), contact_value

On submit: POST to `/api/community/posts`, show toast success "Tu publicacion fue enviada para revision", redirect to community hub.

Require authentication — if not logged in, redirect to `/auth/login?returnUrl=...`.

**Step 2: Create `/new` pages for each type**

Each is a thin wrapper:

```tsx
// app/[community]/community/announcements/new/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PostForm } from '@/components/community/post-form'
import { Breadcrumbs } from '@/components/shared/breadcrumbs'

export const metadata = { title: 'Nuevo Anuncio | BarrioRed' }

export default async function NewAnnouncementPage({ params }: { params: Promise<{ community: string }> }) {
  const { community: slug } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/auth/login?returnUrl=/${slug}/community/announcements/new`)

  const { data: community } = await supabase
    .from('communities').select('id, name').eq('slug', slug).single()
  if (!community) return null

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <Breadcrumbs items={[
        { label: community.name, href: `/${slug}` },
        { label: 'Comunidad', href: `/${slug}/community` },
        { label: 'Nuevo Anuncio', active: true },
      ]} />
      <h1 className="text-4xl font-heading font-black uppercase italic tracking-tighter mb-8">
        Nuevo <span className="text-primary">Anuncio</span>
      </h1>
      <PostForm type="announcement" communityId={community.id} communitySlug={slug} />
    </div>
  )
}
```

Same pattern for events/new and jobs/new pages, changing `type` prop to `'event'` or `'job'`.

**Step 3: Commit**

```bash
git add components/community/post-form.tsx app/[community]/community/announcements/new/ app/[community]/community/events/new/ app/[community]/community/jobs/new/
git commit -m "feat: add post creation form and new post pages for all types"
```

---

## Task 10: Alerts & Services Pages

**Files:**
- Create: `app/[community]/community/alerts/page.tsx`
- Create: `app/[community]/community/services/page.tsx`

**Step 1: Create alerts page**

Display all active alerts for the community. Follow directory page pattern.

```tsx
// app/[community]/community/alerts/page.tsx
import { createClient } from '@/lib/supabase/server'
import { AlertCard } from '@/components/community/alert-card'
import { Breadcrumbs } from '@/components/shared/breadcrumbs'

export const metadata = { title: 'Alertas | BarrioRed' }

export default async function AlertsPage({ params }: { params: Promise<{ community: string }> }) {
  const { community: slug } = await params
  const supabase = await createClient()

  const { data: community } = await supabase
    .from('communities').select('id, name').eq('slug', slug).single()
  if (!community) return null

  const { data: alerts } = await supabase
    .from('community_alerts')
    .select('*')
    .eq('community_id', community.id)
    .order('is_active', { ascending: false })
    .order('created_at', { ascending: false })

  const active = alerts?.filter(a => a.is_active) ?? []
  const past = alerts?.filter(a => !a.is_active) ?? []

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <Breadcrumbs items={[
        { label: community.name, href: `/${slug}` },
        { label: 'Comunidad', href: `/${slug}/community` },
        { label: 'Alertas', active: true },
      ]} />
      <h1 className="text-5xl font-heading font-black uppercase tracking-tighter italic mb-8">
        Alertas <span className="text-primary italic">del Barrio</span>
      </h1>

      {active.length > 0 && (
        <div className="space-y-3 mb-10">
          <h2 className="text-sm font-black uppercase tracking-widest text-primary">Activas</h2>
          {active.map(a => <AlertCard key={a.id} alert={a} />)}
        </div>
      )}

      {past.length > 0 && (
        <div className="space-y-3 opacity-60">
          <h2 className="text-sm font-black uppercase tracking-widest text-black/40">Pasadas</h2>
          {past.map(a => <AlertCard key={a.id} alert={a} />)}
        </div>
      )}

      {(alerts?.length ?? 0) === 0 && (
        <div className="text-center py-20 border-4 border-dashed border-black bg-white/50">
          <p className="text-2xl font-black uppercase italic tracking-tighter text-black/40">Sin alertas</p>
        </div>
      )}
    </div>
  )
}
```

**Step 2: Create services directory page**

```tsx
// app/[community]/community/services/page.tsx
import { createClient } from '@/lib/supabase/server'
import { ServiceCard } from '@/components/community/service-card'
import { Breadcrumbs } from '@/components/shared/breadcrumbs'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Siren, HeartPulse, Landmark, Bus, Wrench } from 'lucide-react'

const categoryMeta: Record<string, { label: string; icon: any }> = {
  emergency: { label: 'Emergencias', icon: Siren },
  health: { label: 'Salud', icon: HeartPulse },
  government: { label: 'Gobierno', icon: Landmark },
  transport: { label: 'Transporte', icon: Bus },
  utilities: { label: 'Servicios Publicos', icon: Wrench },
}

export const metadata = { title: 'Servicios | BarrioRed' }

export default async function ServicesPage({
  params,
  searchParams,
}: {
  params: Promise<{ community: string }>
  searchParams: Promise<{ category?: string }>
}) {
  const { community: slug } = await params
  const { category: filterCat } = await searchParams
  const supabase = await createClient()

  const { data: community } = await supabase
    .from('communities').select('id, name').eq('slug', slug).single()
  if (!community) return null

  let query = supabase
    .from('public_services')
    .select('*')
    .eq('community_id', community.id)
    .eq('is_active', true)
    .order('category')
    .order('sort_order')

  if (filterCat) query = query.eq('category', filterCat)

  const { data: services } = await query

  // Group by category
  const grouped = (services ?? []).reduce((acc: Record<string, any[]>, svc) => {
    if (!acc[svc.category]) acc[svc.category] = []
    acc[svc.category].push(svc)
    return acc
  }, {})

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <Breadcrumbs items={[
        { label: community.name, href: `/${slug}` },
        { label: 'Comunidad', href: `/${slug}/community` },
        { label: 'Servicios', active: true },
      ]} />
      <h1 className="text-5xl font-heading font-black uppercase tracking-tighter italic mb-8">
        Servicios y <span className="text-primary italic">Emergencias</span>
      </h1>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2 mb-8">
        <Link href={`/${slug}/community/services`}>
          <Badge variant={!filterCat ? 'default' : 'outline'} className="text-sm px-4 py-1.5">Todos</Badge>
        </Link>
        {Object.entries(categoryMeta).map(([key, { label }]) => (
          <Link key={key} href={`/${slug}/community/services?category=${key}`}>
            <Badge variant={filterCat === key ? 'default' : 'outline'} className="text-sm px-4 py-1.5">{label}</Badge>
          </Link>
        ))}
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-20 border-4 border-dashed border-black bg-white/50">
          <p className="text-2xl font-black uppercase italic tracking-tighter text-black/40">Sin servicios registrados</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([cat, items]) => {
            const meta = categoryMeta[cat]
            const Icon = meta?.icon
            return (
              <div key={cat}>
                <h2 className="text-xl font-black uppercase tracking-tight italic mb-4 flex items-center gap-2">
                  {Icon && <Icon className="h-5 w-5 text-primary" />}
                  {meta?.label ?? cat}
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {items.map((svc: any) => (
                    <ServiceCard key={svc.id} service={svc} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add app/[community]/community/alerts/ app/[community]/community/services/
git commit -m "feat: add alerts and services pages"
```

---

## Task 11: Admin Panel — Community Posts Moderation

**Files:**
- Modify: `app/admin/layout.tsx` (add nav links)
- Create: `app/admin/community/page.tsx`
- Create: `app/admin/community/[id]/page.tsx`
- Create: `app/api/community/posts/[id]/approve/route.ts`
- Create: `app/api/community/posts/[id]/reject/route.ts`

**Step 1: Add nav links to admin layout**

In `app/admin/layout.tsx`, add to the `<nav>` after the existing links:

```tsx
<Link href="/admin/community">
  <Button variant="ghost" size="sm" className="font-black uppercase tracking-widest text-[10px] hover:bg-accent/10 transition-colors">
    <Users className="h-4 w-4 mr-1" /> Comunidad
  </Button>
</Link>
```

Import `Users` from lucide-react.

**Step 2: Create admin community posts page at `app/admin/community/page.tsx`**

Follow the pattern from `app/admin/businesses/page.tsx`. List pending community posts with approve/reject links. Group by type (announcements, events, jobs). Show approved below.

**Step 3: Create approve/reject API routes**

Pattern from existing business approve/reject routes:

```typescript
// app/api/community/posts/[id]/approve/route.ts
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

  const { error } = await supabase
    .from('community_posts')
    .update({ status: 'approved', updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
```

Same for reject route with `status: 'rejected'`.

**Step 4: Create admin review page at `app/admin/community/[id]/page.tsx`**

Follow pattern from `app/admin/businesses/[id]/page.tsx`. Show full post content, metadata, author info, and approve/reject buttons.

**Step 5: Commit**

```bash
git add app/admin/layout.tsx app/admin/community/ app/api/community/posts/[id]/approve/ app/api/community/posts/[id]/reject/
git commit -m "feat: add admin panel for community post moderation"
```

---

## Task 12: Admin — Alerts & Services Management

**Files:**
- Create: `app/admin/alerts/page.tsx`
- Create: `app/admin/services/page.tsx`

**Step 1: Add nav links to admin layout**

Add two more buttons to the admin nav:

```tsx
<Link href="/admin/alerts">
  <Button variant="ghost" size="sm" className="font-black uppercase tracking-widest text-[10px] hover:bg-primary/10 transition-colors">
    <AlertTriangle className="h-4 w-4 mr-1" /> Alertas
  </Button>
</Link>
<Link href="/admin/services">
  <Button variant="ghost" size="sm" className="font-black uppercase tracking-widest text-[10px] hover:bg-secondary/10 transition-colors">
    <Info className="h-4 w-4 mr-1" /> Servicios
  </Button>
</Link>
```

**Step 2: Create alerts management page**

`'use client'` page with:
- List of existing alerts (active/inactive)
- Create new alert form (inline or modal): type select, title, description, severity select, start/end dates
- Toggle active/inactive button per alert
- Delete button per alert

All operations call the `/api/community/alerts` endpoints.

**Step 3: Create services management page**

`'use client'` page with:
- List of existing services grouped by category
- Create new service form: category select, name, description, phone, address, hours
- Edit/delete buttons per service

All operations call the `/api/community/services` endpoints.

**Step 4: Commit**

```bash
git add app/admin/alerts/ app/admin/services/ app/admin/layout.tsx
git commit -m "feat: add admin management pages for alerts and services"
```

---

## Task 13: Enable Navigation

**Files:**
- Modify: `components/layout/top-bar.tsx:12` — change `active: false` to `active: true` for Comunidad
- Modify: `components/layout/bottom-nav.tsx:12` — change `enabled: false` to `enabled: true` for Comunidad
- Modify: `components/home/quick-nav.tsx:20` — change `enabled: false` to `enabled: true` for Comunidad

**Step 1: Update top-bar.tsx**

Change line 12:
```typescript
// From:
{ label: 'Comunidad', icon: Users, path: '/community', active: false },
// To:
{ label: 'Comunidad', icon: Users, path: '/community', active: true },
```

**Step 2: Update bottom-nav.tsx**

Change line 12:
```typescript
// From:
{ label: 'Comunidad', icon: Users, path: '/community', enabled: false },
// To:
{ label: 'Comunidad', icon: Users, path: '/community', enabled: true },
```

**Step 3: Update quick-nav.tsx**

Change line 20:
```typescript
// From:
enabled: false,
// To:
enabled: true,
```

**Step 4: Commit**

```bash
git add components/layout/top-bar.tsx components/layout/bottom-nav.tsx components/home/quick-nav.tsx
git commit -m "feat: enable Comunidad section in navigation"
```

---

## Task 14: Seed Data & Smoke Test

**Step 1: Seed sample data via Supabase MCP**

Insert 2-3 sample alerts, 3-4 sample public services, and a few test community posts (with status 'approved') for the pilot community. Use `mcp__supabase__execute_sql` to run INSERT statements.

**Step 2: Smoke test**

Run `npm run dev` and verify:
- `/{community}/community` — hub page loads with sections
- Navigation shows Comunidad as active (no more "Pronto" badge)
- Alerts appear at the top if any are active
- Each section shows data or empty state
- Links to sub-pages work
- Post creation form loads (requires auth)
- Admin panel shows community nav links
- Admin can approve/reject posts

**Step 3: Run build**

Run: `npm run build` to ensure no TypeScript or build errors.

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "feat: add seed data and fix smoke test issues"
```

---

## Task 15: Final Review & Cleanup

**Step 1: Run security advisors**

Use `mcp__supabase__get_advisors` with type `security` to verify all RLS policies are correct.

**Step 2: Update CLAUDE.md**

Update the roadmap section to mark Phase 3 items as complete (`[x]`).

**Step 3: Final commit**

```bash
git add CLAUDE.md
git commit -m "docs: mark Phase 3 (Community) as complete in roadmap"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Database migration (3 tables + RLS) | Supabase migration |
| 2 | TypeScript types + Zod validations | `lib/types/index.ts`, `lib/validations/community.ts` |
| 3 | API routes — posts | `app/api/community/posts/` |
| 4 | API routes — alerts & services | `app/api/community/alerts/`, `app/api/community/services/` |
| 5 | Card components | `components/community/post-card.tsx`, `alert-card.tsx`, `service-card.tsx` |
| 6 | Community hub page | `app/[community]/community/page.tsx` + 6 section components |
| 7 | List pages (announcements, events, jobs) | 3 pages under `community/` |
| 8 | Detail pages | 3 `[id]/page.tsx` files |
| 9 | Post creation form | `components/community/post-form.tsx` + 3 `/new` pages |
| 10 | Alerts & services pages | 2 pages |
| 11 | Admin — post moderation | Admin community page + approve/reject API |
| 12 | Admin — alerts & services management | 2 admin pages |
| 13 | Enable navigation | 3 file edits (1 line each) |
| 14 | Seed data & smoke test | Manual verification |
| 15 | Final review & cleanup | CLAUDE.md update |
