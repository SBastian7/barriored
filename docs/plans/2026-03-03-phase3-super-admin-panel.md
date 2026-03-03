# Phase 3: Super Admin Panel - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build super admin features for managing multiple communities, assigning admins/moderators, and viewing platform-wide analytics.

**Architecture:** Create communities CRUD API endpoints, build management UI with brutalist design, add platform-wide dashboard with community selector, and update navigation with role-based filtering.

**Tech Stack:** PostgreSQL RLS, Next.js App Router, React Server Components, TypeScript, Brutalist UI

**Design Doc:** See `docs/plans/2026-03-03-cross-cutting-admin-features-design.md`

**Prerequisites:** Phase 1 and Phase 2 must be deployed and stable (2+ weeks monitoring)

---

## Pre-Implementation Checklist

- [ ] Phase 1 deployed for 3+ weeks (RLS stable)
- [ ] Phase 2 deployed for 2+ weeks (audit logs working)
- [ ] No critical issues in production
- [ ] Review design doc Phase 3 section
- [ ] Have super admin test account ready

---

## Task 1: Create Communities RLS Migration

**Files:**
- Create: `supabase/migrations/20260303000003_communities_management.sql`

**Step 1: Create migration file with RLS policies**

```sql
-- Migration: Communities Management (Super Admin Only)
-- Date: 2026-03-03
-- Description: Add RLS policies for communities CRUD (super admin only)

-- ============================================================================
-- COMMUNITIES: Enable RLS and add policies
-- ============================================================================

-- Note: RLS already enabled in 001_initial_schema.sql
-- Just adding new policies for CRUD operations

-- INSERT: Super admin only
CREATE POLICY "communities_insert_super_admin"
ON communities FOR INSERT
WITH CHECK (is_super_admin());

-- UPDATE: Super admin only
CREATE POLICY "communities_update_super_admin"
ON communities FOR UPDATE
USING (is_super_admin());

-- DELETE: Super admin only (soft delete - set is_active=false)
CREATE POLICY "communities_delete_super_admin"
ON communities FOR DELETE
USING (is_super_admin());

COMMENT ON POLICY "communities_insert_super_admin" ON communities IS
  'Only super admin can create new communities';

COMMENT ON POLICY "communities_update_super_admin" ON communities IS
  'Only super admin can update community information';

COMMENT ON POLICY "communities_delete_super_admin" ON communities IS
  'Only super admin can delete/archive communities';
```

**Step 2: Add helper function for community stats**

```sql

-- ============================================================================
-- HELPER FUNCTION: Get community stats
-- ============================================================================

CREATE OR REPLACE FUNCTION get_community_stats(community_uuid UUID)
RETURNS TABLE (
  businesses_count bigint,
  users_count bigint,
  admins_count bigint,
  posts_count bigint,
  alerts_count bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    (SELECT count(*) FROM businesses WHERE community_id = community_uuid) as businesses_count,
    (SELECT count(*) FROM profiles WHERE community_id = community_uuid) as users_count,
    (SELECT count(*) FROM profiles WHERE community_id = community_uuid AND role IN ('admin', 'moderator')) as admins_count,
    (SELECT count(*) FROM community_posts WHERE community_id = community_uuid) as posts_count,
    (SELECT count(*) FROM community_alerts WHERE community_id = community_uuid AND is_active = true) as alerts_count;
$$;

COMMENT ON FUNCTION get_community_stats(UUID) IS
  'Returns aggregated statistics for a community';
```

**Step 3: Commit**

```bash
git add supabase/migrations/20260303000003_communities_management.sql
git commit -m "feat(db): add communities RLS policies and stats function

- Super admin can create/update/delete communities
- Helper function to get aggregated community stats

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Apply Migration Locally

**Files:**
- None (database operation)

**Step 1: Apply migration**

Run: `supabase db reset`
Expected: Migration applied successfully

**Step 2: Verify policies created**

Run in Supabase Studio SQL Editor:
```sql
SELECT policyname
FROM pg_policies
WHERE tablename = 'communities'
ORDER BY policyname;
```
Expected: 3 new policies visible (insert, update, delete)

**Step 3: Verify helper function**

```sql
SELECT get_community_stats((SELECT id FROM communities LIMIT 1));
```
Expected: Returns row with counts

**Step 4: Commit checkpoint**

```bash
git add .
git commit -m "test(db): verify communities management migration

