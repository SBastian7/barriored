# Marketplace Admin Panel Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement admin moderation panel for marketplace classifieds in BarrioRed platform.

**Architecture:** Dedicated admin panel following existing community/reports patterns. Auto-publish classifieds with post-moderation via reports. Strict community isolation via RLS. New marketplace-specific categories (Vendo, Compro, Arriendo, Servicios, Trabajo).

**Tech Stack:** Next.js 16, React 19, TypeScript, Supabase (PostgreSQL, RLS), Tailwind CSS, Radix UI, lucide-react icons

**Design Document:** `docs/plans/2026-03-11-marketplace-admin-design.md`

---

## Task 1: Database Migration - Create Marketplace Tables

**Files:**
- Create: `supabase/migrations/20260311000000_create_marketplace_tables.sql`

**Step 1: Create migration file**

Create the migration file with complete schema:

```sql
-- Create marketplace categories table
CREATE TABLE marketplace_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  icon TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create classifieds table
CREATE TABLE classifieds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES marketplace_categories(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price TEXT,
  images TEXT[],
  whatsapp TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  is_featured BOOLEAN DEFAULT false,
  featured_until TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  sold_at TIMESTAMPTZ,
  flagged_at TIMESTAMPTZ,
  flagged_by UUID REFERENCES profiles(id),
  flagged_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create marketplace user bans table
CREATE TABLE marketplace_user_bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  banned_by UUID NOT NULL REFERENCES profiles(id),
  reason TEXT NOT NULL,
  banned_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);

-- Create indexes for performance
CREATE INDEX idx_classifieds_community_status ON classifieds(community_id, status);
CREATE INDEX idx_classifieds_user ON classifieds(user_id);
CREATE INDEX idx_classifieds_category ON classifieds(category_id);
CREATE INDEX idx_classifieds_activity ON classifieds(last_activity_at);
CREATE INDEX idx_marketplace_bans_user ON marketplace_user_bans(user_id, is_active);

-- Seed marketplace categories
INSERT INTO marketplace_categories (name, slug, icon, description, display_order) VALUES
  ('Vendo', 'vendo', 'ShoppingCart', 'Artículos en venta', 1),
  ('Compro', 'compro', 'ShoppingBag', 'Buscando comprar', 2),
  ('Arriendo', 'arriendo', 'Home', 'Propiedades en arriendo', 3),
  ('Servicios', 'servicios', 'Wrench', 'Servicios ofrecidos', 4),
  ('Trabajo', 'trabajo', 'Briefcase', 'Oportunidades laborales', 5);

-- RLS Policies for classifieds table

-- Enable RLS
ALTER TABLE classifieds ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_user_bans ENABLE ROW LEVEL SECURITY;

-- Users can view active/sold classifieds in their community
CREATE POLICY "Users view own community classifieds"
  ON classifieds FOR SELECT
  USING (
    community_id = (SELECT community_id FROM profiles WHERE id = auth.uid())
    AND status IN ('active', 'sold')
  );

-- Users can insert classifieds if not banned
CREATE POLICY "Users create classifieds if not banned"
  ON classifieds FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND community_id = (SELECT community_id FROM profiles WHERE id = auth.uid())
    AND NOT EXISTS (
      SELECT 1 FROM marketplace_user_bans
      WHERE user_id = auth.uid()
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > NOW())
    )
  );

-- Users can update/delete only their own classifieds
CREATE POLICY "Users update own classifieds"
  ON classifieds FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users delete own classifieds"
  ON classifieds FOR DELETE
  USING (user_id = auth.uid());

-- Moderators can view all classifieds in their community
CREATE POLICY "Moderators view community classifieds"
  ON classifieds FOR SELECT
  USING (
    community_id = (SELECT community_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'moderator')
  );

-- Admins can update any classified in their community
CREATE POLICY "Admins update community classifieds"
  ON classifieds FOR UPDATE
  USING (
    community_id = (SELECT community_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Admins can delete any classified in their community
CREATE POLICY "Admins delete community classifieds"
  ON classifieds FOR DELETE
  USING (
    community_id = (SELECT community_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Super admins can view/edit/delete all classifieds
CREATE POLICY "Super admins manage all classifieds"
  ON classifieds FOR ALL
  USING ((SELECT is_super_admin FROM profiles WHERE id = auth.uid()) = true);

-- Everyone can read marketplace categories
CREATE POLICY "Everyone can view categories"
  ON marketplace_categories FOR SELECT
  TO public
  USING (is_active = true);

-- Only admins can view bans
CREATE POLICY "Admins view bans"
  ON marketplace_user_bans FOR SELECT
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'moderator')
    OR (SELECT is_super_admin FROM profiles WHERE id = auth.uid()) = true
  );

-- Only admins can create bans
CREATE POLICY "Admins create bans"
  ON marketplace_user_bans FOR INSERT
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    OR (SELECT is_super_admin FROM profiles WHERE id = auth.uid()) = true
  );

-- Only admins can update bans (for unbanning)
CREATE POLICY "Admins update bans"
  ON marketplace_user_bans FOR UPDATE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    OR (SELECT is_super_admin FROM profiles WHERE id = auth.uid()) = true
  );
```

**Step 2: Apply migration to local database**

Run: `npx supabase migration up`

Expected: "Applied migration 20260311000000_create_marketplace_tables.sql"

**Step 3: Verify tables created**

Run: `npx supabase db dump --data-only --table marketplace_categories`

Expected: Should show 5 categories (Vendo, Compro, Arriendo, Servicios, Trabajo)

**Step 4: Commit migration**

```bash
git add supabase/migrations/20260311000000_create_marketplace_tables.sql
git commit -m "feat(db): create marketplace tables with RLS policies

- Add marketplace_categories table with 5 default categories
- Add classifieds table with community isolation
- Add marketplace_user_bans table
- Create RLS policies for users, moderators, admins, super admins
- Add performance indexes

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Update TypeScript Database Types

**Files:**
- Modify: `lib/types/database.ts`

**Step 1: Generate fresh types from Supabase**

Run: `npx supabase gen types typescript --local > lib/types/database-new.ts`

Expected: New file with marketplace tables included

**Step 2: Review and merge new types**

Check that the new types include:
- `marketplace_categories` table types
- `classifieds` table types
- `marketplace_user_bans` table types

**Step 3: Replace old database.ts with new types**

Run: `mv lib/types/database-new.ts lib/types/database.ts`

**Step 4: Add helper types for classifieds**

Add to end of `lib/types/database.ts`:

```typescript
// Classified with relations
export interface ClassifiedWithRelations {
  id: string
  community_id: string
  user_id: string
  category_id: string
  title: string
  description: string
  price: string | null
  images: string[] | null
  whatsapp: string
  status: 'active' | 'sold' | 'archived' | 'flagged' | 'removed'
  is_featured: boolean
  featured_until: string | null
  last_activity_at: string
  archived_at: string | null
  sold_at: string | null
  flagged_at: string | null
  flagged_by: string | null
  flagged_reason: string | null
  created_at: string
  updated_at: string
  profiles: {
    id: string
    full_name: string | null
    avatar_url: string | null
  }
  marketplace_categories: {
    id: string
    name: string
    slug: string
    icon: string
  }
  communities: {
    id: string
    name: string
    slug: string
  }
}

export interface MarketplaceBan {
  id: string
  community_id: string
  user_id: string
  banned_by: string
  reason: string
  banned_at: string
  expires_at: string | null
  is_active: boolean
}
```

**Step 5: Verify types compile**

Run: `npm run build`

Expected: No TypeScript errors

**Step 6: Commit type updates**

```bash
git add lib/types/database.ts
git commit -m "feat(types): add marketplace database types

- Regenerate types from Supabase schema
- Add ClassifiedWithRelations helper type
- Add MarketplaceBan type

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Create API Route - List Classifieds

**Files:**
- Create: `app/api/admin/marketplace/route.ts`

**Step 1: Create API route for listing classifieds**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  // Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  // Get user profile to check role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_super_admin, community_id')
    .eq('id', user.id)
    .single<{ role: string; is_super_admin: boolean; community_id: string }>()

  if (!profile || (profile.role !== 'admin' && !profile.is_super_admin)) {
    return NextResponse.json(
      { error: 'No tienes permisos para realizar esta acción' },
      { status: 403 }
    )
  }

  // Parse query parameters
  const searchParams = request.nextUrl.searchParams
  const category = searchParams.get('category') || 'all'
  const status = searchParams.get('status') || 'all'
  const search = searchParams.get('search') || ''
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = parseInt(searchParams.get('offset') || '0')

  // Build query
  let query = supabase
    .from('classifieds')
    .select(
      `
      *,
      profiles(id, full_name, avatar_url),
      marketplace_categories(id, name, slug, icon),
      communities(id, name, slug)
    `,
      { count: 'exact' }
    )

  // Filter by community (unless super admin viewing all)
  if (!profile.is_super_admin) {
    query = query.eq('community_id', profile.community_id)
  } else if (searchParams.get('community_id')) {
    query = query.eq('community_id', searchParams.get('community_id'))
  }

  // Filter by category
  if (category !== 'all') {
    query = query.eq('marketplace_categories.slug', category)
  }

  // Filter by status
  if (status !== 'all') {
    query = query.eq('status', status)
  }

  // Search in title and description
  if (search) {
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
  }

  // Order and paginate
  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  const { data: classifieds, error, count } = await query

  if (error) {
    console.error('Error fetching classifieds:', error)
    return NextResponse.json(
      { error: 'Error al obtener clasificados' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    classifieds,
    total: count || 0,
    page: Math.floor(offset / limit) + 1,
    limit,
  })
}
```

**Step 2: Test API route manually**

Start dev server: `npm run dev`

Test in browser or curl:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/admin/marketplace?limit=10"
```

Expected: JSON response with classifieds array (empty initially)

**Step 3: Commit API route**

```bash
git add app/api/admin/marketplace/route.ts
git commit -m "feat(api): add marketplace listing endpoint

- GET /api/admin/marketplace with filters
- Support category, status, search, pagination
- Community isolation for admins, cross-community for super admins
- Returns classifieds with user, category, community relations

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Create API Route - Get Single Classified

**Files:**
- Create: `app/api/admin/marketplace/[id]/route.ts`

**Step 1: Create GET/PATCH/DELETE route for single classified**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_super_admin, community_id')
    .eq('id', user.id)
    .single<{ role: string; is_super_admin: boolean; community_id: string }>()

  if (!profile || (profile.role !== 'admin' && profile.role !== 'moderator' && !profile.is_super_admin)) {
    return NextResponse.json({ error: 'No tienes permisos' }, { status: 403 })
  }

  const { data: classified, error } = await supabase
    .from('classifieds')
    .select(
      `
      *,
      profiles(id, full_name, avatar_url),
      marketplace_categories(id, name, slug, icon),
      communities(id, name, slug)
    `
    )
    .eq('id', id)
    .single()

  if (error || !classified) {
    return NextResponse.json(
      { error: 'Clasificado no encontrado' },
      { status: 404 }
    )
  }

  // Verify community access
  if (
    !profile.is_super_admin &&
    classified.community_id !== profile.community_id
  ) {
    return NextResponse.json(
      { error: 'No puedes ver clasificados de otra comunidad' },
      { status: 403 }
    )
  }

  return NextResponse.json({ classified })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_super_admin, community_id')
    .eq('id', user.id)
    .single<{ role: string; is_super_admin: boolean; community_id: string }>()

  if (!profile || (profile.role !== 'admin' && !profile.is_super_admin)) {
    return NextResponse.json({ error: 'No tienes permisos' }, { status: 403 })
  }

  // Get current classified to verify community
  const { data: existing } = await supabase
    .from('classifieds')
    .select('community_id')
    .eq('id', id)
    .single<{ community_id: string }>()

  if (!existing) {
    return NextResponse.json(
      { error: 'Clasificado no encontrado' },
      { status: 404 }
    )
  }

  if (
    !profile.is_super_admin &&
    existing.community_id !== profile.community_id
  ) {
    return NextResponse.json(
      { error: 'No puedes editar clasificados de otra comunidad' },
      { status: 403 }
    )
  }

  const body = await request.json()
  const {
    status,
    title,
    description,
    price,
    category_id,
    whatsapp,
    images,
  } = body

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (status !== undefined) {
    updateData.status = status
    if (status === 'sold') updateData.sold_at = new Date().toISOString()
    if (status === 'archived') updateData.archived_at = new Date().toISOString()
  }
  if (title !== undefined) updateData.title = title
  if (description !== undefined) updateData.description = description
  if (price !== undefined) updateData.price = price
  if (category_id !== undefined) updateData.category_id = category_id
  if (whatsapp !== undefined) updateData.whatsapp = whatsapp
  if (images !== undefined) updateData.images = images

  const { data: updated, error } = await supabase
    .from('classifieds')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating classified:', error)
    return NextResponse.json(
      { error: 'Error al actualizar clasificado' },
      { status: 500 }
    )
  }

  // Log to audit trail
  await supabase.from('audit_logs').insert({
    community_id: existing.community_id,
    user_id: user.id,
    action: 'update_classified',
    entity_type: 'classified',
    entity_id: id,
    new_data: updateData,
    metadata: { admin_role: profile.role },
  } as never)

  return NextResponse.json({ classified: updated })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_super_admin, community_id')
    .eq('id', user.id)
    .single<{ role: string; is_super_admin: boolean; community_id: string }>()

  if (!profile || (profile.role !== 'admin' && !profile.is_super_admin)) {
    return NextResponse.json({ error: 'No tienes permisos' }, { status: 403 })
  }

  const { data: existing } = await supabase
    .from('classifieds')
    .select('community_id')
    .eq('id', id)
    .single<{ community_id: string }>()

  if (!existing) {
    return NextResponse.json(
      { error: 'Clasificado no encontrado' },
      { status: 404 }
    )
  }

  if (
    !profile.is_super_admin &&
    existing.community_id !== profile.community_id
  ) {
    return NextResponse.json(
      { error: 'No puedes eliminar clasificados de otra comunidad' },
      { status: 403 }
    )
  }

  // Soft delete - set status to removed
  const { error } = await supabase
    .from('classifieds')
    .update({ status: 'removed', updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    console.error('Error deleting classified:', error)
    return NextResponse.json(
      { error: 'Error al eliminar clasificado' },
      { status: 500 }
    )
  }

  // Log to audit trail
  await supabase.from('audit_logs').insert({
    community_id: existing.community_id,
    user_id: user.id,
    action: 'delete_classified',
    entity_type: 'classified',
    entity_id: id,
    metadata: { admin_role: profile.role },
  } as never)

  return NextResponse.json({ success: true })
}
```