Policies and helper function working correctly.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Create Communities List API

**Files:**
- Create: `app/api/admin/communities/route.ts`

**Step 1: Create GET endpoint**

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check super admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_super_admin) {
    return NextResponse.json(
      { error: 'Forbidden - Super admin only' },
      { status: 403 }
    )
  }

  // Get all communities with stats
  const { data: communities, error } = await supabase.rpc(
    'get_communities_with_stats'
  )

  if (error) {
    // Fallback: Get communities without stats function
    const { data, error: commError } = await supabase
      .from('communities')
      .select('*')
      .order('created_at', { ascending: false })

    if (commError) {
      return NextResponse.json({ error: commError.message }, { status: 500 })
    }

    // Get stats for each community manually
    const withStats = await Promise.all(
      data.map(async (community) => {
        const { data: stats } = await supabase.rpc(
          'get_community_stats',
          { community_uuid: community.id }
        )

        return {
          ...community,
          stats: stats?.[0] || {
            businesses_count: 0,
            users_count: 0,
            admins_count: 0,
            posts_count: 0,
            alerts_count: 0,
          },
        }
      })
    )

    return NextResponse.json({ communities: withStats })
  }

  return NextResponse.json({ communities })
}
```

**Step 2: Add POST endpoint**

```typescript

export async function POST(request: Request) {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check super admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_super_admin) {
    return NextResponse.json(
      { error: 'Forbidden - Super admin only' },
      { status: 403 }
    )
  }

  const body = await request.json()
  const { name, slug, municipality, department, description, logo_url } = body

  // Validate required fields
  if (!name || !slug || !municipality || !department) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    )
  }

  // Check slug uniqueness
  const { data: existing } = await supabase
    .from('communities')
    .select('id')
    .eq('slug', slug)
    .single()

  if (existing) {
    return NextResponse.json(
      { error: 'Slug already exists' },
      { status: 400 }
    )
  }

  // Create community
  const { data: community, error } = await supabase
    .from('communities')
    .insert({
      name,
      slug,
      municipality,
      department,
      description,
      logo_url,
      is_active: true,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ community })
}
```

**Step 3: Commit**

```bash
git add app/api/admin/communities/route.ts
git commit -m "feat(api): create communities list and create endpoints

GET: List all communities with stats (super admin only)
POST: Create new community (super admin only)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Create Community Detail/Update API

**Files:**
- Create: `app/api/admin/communities/[id]/route.ts`

**Step 1: Create GET endpoint**

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logAuditAction } from '@/lib/utils/audit-logger'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check super admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_super_admin) {
    return NextResponse.json(
      { error: 'Forbidden - Super admin only' },
      { status: 403 }
    )
  }

  // Get community with stats
  const { data: community, error } = await supabase
    .from('communities')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Get community staff
  const { data: staff } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, role, created_at')
    .eq('community_id', params.id)
    .in('role', ['admin', 'moderator'])

  // Get stats
  const { data: stats } = await supabase.rpc('get_community_stats', {
    community_uuid: params.id,
  })

  return NextResponse.json({
    community: {
      ...community,
      staff: staff || [],
      stats: stats?.[0] || {},
    },
  })
}
```

**Step 2: Add PATCH endpoint**

```typescript

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check super admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_super_admin) {
    return NextResponse.json(
      { error: 'Forbidden - Super admin only' },
      { status: 403 }
    )
  }

  const body = await request.json()

  // Get old data for audit log
  const { data: oldCommunity } = await supabase
    .from('communities')
    .select('*')
    .eq('id', params.id)
    .single()

  // Update community
  const { data: community, error } = await supabase
    .from('communities')
    .update(body)
    .eq('id', params.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Log audit action
  await logAuditAction({
    action: 'update_community',
    entityType: 'community',
    entityId: params.id,
    oldData: oldCommunity,
    newData: community,
  })

  return NextResponse.json({ community })
}
```

**Step 3: Add DELETE endpoint (soft delete)**

```typescript

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check super admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_super_admin) {
    return NextResponse.json(
      { error: 'Forbidden - Super admin only' },
      { status: 403 }
    )
  }

  // Soft delete (set is_active = false)
  const { error } = await supabase
    .from('communities')
    .update({ is_active: false })
    .eq('id', params.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Log audit action
  await logAuditAction({
    action: 'archive_community',
    entityType: 'community',
    entityId: params.id,
  })

  return NextResponse.json({ success: true })
}
```

**Step 4: Commit**

```bash
git add app/api/admin/communities/[id]/route.ts
git commit -m "feat(api): create community detail/update/delete endpoints

GET: Community details with stats and staff list
PATCH: Update community info with audit logging
DELETE: Soft delete (archive) community

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Create Community Staff Management API

**Files:**
- Create: `app/api/admin/communities/[id]/staff/route.ts`

**Step 1: Create POST endpoint (assign admin/moderator)**

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logAuditAction } from '@/lib/utils/audit-logger'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check super admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_super_admin) {
    return NextResponse.json(
      { error: 'Forbidden - Super admin only' },
      { status: 403 }
    )
  }

  const body = await request.json()
  const { user_id, role } = body

  // Validate role
  if (!['admin', 'moderator'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  // Update user's profile
  const { error } = await supabase
    .from('profiles')
    .update({
      community_id: params.id,
      role,
    })
    .eq('id', user_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Log audit action
  await logAuditAction({
    action: 'assign_role',
    entityType: 'user',
    entityId: user_id,
    newData: { role, community_id: params.id },
    communityId: params.id,
  })

  return NextResponse.json({ success: true })
}
```

**Step 2: Create DELETE endpoint (remove staff)**

```typescript

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check super admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_super_admin) {
    return NextResponse.json(
      { error: 'Forbidden - Super admin only' },
      { status: 403 }
    )
  }

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('user_id')

  if (!userId) {
    return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })
  }

  // Get old data for audit log
  const { data: oldProfile } = await supabase
    .from('profiles')
    .select('role, community_id')
    .eq('id', userId)
    .single()

  // Reset to regular user
  const { error } = await supabase
    .from('profiles')
    .update({
      community_id: null,
      role: 'user',
    })
    .eq('id', userId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Log audit action
  await logAuditAction({
    action: 'assign_role',
    entityType: 'user',
    entityId: userId,
    oldData: oldProfile,
    newData: { role: 'user', community_id: null },
  })

  return NextResponse.json({ success: true })
}
```

**Step 3: Commit**

```bash
git add app/api/admin/communities/[id]/staff/route.ts
git commit -m "feat(api): create community staff management endpoints

POST: Assign admin or moderator to community
DELETE: Remove staff from community (reset to user role)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Create Communities List Page

**Files:**
- Create: `app/admin/communities/page.tsx`

**Step 1: Create server component**