**Step 2: Test the endpoints**

Create a test classified in database first (via SQL or UI later), then test:

```bash
# Get single classified
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/admin/marketplace/CLASSIFIED_ID"

# Update classified
curl -X PATCH -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"sold"}' \
  "http://localhost:3000/api/admin/marketplace/CLASSIFIED_ID"

# Delete classified
curl -X DELETE -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/admin/marketplace/CLASSIFIED_ID"
```

Expected: Proper JSON responses

**Step 3: Commit single classified routes**

```bash
git add app/api/admin/marketplace/[id]/route.ts
git commit -m "feat(api): add classified detail/update/delete endpoints

- GET /api/admin/marketplace/[id] - fetch single classified
- PATCH /api/admin/marketplace/[id] - update classified fields
- DELETE /api/admin/marketplace/[id] - soft delete (set status=removed)
- All actions logged to audit_logs
- Community permission checks

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Create API Routes - Flag and Ban

**Files:**
- Create: `app/api/admin/marketplace/[id]/flag/route.ts`
- Create: `app/api/admin/marketplace/[id]/ban-user/route.ts`

**Step 1: Create flag/unflag route**

Create `app/api/admin/marketplace/[id]/flag/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_super_admin, community_id')
    .eq('id', user.id)
    .single<{ role: string; is_super_admin: boolean; community_id: string }>()

  if (!profile || (profile.role !== 'admin' && !profile.is_super_admin)) {
    return NextResponse.json({ error: 'No tienes permisos' }, { status: 403 })
  }

  const body = await request.json()
  const { reason } = body

  if (!reason || reason.trim() === '') {
    return NextResponse.json(
      { error: 'Razón requerida' },
      { status: 400 }
    )
  }

  const { data: existing } = await supabase
    .from('classifieds')
    .select('community_id, user_id')
    .eq('id', id)
    .single<{ community_id: string; user_id: string }>()

  if (!existing) {
    return NextResponse.json(
      { error: 'Clasificado no encontrado' },
      { status: 404 }
    )
  }

  if (
    !profile.is_super_admin &&
    existing.community_id !== profile.community_id
  ) {
    return NextResponse.json(
      { error: 'No puedes marcar clasificados de otra comunidad' },
      { status: 403 }
    )
  }

  const { error } = await supabase
    .from('classifieds')
    .update({
      status: 'flagged',
      flagged_at: new Date().toISOString(),
      flagged_by: user.id,
      flagged_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    console.error('Error flagging classified:', error)
    return NextResponse.json(
      { error: 'Error al marcar clasificado' },
      { status: 500 }
    )
  }

  // Create content report
  await supabase.from('content_reports').insert({
    community_id: existing.community_id,
    reporter_id: user.id,
    reported_entity_type: 'classified',
    reported_entity_id: id,
    reason: 'inappropriate',
    description: reason,
    status: 'pending',
  } as never)

  // Log to audit trail
  await supabase.from('audit_logs').insert({
    community_id: existing.community_id,
    user_id: user.id,
    action: 'flag_classified',
    entity_type: 'classified',
    entity_id: id,
    metadata: { reason },
  } as never)

  return NextResponse.json({ success: true })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_super_admin, community_id')
    .eq('id', user.id)
    .single<{ role: string; is_super_admin: boolean; community_id: string }>()

  if (!profile || (profile.role !== 'admin' && !profile.is_super_admin)) {
    return NextResponse.json({ error: 'No tienes permisos' }, { status: 403 })
  }

  const { data: existing } = await supabase
    .from('classifieds')
    .select('community_id')
    .eq('id', id)
    .single<{ community_id: string }>()

  if (!existing) {
    return NextResponse.json(
      { error: 'Clasificado no encontrado' },
      { status: 404 }
    )
  }

  if (
    !profile.is_super_admin &&
    existing.community_id !== profile.community_id
  ) {
    return NextResponse.json({ error: 'No tienes permisos' }, { status: 403 })
  }

  const { error } = await supabase
    .from('classifieds')
    .update({
      status: 'active',
      flagged_at: null,
      flagged_by: null,
      flagged_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    console.error('Error unflagging classified:', error)
    return NextResponse.json(
      { error: 'Error al desmarcar clasificado' },
      { status: 500 }
    )
  }

  // Log to audit trail
  await supabase.from('audit_logs').insert({
    community_id: existing.community_id,
    user_id: user.id,
    action: 'unflag_classified',
    entity_type: 'classified',
    entity_id: id,
  } as never)

  return NextResponse.json({ success: true })
}
```

**Step 2: Create ban user route**

Create `app/api/admin/marketplace/[id]/ban-user/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_super_admin, community_id')
    .eq('id', user.id)
    .single<{ role: string; is_super_admin: boolean; community_id: string }>()

  if (!profile || (profile.role !== 'admin' && !profile.is_super_admin)) {
    return NextResponse.json({ error: 'No tienes permisos' }, { status: 403 })
  }

  const body = await request.json()
  const { reason, expires_at } = body

  if (!reason || reason.trim() === '') {
    return NextResponse.json({ error: 'Razón requerida' }, { status: 400 })
  }

  // Get classified to find user
  const { data: classified } = await supabase
    .from('classifieds')
    .select('user_id, community_id')
    .eq('id', id)
    .single<{ user_id: string; community_id: string }>()

  if (!classified) {
    return NextResponse.json(
      { error: 'Clasificado no encontrado' },
      { status: 404 }
    )
  }

  if (
    !profile.is_super_admin &&
    classified.community_id !== profile.community_id
  ) {
    return NextResponse.json({ error: 'No tienes permisos' }, { status: 403 })
  }

  // Create ban record
  const { error: banError } = await supabase
    .from('marketplace_user_bans')
    .insert({
      community_id: classified.community_id,
      user_id: classified.user_id,
      banned_by: user.id,
      reason,
      expires_at: expires_at || null,
      is_active: true,
    } as never)

  if (banError) {
    console.error('Error creating ban:', banError)
    return NextResponse.json(
      { error: 'Error al suspender usuario' },
      { status: 500 }
    )
  }

  // Remove all user's active classifieds
  const { data: userClassifieds, error: fetchError } = await supabase
    .from('classifieds')
    .select('id')
    .eq('user_id', classified.user_id)
    .eq('community_id', classified.community_id)
    .in('status', ['active', 'flagged'])

  if (!fetchError && userClassifieds) {
    for (const c of userClassifieds) {
      await supabase
        .from('classifieds')
        .update({ status: 'removed', updated_at: new Date().toISOString() })
        .eq('id', c.id)

      // Log each removal
      await supabase.from('audit_logs').insert({
        community_id: classified.community_id,
        user_id: user.id,
        action: 'remove_classified_on_ban',
        entity_type: 'classified',
        entity_id: c.id,
        metadata: { banned_user_id: classified.user_id },
      } as never)
    }
  }

  // Log ban action
  await supabase.from('audit_logs').insert({
    community_id: classified.community_id,
    user_id: user.id,
    action: 'ban_marketplace_user',
    entity_type: 'user',
    entity_id: classified.user_id,
    metadata: { reason, expires_at, classifieds_removed: userClassifieds?.length || 0 },
  } as never)

  return NextResponse.json({
    success: true,
    classifieds_removed: userClassifieds?.length || 0,
  })
}
```

**Step 3: Test flag and ban routes**

```bash
# Flag classified
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Contenido inapropiado"}' \
  "http://localhost:3000/api/admin/marketplace/CLASSIFIED_ID/flag"