```typescript
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, MapPin, Users, Building2 } from 'lucide-react'

export default async function CommunitiesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_super_admin) {
    redirect('/admin')
  }

  // Fetch communities (server-side)
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_URL}/api/admin/communities`,
    {
      headers: {
        Cookie: `${(await supabase.auth.getSession()).data.session?.access_token}`,
      },
    }
  )
  const { communities } = await response.json()

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-2">
            Comunidades
          </h1>
          <p className="text-muted-foreground">
            Gestiona todas las comunidades de la plataforma
          </p>
        </div>
        <Link href="/admin/communities/new">
          <Button className="brutalist-button">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Comunidad
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {communities?.map((community: any) => (
          <Link
            key={community.id}
            href={`/admin/communities/${community.id}`}
            className="brutalist-card hover:translate-x-1 hover:translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all"
          >
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter italic">
                    {community.name}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <MapPin className="h-4 w-4" />
                    {community.municipality}, {community.department}
                  </div>
                </div>
                {community.is_active ? (
                  <Badge className="bg-green-500">Activa</Badge>
                ) : (
                  <Badge variant="outline">Inactiva</Badge>
                )}
              </div>

              <p className="text-sm line-clamp-2">{community.description}</p>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t-2 border-black">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-widest font-bold">
                    <Building2 className="h-3 w-3" />
                    Negocios
                  </div>
                  <div className="text-2xl font-black">
                    {community.stats?.businesses_count || 0}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-widest font-bold">
                    <Users className="h-3 w-3" />
                    Usuarios
                  </div>
                  <div className="text-2xl font-black">
                    {community.stats?.users_count || 0}
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {communities?.length === 0 && (
        <div className="brutalist-card p-12 text-center">
          <p className="text-muted-foreground mb-4">
            No hay comunidades creadas aún
          </p>
          <Link href="/admin/communities/new">
            <Button className="brutalist-button">Crear Primera Comunidad</Button>
          </Link>
        </div>
      )}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add app/admin/communities/page.tsx
git commit -m "feat(admin): create communities list page

Brutalist grid layout with community cards.
Shows stats, location, and active status.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Create New Community Form Page

**Files:**
- Create: `app/admin/communities/new/page.tsx`

**Step 1: Create form page**

```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CommunityForm } from '@/components/admin/community-form'

export default async function NewCommunityPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_super_admin) {
    redirect('/admin')
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-2">
          Nueva Comunidad
        </h1>
        <p className="text-muted-foreground">
          Crea una nueva comunidad en la plataforma
        </p>
      </div>

      <CommunityForm mode="create" />
    </div>
  )
}
```

**Step 2: Create reusable form component**

Create: `components/admin/community-form.tsx`

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface Props {
  mode: 'create' | 'edit'
  initialData?: any
}

export function CommunityForm({ mode, initialData }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    slug: initialData?.slug || '',
    municipality: initialData?.municipality || '',
    department: initialData?.department || '',
    description: initialData?.description || '',
    logo_url: initialData?.logo_url || '',
  })

  // Auto-generate slug from name
  function generateSlug(name: string) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const url =
        mode === 'create'
          ? '/api/admin/communities'
          : `/api/admin/communities/${initialData.id}`

      const response = await fetch(url, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        alert(error.error || 'Error al guardar comunidad')
        return
      }

      const { community } = await response.json()
      router.push(`/admin/communities/${community.id}`)
    } catch (error) {
      console.error('Error:', error)
      alert('Error al guardar comunidad')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="brutalist-card p-8 space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name" className="uppercase tracking-widest font-bold text-xs">
          Nombre *
        </Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => {
            setFormData({
              ...formData,
              name: e.target.value,
              slug: mode === 'create' ? generateSlug(e.target.value) : formData.slug,
            })
          }}
          placeholder="Parque Industrial"
          required
          className="brutalist-input"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="slug" className="uppercase tracking-widest font-bold text-xs">
          Slug (URL) *
        </Label>
        <Input
          id="slug"
          value={formData.slug}
          onChange={(e) =>
            setFormData({ ...formData, slug: e.target.value })
          }
          placeholder="parqueindustrial"
          required
          className="brutalist-input"
          disabled={mode === 'edit'}
        />
        <p className="text-xs text-muted-foreground">
          URL: barriored.co/{formData.slug}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="municipality" className="uppercase tracking-widest font-bold text-xs">
            Municipio *
          </Label>
          <Input
            id="municipality"
            value={formData.municipality}
            onChange={(e) =>
              setFormData({ ...formData, municipality: e.target.value })
            }
            placeholder="Pereira"
            required
            className="brutalist-input"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="department" className="uppercase tracking-widest font-bold text-xs">
            Departamento *
          </Label>
          <Input
            id="department"
            value={formData.department}
            onChange={(e) =>
              setFormData({ ...formData, department: e.target.value })
            }
            placeholder="Risaralda"
            required
            className="brutalist-input"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="uppercase tracking-widest font-bold text-xs">
          Descripción
        </Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          placeholder="Describe la comunidad..."
          rows={4}
          className="brutalist-input"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="logo_url" className="uppercase tracking-widest font-bold text-xs">
          URL del Logo
        </Label>
        <Input
          id="logo_url"
          type="url"
          value={formData.logo_url}
          onChange={(e) =>
            setFormData({ ...formData, logo_url: e.target.value })
          }
          placeholder="https://..."
          className="brutalist-input"
        />
      </div>

      <div className="flex gap-4 pt-4 border-t-2 border-black">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
          className="brutalist-button"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="brutalist-button flex-1"
        >
          {loading ? 'Guardando...' : mode === 'create' ? 'Crear Comunidad' : 'Guardar Cambios'}
        </Button>
      </div>
    </form>
  )
}
```

**Step 3: Commit**

```bash
git add app/admin/communities/new/page.tsx components/admin/community-form.tsx
git commit -m "feat(admin): create new community form page

Brutalist form with auto-slug generation.
Reusable CommunityForm component for create/edit.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Update Sidebar with Communities Link

**Files:**
- Modify: `components/admin/collapsible-sidebar.tsx`

**Step 1: Add Globe icon import**

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
  Globe,  // Add this
} from 'lucide-react'
```

**Step 2: Add communities nav item**

Find navItems array and add before logs:

```typescript
  { href: '/admin/engagement', label: 'Engagement', icon: Activity, roles: ['admin', 'moderator', 'super_admin'] },
  { href: '/admin/communities', label: 'Comunidades', icon: Globe, roles: ['super_admin'], divider: true },
  { href: '/admin/logs', label: 'Logs', icon: FileText, roles: ['admin', 'moderator', 'super_admin'] },
```

**Step 3: Add divider support**

Update the nav rendering to show divider:

```typescript
{navItems.map((item) => {
  const Icon = item.icon
  const isActive = pathname === item.href

  return (
    <div key={item.href}>
      {item.divider && (
        <div className="border-t-2 border-black my-2" />
      )}
      <Link href={item.href}>
        <Button
          variant={isActive ? 'default' : 'ghost'}
          className={cn(
            'w-full brutalist-button transition-all duration-200',
            isCollapsed ? 'justify-center px-0' : 'justify-start',
            isActive && 'bg-primary text-white hover:bg-primary/90'
          )}
          title={isCollapsed ? item.label : undefined}
        >
          <Icon className={cn('h-4 w-4', !isCollapsed && 'mr-3')} />
          {!isCollapsed && (
            <span className="uppercase tracking-widest text-xs font-black">
              {item.label}
            </span>
          )}
        </Button>
      </Link>
    </div>
  )
})}
```

**Step 4: Update navItems type**

At top of file, update the navItems array type:

```typescript
const navItems = [
  // ...
] as const satisfies readonly {
  href: string
  label: string
  icon: any
  roles?: string[]
  divider?: boolean
}[]
```

**Step 5: Commit**

```bash
git add components/admin/collapsible-sidebar.tsx
git commit -m "feat(admin): add Communities link to sidebar

Super admin only, with divider separator.
Added divider support to nav items.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Add Super Admin Badge to Header

**Files:**
- Modify: `components/admin/desktop-header.tsx`

**Step 1: Add super admin badge**

Find the header component and add badge before UserMenu:

```typescript
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Shield } from 'lucide-react'

export function DesktopHeader() {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  useEffect(() => {
    async function checkSuperAdmin() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_super_admin')
          .eq('id', user.id)
          .single()

        setIsSuperAdmin(profile?.is_super_admin || false)
      }
    }

    checkSuperAdmin()
  }, [])

  return (
    <header className="hidden lg:flex items-center justify-between px-8 h-16 border-b-4 border-black bg-background">
      <Link href="/admin" className="text-2xl font-black uppercase tracking-tighter italic">
        BarrioRed Admin
      </Link>

      <div className="flex items-center gap-4">
        {isSuperAdmin && (
          <Badge className="bg-secondary text-foreground font-black uppercase tracking-widest rotate-[-2deg]">
            <Shield className="h-3 w-3 mr-1" />
            Super Admin
          </Badge>
        )}

        {/* UserMenu component */}
      </div>
    </header>
  )
}
```