# Unflag
curl -X DELETE -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/admin/marketplace/CLASSIFIED_ID/flag"

# Ban user
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Spam repetido","expires_at":null}' \
  "http://localhost:3000/api/admin/marketplace/CLASSIFIED_ID/ban-user"
```

Expected: Success responses

**Step 4: Commit flag and ban routes**

```bash
git add app/api/admin/marketplace/[id]/flag/route.ts app/api/admin/marketplace/[id]/ban-user/route.ts
git commit -m "feat(api): add flag and ban user endpoints

- POST /api/admin/marketplace/[id]/flag - flag classified
- DELETE /api/admin/marketplace/[id]/flag - remove flag
- POST /api/admin/marketplace/[id]/ban-user - ban user from marketplace
- Banning removes all user's active classifieds
- All actions logged to audit_logs

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Create Reusable Components

**Files:**
- Create: `components/marketplace/classified-card.tsx`
- Create: `components/marketplace/classified-status-badge.tsx`
- Create: `components/marketplace/marketplace-filters.tsx`

**Step 1: Create ClassifiedStatusBadge component**

Create `components/marketplace/classified-status-badge.tsx`:

```typescript
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, Clock, Flag, Archive } from 'lucide-react'

interface ClassifiedStatusBadgeProps {
  status: 'active' | 'sold' | 'archived' | 'flagged' | 'removed'
}

export function ClassifiedStatusBadge({ status }: ClassifiedStatusBadgeProps) {
  const statusConfig = {
    active: {
      label: 'ACTIVO',
      className: 'bg-emerald-500 text-white border-black',
      icon: CheckCircle,
    },
    sold: {
      label: 'VENDIDO',
      className: 'bg-blue-500 text-white border-black',
      icon: CheckCircle,
    },
    archived: {
      label: 'ARCHIVADO',
      className: 'bg-gray-400 text-white border-black',
      icon: Archive,
    },
    flagged: {
      label: 'MARCADO',
      className: 'bg-red-500 text-white border-black',
      icon: Flag,
    },
    removed: {
      label: 'ELIMINADO',
      className: 'bg-gray-600 text-white border-black',
      icon: XCircle,
    },
  }

  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <Badge className={`${config.className} rounded-none text-[10px]`}>
      <Icon className="h-2.5 w-2.5 mr-0.5" />
      {config.label}
    </Badge>
  )
}
```

**Step 2: Create ClassifiedCard component**

Create `components/marketplace/classified-card.tsx`:

```typescript
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye, Check, Archive, Trash2 } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { ClassifiedStatusBadge } from './classified-status-badge'
import type { ClassifiedWithRelations } from '@/lib/types/database'

interface ClassifiedCardProps {
  classified: ClassifiedWithRelations
  onMarkSold?: (id: string) => void
  onArchive?: (id: string) => void
  onDelete?: (id: string) => void
}

export function ClassifiedCard({
  classified,
  onMarkSold,
  onArchive,
  onDelete,
}: ClassifiedCardProps) {
  const thumbnail = classified.images?.[0] || '/placeholder-image.png'

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
              <ClassifiedStatusBadge status={classified.status} />
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
              href={`/admin/marketplace/${classified.id}`}
              className="flex-1 flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest text-accent hover:bg-black/5 transition-colors p-4"
            >
              <Eye className="h-3 w-3" /> Ver Detalle
            </Link>

            {classified.status === 'active' && onMarkSold && (
              <button
                onClick={() => onMarkSold(classified.id)}
                className="flex-1 flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest text-blue-600 hover:bg-blue-50 transition-colors p-4"
              >
                <Check className="h-3 w-3" /> Marcar Vendido
              </button>
            )}

            {classified.status === 'active' && onArchive && (
              <button
                onClick={() => onArchive(classified.id)}
                className="flex-1 flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest text-gray-600 hover:bg-gray-50 transition-colors p-4"
              >
                <Archive className="h-3 w-3" /> Archivar
              </button>
            )}

            {onDelete && (
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

**Step 3: Create MarketplaceFilters component**

Create `components/marketplace/marketplace-filters.tsx`:

```typescript
'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Filter, X } from 'lucide-react'

interface MarketplaceFiltersProps {
  filters: {
    category: string
    status: string
  }
  onFilterChange: (key: string, value: string) => void
  onClearFilters: () => void
  totalCount: number
  filteredCount: number
}