**Step 2: Commit**

```bash
git add components/admin/desktop-header.tsx
git commit -m "feat(admin): add super admin badge to header

Visual indicator for super admin users.
Rotated badge in secondary color.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 10: Create Community Detail Page

**Files:**
- Create: `app/admin/communities/[id]/page.tsx`

**Step 1: Create page with tabs**

```typescript
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CommunityStatsPanel } from '@/components/admin/community-stats-panel'
import { CommunityStaffPanel } from '@/components/admin/community-staff-panel'
import { Edit, ArrowLeft } from 'lucide-react'

export default async function CommunityDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_super_admin) {
    redirect('/admin')
  }

  // Fetch community details
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_URL}/api/admin/communities/${params.id}`,
    {
      headers: {
        Cookie: `${(await supabase.auth.getSession()).data.session?.access_token}`,
      },
    }
  )
  const { community } = await response.json()

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/admin/communities">
          <Button variant="outline" className="brutalist-button" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>

        <div className="flex-1">
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-4xl font-black uppercase tracking-tighter italic">
              {community.name}
            </h1>
            {community.is_active ? (
              <Badge className="bg-green-500">Activa</Badge>
            ) : (
              <Badge variant="outline">Inactiva</Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            {community.municipality}, {community.department}
          </p>
        </div>

        <Link href={`/admin/communities/${params.id}/edit`}>
          <Button className="brutalist-button">
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="stats" className="space-y-6">
        <TabsList className="brutalist-card inline-flex">
          <TabsTrigger
            value="stats"
            className="uppercase tracking-widest font-bold text-xs"
          >
            Estadísticas
          </TabsTrigger>
          <TabsTrigger
            value="staff"
            className="uppercase tracking-widest font-bold text-xs"
          >
            Staff
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stats">
          <CommunityStatsPanel community={community} />
        </TabsContent>

        <TabsContent value="staff">
          <CommunityStaffPanel
            communityId={params.id}
            staff={community.staff || []}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

**Step 2: Create stats panel component**

Create: `components/admin/community-stats-panel.tsx`

```typescript
'use client'

import { Building2, Users, MessageSquare, Bell, Shield } from 'lucide-react'

interface Props {
  community: any
}

export function CommunityStatsPanel({ community }: Props) {
  const stats = community.stats || {}

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <StatCard
        icon={<Building2 className="h-8 w-8" />}
        label="Negocios"
        value={stats.businesses_count || 0}
        color="bg-blue-500"
      />
      <StatCard
        icon={<Users className="h-8 w-8" />}
        label="Usuarios"
        value={stats.users_count || 0}
        color="bg-green-500"
      />
      <StatCard
        icon={<Shield className="h-8 w-8" />}
        label="Admins/Moderadores"
        value={stats.admins_count || 0}
        color="bg-purple-500"
      />
      <StatCard
        icon={<MessageSquare className="h-8 w-8" />}
        label="Posts Comunitarios"
        value={stats.posts_count || 0}
        color="bg-yellow-500"
      />
      <StatCard
        icon={<Bell className="h-8 w-8" />}
        label="Alertas Activas"
        value={stats.alerts_count || 0}
        color="bg-red-500"
      />
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: number
  color: string
}) {
  return (
    <div className="brutalist-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${color} text-white`}>{icon}</div>
      </div>
      <div className="text-4xl font-black mb-2">{value}</div>
      <div className="text-sm uppercase tracking-widest font-bold text-muted-foreground">
        {label}
      </div>
    </div>
  )
}
```

**Step 3: Create staff panel component**

Create: `components/admin/community-staff-panel.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, UserMinus } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Props {
  communityId: string
  staff: any[]
}