export function MarketplaceFilters({
  filters,
  onFilterChange,
  onClearFilters,
  totalCount,
  filteredCount,
}: MarketplaceFiltersProps) {
  const hasActiveFilters = filters.category !== 'all' || filters.status !== 'all'

  return (
    <section className="flex flex-wrap items-center gap-4 p-6 border-4 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      <div className="flex items-center gap-2">
        <Filter className="h-5 w-5 text-primary" />
        <span className="font-black uppercase tracking-widest text-[10px] text-black/40">
          Filtros:
        </span>
      </div>

      <div className="flex items-center gap-2">
        <label className="font-black uppercase tracking-widest text-[10px] text-black/60">
          Categoría:
        </label>
        <Select
          value={filters.category}
          onValueChange={(v) => onFilterChange('category', v)}
        >
          <SelectTrigger className="brutalist-input w-40 h-10">
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

      <div className="flex items-center gap-2">
        <label className="font-black uppercase tracking-widest text-[10px] text-black/60">
          Estado:
        </label>
        <Select
          value={filters.status}
          onValueChange={(v) => onFilterChange('status', v)}
        >
          <SelectTrigger className="brutalist-input w-40 h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-2 border-black rounded-none">
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Activo</SelectItem>
            <SelectItem value="sold">Vendido</SelectItem>
            <SelectItem value="archived">Archivado</SelectItem>
            <SelectItem value="flagged">Marcado</SelectItem>
            <SelectItem value="removed">Eliminado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {hasActiveFilters && (
        <Button
          onClick={onClearFilters}
          variant="outline"
          size="sm"
          className="brutalist-button h-10 gap-2"
        >
          <X className="h-4 w-4" /> Limpiar Filtros
        </Button>
      )}

      <div className="ml-auto text-[10px] font-black uppercase tracking-widest text-black/40">
        Mostrando {filteredCount} de {totalCount} clasificados
      </div>
    </section>
  )
}
```

**Step 4: Verify components compile**

Run: `npm run build`

Expected: No TypeScript errors

**Step 5: Commit components**

```bash
git add components/marketplace/
git commit -m "feat(ui): add marketplace reusable components

- ClassifiedStatusBadge - color-coded status badges
- ClassifiedCard - brutalist card for listing grid
- MarketplaceFilters - filter controls section
- Follow neo-brutalist tropical design system

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Create Main Admin Marketplace Page

**Files:**
- Create: `app/admin/marketplace/page.tsx`

**Step 1: Create main marketplace admin page**