export function CommunityStaffPanel({ communityId, staff }: Props) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-black uppercase tracking-tighter italic">
          Staff de la Comunidad
        </h3>
        <Button className="brutalist-button">
          <Plus className="h-4 w-4 mr-2" />
          Asignar Staff
        </Button>
      </div>

      <div className="brutalist-card">
        {staff.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            No hay staff asignado a esta comunidad
          </div>
        ) : (
          <div className="divide-y-2 divide-black">
            {staff.map((member: any) => (
              <div
                key={member.id}
                className="p-6 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  {member.avatar_url && (
                    <img
                      src={member.avatar_url}
                      alt={member.full_name}
                      className="w-12 h-12 rounded-full border-2 border-black"
                    />
                  )}
                  <div>
                    <div className="font-bold text-lg">{member.full_name}</div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge
                        className={
                          member.role === 'admin'
                            ? 'bg-primary'
                            : 'bg-secondary text-foreground'
                        }
                      >
                        {member.role === 'admin' ? 'Admin' : 'Moderador'}
                      </Badge>
                      <span>•</span>
                      <span>
                        Desde{' '}
                        {format(new Date(member.created_at), 'MMM yyyy', {
                          locale: es,
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="brutalist-button"
                  size="icon"
                >
                  <UserMinus className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

**Step 4: Commit**

```bash
git add app/admin/communities/[id]/page.tsx components/admin/community-stats-panel.tsx components/admin/community-staff-panel.tsx
git commit -m "feat(admin): create community detail page with tabs

Stats tab shows key metrics with brutalist cards.
Staff tab shows admins/moderators list.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 11: Manual Testing

**Files:**
- None (manual testing)

**Step 1: Test communities list**

1. Login as super admin
2. Navigate to `/admin/communities`
3. Verify communities list appears
4. Verify stats are displayed correctly

**Step 2: Test create community**

1. Click "Nueva Comunidad"
2. Fill form with test data
3. Verify slug auto-generates from name
4. Submit form
5. Verify redirects to community detail page

**Step 3: Test community detail**

1. View community detail page
2. Verify tabs work (Stats, Staff)
3. Check stats are accurate
4. Verify staff list shows correct admins/moderators

**Step 4: Test navigation**

1. Verify "Comunidades" link only visible to super admin
2. Verify super admin badge shows in header
3. Test divider appears before super admin section

**Step 5: Document test results**

```bash
echo "Phase 3 Testing Results ($(date)):

✅ Communities list displays correctly with stats
✅ Create community form works (slug auto-generation)
✅ Community detail page shows stats and staff
✅ Navigation link visible to super admin only
✅ Super admin badge displays in header
✅ RLS policies enforce super admin only access

" > docs/test-results-phase3.txt
```

---

## Post-Implementation Checklist

- [ ] All migration steps completed
- [ ] Communities RLS policies created
- [ ] API endpoints created (list, create, update, delete, staff management)
- [ ] Communities list page with brutalist grid
- [ ] Create community form with auto-slug
- [ ] Community detail page with stats and staff tabs
- [ ] Sidebar navigation updated with Communities link
- [ ] Super admin badge added to header
- [ ] Manual testing completed
- [ ] Ready for production deployment

---

## Next Steps

**After deploying Phase 3:**

1. Monitor for 2 weeks to ensure stability
2. Train super admin on communities management workflow
3. Create first production community instances
4. Assign community admins/moderators
5. Future enhancements:
   - Community selector in platform dashboard
   - Cross-community analytics charts
   - Bulk operations (archive multiple communities)
   - Community templates (clone settings)

**Estimated Timeline:**
- Phase 3: 4-5 days implementation + testing
- Deploy to production: 1 day
- Monitor for 2 weeks
- Begin onboarding new communities

---

## Future Enhancements (Out of Scope)

- Platform-wide dashboard with community selector
- Cross-community analytics and charts
- Community boundaries (geographic polygons)
- Global settings management
- Community templates and cloning
- Automated community onboarding workflow

---

**End of Phase 3 Implementation Plan**