```typescript
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { ClassifiedCard } from '@/components/marketplace/classified-card'
import { MarketplaceFilters } from '@/components/marketplace/marketplace-filters'
import type { ClassifiedWithRelations } from '@/lib/types/database'

export default function AdminMarketplacePage() {
  const supabase = createClient()
  const [classifieds, setClassifieds] = useState<ClassifiedWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    category: 'all',
    status: 'all',
  })
  const [stats, setStats] = useState({
    active: 0,
    soldThisWeek: 0,
    flagged: 0,
    bannedUsers: 0,
  })

  useEffect(() => {
    fetchClassifieds()
    fetchStats()
  }, [filters])

  async function fetchClassifieds() {
    setLoading(true)

    const params = new URLSearchParams()
    if (filters.category !== 'all') params.append('category', filters.category)
    if (filters.status !== 'all') params.append('status', filters.status)

    const response = await fetch(`/api/admin/marketplace?${params.toString()}`)
    const data = await response.json()

    if (response.ok) {
      setClassifieds(data.classifieds || [])
    } else {
      toast.error(data.error || 'Error al cargar clasificados')
    }

    setLoading(false)
  }

  async function fetchStats() {
    // Fetch active count
    const { count: activeCount } = await supabase
      .from('classifieds')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    // Fetch sold this week
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const { count: soldCount } = await supabase
      .from('classifieds')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'sold')
      .gte('sold_at', weekAgo.toISOString())

    // Fetch flagged count
    const { count: flaggedCount } = await supabase
      .from('classifieds')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'flagged')

    // Fetch banned users count
    const { count: bannedCount } = await supabase
      .from('marketplace_user_bans')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)

    setStats({
      active: activeCount || 0,
      soldThisWeek: soldCount || 0,
      flagged: flaggedCount || 0,
      bannedUsers: bannedCount || 0,
    })
  }

  async function handleMarkSold(id: string) {
    const response = await fetch(`/api/admin/marketplace/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'sold' }),
    })

    if (response.ok) {
      toast.success('Clasificado marcado como vendido')
      fetchClassifieds()
      fetchStats()
    } else {
      const data = await response.json()
      toast.error(data.error || 'Error al actualizar')
    }
  }

  async function handleArchive(id: string) {
    const response = await fetch(`/api/admin/marketplace/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'archived' }),
    })

    if (response.ok) {
      toast.success('Clasificado archivado')
      fetchClassifieds()
      fetchStats()
    } else {
      const data = await response.json()
      toast.error(data.error || 'Error al archivar')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Estás seguro de eliminar este clasificado?')) return

    const response = await fetch(`/api/admin/marketplace/${id}`, {
      method: 'DELETE',
    })

    if (response.ok) {
      toast.success('Clasificado eliminado')
      fetchClassifieds()
      fetchStats()
    } else {
      const data = await response.json()
      toast.error(data.error || 'Error al eliminar')
    }
  }

  function handleFilterChange(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  function handleClearFilters() {
    setFilters({ category: 'all', status: 'all' })
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-12">
      <header className="space-y-2">
        <h1 className="text-4xl font-heading font-black uppercase italic tracking-tighter">
          Moderación de <span className="text-primary">Marketplace</span>
        </h1>
        <p className="font-bold text-black/60">
          Gestiona los clasificados de la comunidad.
        </p>
      </header>

      {/* Stats Strip */}
      <div className="flex divide-x-4 divide-black border-4 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex-1 p-6 text-center">
          <p className="text-4xl font-black text-emerald-600">{stats.active}</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mt-1">
            Activos
          </p>
        </div>
        <div className="flex-1 p-6 text-center">
          <p className="text-4xl font-black text-blue-600">
            {stats.soldThisWeek}
          </p>
          <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mt-1">
            Vendidos (7 días)
          </p>
        </div>
        <div className="flex-1 p-6 text-center">
          <p className="text-4xl font-black text-red-600">{stats.flagged}</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mt-1">
            Marcados
          </p>
        </div>
        <div className="flex-1 p-6 text-center">
          <p className="text-4xl font-black text-gray-600">
            {stats.bannedUsers}
          </p>
          <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mt-1">
            Usuarios Suspendidos
          </p>
        </div>
      </div>

      {/* Filters */}
      <MarketplaceFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        totalCount={classifieds.length}
        filteredCount={classifieds.length}
      />

      {/* Classifieds Grid */}
      <section className="space-y-6">
        {classifieds.length === 0 ? (
          <Card className="border-4 border-black border-dashed bg-white shadow-none py-12 text-center">
            <p className="font-bold text-black/30 uppercase tracking-widest">
              No hay clasificados que coincidan con los filtros
            </p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {classifieds.map((classified) => (
              <ClassifiedCard
                key={classified.id}
                classified={classified}
                onMarkSold={handleMarkSold}
                onArchive={handleArchive}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
```

**Step 2: Test the page**

Run dev server: `npm run dev`

Navigate to: `http://localhost:3000/admin/marketplace`

Expected: Page loads with stats strip, filters, and empty state (no classifieds yet)

**Step 3: Commit main page**

```bash
git add app/admin/marketplace/page.tsx
git commit -m "feat(admin): add marketplace main moderation page

- Stats strip with active/sold/flagged/banned counts
- Filter controls for category and status
- Classified cards grid with quick actions
- Mark sold, archive, delete functionality
- Toast notifications for actions

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Add Marketplace to Admin Sidebar

**Files:**
- Modify: `components/admin/collapsible-sidebar.tsx`

**Step 1: Add marketplace navigation item**

Find the `navItems` array around line 26 and add marketplace entry after services:

```typescript
const navItems = [
  { href: '/admin', label: 'Panel', icon: BarChart3 },
  { href: '/admin/businesses', label: 'Negocios', icon: Building2 },
  { href: '/admin/users', label: 'Usuarios', icon: Users },
  { href: '/admin/categories', label: 'Categorías', icon: FolderTree },
  { href: '/admin/community', label: 'Comunidad', icon: MessageSquare },
  { href: '/admin/alerts', label: 'Alertas', icon: Bell },
  { href: '/admin/reports', label: 'Reportes', icon: Flag },
  { href: '/admin/services', label: 'Servicios', icon: Briefcase },
  { href: '/admin/marketplace', label: 'Marketplace', icon: ShoppingBag }, // ADD THIS LINE
  { href: '/admin/statistics', label: 'Estadísticas', icon: BarChart3 },
  { href: '/admin/engagement', label: 'Engagement', icon: Activity },
  { href: '/admin/communities', label: 'Comunidades', icon: Globe, roles: ['super_admin'], divider: true },
  { href: '/admin/logs', label: 'Logs', icon: FileText },
  { href: '/admin/tools', label: 'Herramientas', icon: Settings },
]
```

**Step 2: Add ShoppingBag import**

At the top of the file, add `ShoppingBag` to the lucide-react imports:

```typescript
import {
  BarChart3,
  Building2,
  Users,
  FolderTree,
  Bell,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Flag,
  Briefcase,
  Activity,
  FileText,
  Globe,
  Settings,
  ShoppingBag, // ADD THIS
} from 'lucide-react'
```

**Step 3: Test navigation**

Run dev server and navigate to admin panel.

Expected: "Marketplace" item appears in sidebar after "Servicios"

**Step 4: Commit sidebar update**

```bash
git add components/admin/collapsible-sidebar.tsx
git commit -m "feat(admin): add marketplace to sidebar navigation

- Add Marketplace nav item with ShoppingBag icon
- Positioned after Services in navigation order

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Create Classified Detail Page (Admin)

**Files:**
- Create: `app/admin/marketplace/[id]/page.tsx`

**Step 1: Create classified detail/edit page**

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, ArrowLeft, Edit, Save, X, Flag, Ban, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'
import Link from 'next/link'
import { ClassifiedStatusBadge } from '@/components/marketplace/classified-status-badge'
import type { ClassifiedWithRelations } from '@/lib/types/database'

export default function AdminClassifiedDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const supabase = createClient()

  const [classified, setClassified] = useState<ClassifiedWithRelations | null>(null)
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState({
    title: '',
    description: '',
    price: '',
    whatsapp: '',
  })

  useEffect(() => {
    fetchClassified()
  }, [id])

  async function fetchClassified() {
    setLoading(true)
    const response = await fetch(`/api/admin/marketplace/${id}`)
    const data = await response.json()

    if (response.ok && data.classified) {
      setClassified(data.classified)
      setEditData({
        title: data.classified.title,
        description: data.classified.description,
        price: data.classified.price || '',
        whatsapp: data.classified.whatsapp,
      })
    } else {
      toast.error(data.error || 'Error al cargar clasificado')
      router.push('/admin/marketplace')
    }

    setLoading(false)
  }

  async function handleSaveEdit() {
    const response = await fetch(`/api/admin/marketplace/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editData),
    })

    if (response.ok) {
      toast.success('Clasificado actualizado')
      setEditMode(false)
      fetchClassified()
    } else {
      const data = await response.json()
      toast.error(data.error || 'Error al actualizar')
    }
  }

  async function handleStatusChange(newStatus: string) {
    const response = await fetch(`/api/admin/marketplace/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })

    if (response.ok) {
      toast.success('Estado actualizado')
      fetchClassified()
    } else {
      const data = await response.json()
      toast.error(data.error || 'Error al actualizar estado')
    }
  }

  async function handleFlag() {
    const reason = prompt('Razón para marcar este clasificado:')
    if (!reason) return

    const response = await fetch(`/api/admin/marketplace/${id}/flag`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    })

    if (response.ok) {
      toast.success('Clasificado marcado como inapropiado')
      fetchClassified()
    } else {
      const data = await response.json()
      toast.error(data.error || 'Error al marcar')
    }
  }

  async function handleUnflag() {
    const response = await fetch(`/api/admin/marketplace/${id}/flag`, {
      method: 'DELETE',
    })

    if (response.ok) {
      toast.success('Marca removida')
      fetchClassified()
    } else {
      const data = await response.json()
      toast.error(data.error || 'Error al remover marca')
    }
  }

  async function handleBanUser() {
    const reason = prompt('Razón para suspender este usuario del marketplace:')
    if (!reason) return

    const permanent = confirm('¿Suspensión permanente? (Cancelar = temporal 30 días)')
    const expires_at = permanent ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    const response = await fetch(`/api/admin/marketplace/${id}/ban-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, expires_at }),
    })

    if (response.ok) {
      const data = await response.json()
      toast.success(`Usuario suspendido. ${data.classifieds_removed} clasificados eliminados.`)
      router.push('/admin/marketplace')
    } else {
      const data = await response.json()
      toast.error(data.error || 'Error al suspender usuario')
    }
  }

  async function handleDelete() {
    if (!confirm('¿Estás seguro de eliminar este clasificado?')) return

    const response = await fetch(`/api/admin/marketplace/${id}`, {
      method: 'DELETE',
    })

    if (response.ok) {
      toast.success('Clasificado eliminado')
      router.push('/admin/marketplace')
    } else {
      const data = await response.json()
      toast.error(data.error || 'Error al eliminar')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    )
  }

  if (!classified) {
    return <div>Clasificado no encontrado</div>
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/marketplace">
          <Button variant="outline" className="brutalist-button gap-2">
            <ArrowLeft className="h-4 w-4" /> Volver
          </Button>
        </Link>
        <h1 className="text-3xl font-heading font-black uppercase italic tracking-tighter">
          Detalle de <span className="text-primary">Clasificado</span>
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Images */}
          {classified.images && classified.images.length > 0 && (
            <Card className="brutalist-card">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {classified.images.map((img, idx) => (
                    <div key={idx} className="relative aspect-square">
                      <Image
                        src={img}
                        alt={`${classified.title} - ${idx + 1}`}
                        fill
                        className="object-cover border-2 border-black"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Content */}
          <Card className="brutalist-card">
            <CardContent className="p-6 space-y-4">
              {editMode ? (
                <>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-black/60">
                      Título
                    </label>
                    <Input
                      value={editData.title}
                      onChange={(e) =>
                        setEditData({ ...editData, title: e.target.value })
                      }
                      className="brutalist-input"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-black/60">
                      Descripción
                    </label>
                    <Textarea
                      value={editData.description}
                      onChange={(e) =>
                        setEditData({ ...editData, description: e.target.value })
                      }
                      className="brutalist-input min-h-[120px]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-black/60">
                      Precio
                    </label>
                    <Input
                      value={editData.price}
                      onChange={(e) =>
                        setEditData({ ...editData, price: e.target.value })
                      }
                      className="brutalist-input"
                      placeholder="Opcional - Ej: $50,000 o Negociable"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-black/60">
                      WhatsApp
                    </label>
                    <Input
                      value={editData.whatsapp}
                      onChange={(e) =>
                        setEditData({ ...editData, whatsapp: e.target.value })
                      }
                      className="brutalist-input"
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={handleSaveEdit}
                      className="brutalist-button gap-2"
                    >
                      <Save className="h-4 w-4" /> Guardar
                    </Button>
                    <Button
                      onClick={() => setEditMode(false)}
                      variant="outline"
                      className="brutalist-button gap-2"
                    >
                      <X className="h-4 w-4" /> Cancelar
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className="text-[10px] rounded-none py-0 px-1 border-black"
                        >
                          {classified.marketplace_categories.name}
                        </Badge>
                        <ClassifiedStatusBadge status={classified.status} />
                      </div>

                      <h2 className="text-3xl font-heading font-black uppercase leading-tight">
                        {classified.title}
                      </h2>

                      {classified.price && (
                        <p className="text-primary font-black text-2xl">
                          {classified.price}
                        </p>
                      )}
                    </div>

                    <Button
                      onClick={() => setEditMode(true)}
                      variant="outline"
                      className="brutalist-button gap-2"
                    >
                      <Edit className="h-4 w-4" /> Editar
                    </Button>
                  </div>

                  <div className="prose max-w-none">
                    <p className="text-black/80">{classified.description}</p>
                  </div>

                  <div className="flex items-center gap-6 text-sm text-black/60">
                    <div>
                      <span className="font-black uppercase tracking-widest text-[10px] text-black/40">
                        Publicado por:
                      </span>{' '}
                      <Link
                        href={`/admin/users/${classified.user_id}`}
                        className="text-accent hover:underline font-bold"
                      >
                        {classified.profiles.full_name}
                      </Link>
                    </div>
                    <div>
                      <span className="font-black uppercase tracking-widest text-[10px] text-black/40">
                        Fecha:
                      </span>{' '}
                      {new Date(classified.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  {classified.flagged_reason && (
                    <div className="p-4 bg-red-50 border-2 border-red-500">
                      <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-1">
                        Razón de Marca:
                      </p>
                      <p className="text-red-700 font-bold">
                        {classified.flagged_reason}
                      </p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Admin Actions Sidebar */}
        <div className="space-y-6">
          {/* Status Change */}
          <Card className="brutalist-card">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-black uppercase tracking-widest text-sm">
                Cambiar Estado
              </h3>
              <Select
                value={classified.status}
                onValueChange={handleStatusChange}
              >
                <SelectTrigger className="brutalist-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-2 border-black rounded-none">
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="sold">Vendido</SelectItem>
                  <SelectItem value="archived">Archivado</SelectItem>
                  <SelectItem value="removed">Eliminado</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Admin Actions */}
          <Card className="brutalist-card">
            <CardContent className="p-6 space-y-3">
              <h3 className="font-black uppercase tracking-widest text-sm mb-4">
                Acciones de Admin
              </h3>

              {classified.status === 'flagged' ? (
                <Button
                  onClick={handleUnflag}
                  variant="outline"
                  className="w-full brutalist-button gap-2"
                >
                  <Flag className="h-4 w-4" /> Remover Marca
                </Button>
              ) : (
                <Button
                  onClick={handleFlag}
                  variant="outline"
                  className="w-full brutalist-button gap-2 text-red-600 border-red-600"
                >
                  <Flag className="h-4 w-4" /> Marcar Inapropiado
                </Button>
              )}

              <Button
                onClick={handleBanUser}
                variant="outline"
                className="w-full brutalist-button gap-2 text-orange-600 border-orange-600"
              >
                <Ban className="h-4 w-4" /> Suspender Usuario
              </Button>

              <Button
                onClick={handleDelete}
                variant="destructive"
                className="w-full brutalist-button gap-2"
              >
                <Trash2 className="h-4 w-4" /> Eliminar Clasificado
              </Button>
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card className="brutalist-card">
            <CardContent className="p-6 space-y-3 text-sm">
              <h3 className="font-black uppercase tracking-widest text-sm mb-4">
                Información
              </h3>

              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-black/40">
                  Comunidad:
                </span>
                <p className="font-bold">{classified.communities.name}</p>
              </div>

              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-black/40">
                  WhatsApp:
                </span>
                <p className="font-bold">{classified.whatsapp}</p>
              </div>

              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-black/40">
                  Última Actividad:
                </span>
                <p className="font-bold">
                  {new Date(classified.last_activity_at).toLocaleDateString()}
                </p>
              </div>

              {classified.sold_at && (
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-black/40">
                    Vendido:
                  </span>
                  <p className="font-bold">
                    {new Date(classified.sold_at).toLocaleDateString()}
                  </p>
                </div>
              )}

              {classified.archived_at && (
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-black/40">
                    Archivado:
                  </span>
                  <p className="font-bold">
                    {new Date(classified.archived_at).toLocaleDateString()}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Test detail page**

Create a test classified in database (via Supabase SQL editor or insert directly).

Navigate to: `http://localhost:3000/admin/marketplace/[test-id]`

Expected: Detail page loads with all classified info and admin actions

**Step 3: Commit detail page**

```bash
git add app/admin/marketplace/[id]/page.tsx
git commit -m "feat(admin): add classified detail and edit page

- Full classified detail view with images
- Inline edit mode for title, description, price, whatsapp
- Status change dropdown
- Flag/unflag, ban user, delete actions
- Metadata sidebar with community, dates, contact info
- Back navigation to marketplace list

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 10: Test Complete Flow with Sample Data

**Step 1: Create sample classifieds via SQL**

Open Supabase SQL editor and run:

```sql
-- Insert sample classifieds (replace USER_ID and COMMUNITY_ID with actual values)
INSERT INTO classifieds (
  community_id,
  user_id,
  category_id,
  title,
  description,
  price,
  whatsapp,
  status
)
SELECT
  (SELECT id FROM communities LIMIT 1),
  (SELECT id FROM profiles WHERE role = 'user' LIMIT 1),
  (SELECT id FROM marketplace_categories WHERE slug = 'vendo' LIMIT 1),
  'Bicicleta de montaña',
  'Bicicleta en excelente estado, poco uso. Incluye casco y candado.',
  '$200,000',
  '3001234567',
  'active'
UNION ALL
SELECT
  (SELECT id FROM communities LIMIT 1),
  (SELECT id FROM profiles WHERE role = 'user' LIMIT 1),
  (SELECT id FROM marketplace_categories WHERE slug = 'compro' LIMIT 1),
  'Busco PlayStation 4',
  'Busco consola PS4 en buen estado, con controles.',
  'Negociable',
  '3007654321',
  'active'
UNION ALL
SELECT
  (SELECT id FROM communities LIMIT 1),
  (SELECT id FROM profiles WHERE role = 'user' LIMIT 1),
  (SELECT id FROM marketplace_categories WHERE slug = 'servicios' LIMIT 1),
  'Clases de guitarra',
  'Profesor con 10 años de experiencia ofrece clases particulares.',
  '$30,000/hora',
  '3009876543',
  'active';
```

**Step 2: Test complete admin flow**

1. Navigate to `/admin/marketplace`
2. Verify stats strip shows correct counts
3. Test filters (category, status)
4. Click on a classified to view detail
5. Edit the classified title
6. Mark one as "Vendido"
7. Flag one as inappropriate
8. Test ban user (creates ban, removes user's classifieds)
9. Delete a classified

**Step 3: Verify audit logs**

Check `audit_logs` table in Supabase:

```sql
SELECT * FROM audit_logs WHERE entity_type = 'classified' ORDER BY created_at DESC;
```

Expected: All admin actions logged

**Step 4: Document test results**

Create test report: `docs/testing/marketplace-admin-test-results.md`

---

## Task 11: Final Integration & Documentation

**Files:**
- Modify: `CLAUDE.md`
- Create: `docs/marketplace-admin-guide.md`

**Step 1: Update CLAUDE.md with marketplace info**

Add to Phase 4 section in CLAUDE.md:

```markdown
### Phase 4: Marketplace (Clasificados - ADMIN COMPLETE)
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
- [ ] **Next:** User-facing marketplace (browse, create listings)
```

**Step 2: Create admin guide**

Create `docs/marketplace-admin-guide.md`:

```markdown
# Marketplace Admin Guide

## Overview

The marketplace admin panel allows community admins to moderate classified listings posted by users.

## Access

Navigate to `/admin/marketplace` (admin or super admin role required).

## Features

### Stats Dashboard
- **Active**: Current active listings
- **Sold (7 days)**: Listings marked as sold in the last week
- **Flagged**: Listings marked as inappropriate
- **Banned Users**: Users currently banned from marketplace

### Filters
- **Category**: Vendo, Compro, Arriendo, Servicios, Trabajo
- **Status**: Active, Sold, Archived, Flagged, Removed

### Actions

**On listing cards:**
- **Ver Detalle**: View full classified with images
- **Marcar Vendido**: Change status to sold
- **Archivar**: Archive the listing
- **Eliminar**: Soft delete (set status to removed)

**On detail page:**
- **Edit**: Modify title, description, price, WhatsApp
- **Status Change**: Dropdown to change status
- **Marcar Inapropiado**: Flag with reason
- **Suspender Usuario**: Ban user from marketplace (removes all their classifieds)
- **Eliminar**: Delete classified

### User Bans
- Permanent or temporary (specify expiration date)
- Automatically removes all user's active classifieds
- Prevents user from creating new listings

## Audit Trail

All admin actions are logged to `audit_logs` table:
- Who performed the action
- What was changed (old_data, new_data)
- When it happened
- Associated community

## Best Practices

1. **Flag before delete**: Flag classifieds first to track repeat offenders
2. **Document reasons**: Always provide clear reasons when flagging or banning
3. **Check reports**: Review user reports in `/admin/reports` for classified reports
4. **Monitor stats**: Keep flagged count low by addressing reports quickly
5. **Temporary bans first**: Try 30-day bans before permanent for first offenses
```

**Step 3: Commit documentation**

```bash
git add CLAUDE.md docs/marketplace-admin-guide.md
git commit -m "docs: update CLAUDE.md and add marketplace admin guide

- Mark Phase 4 marketplace admin features as complete
- Add comprehensive admin guide with features and best practices
- Document stats, filters, actions, and audit trail

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

**Step 4: Final verification**

Run full build: `npm run build`

Expected: No errors, clean build

---

## Success Criteria Checklist

- [x] Database tables created with RLS policies
- [x] TypeScript types generated and helper types added
- [x] API routes for CRUD operations
- [x] Admin panel with filters and stats
- [x] Classified detail/edit page
- [x] Flag/unflag functionality
- [x] Ban user functionality
- [x] Audit logging for all actions
- [x] Navigation integrated in admin sidebar
- [x] Components follow neo-brutalist design
- [x] No `any` types in TypeScript
- [x] All admin actions require proper permissions
- [x] Community isolation enforced via RLS
- [x] Documentation updated

---

## Next Steps (Out of Scope)

**User-Facing Marketplace:**
1. Public marketplace browse page (`/[community]/marketplace`)
2. Classified creation form for users
3. User dashboard to manage own classifieds
4. Auto-archive cron job (60 days)
5. Featured listings (monetization)
6. Export classifieds data to CSV

---

**Estimated Implementation Time:** 2-3 days for experienced developer

**Dependencies:**
- Supabase local instance running
- Admin user account with proper role
- Sample community data in database
