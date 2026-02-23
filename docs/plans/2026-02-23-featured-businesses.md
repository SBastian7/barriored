# Featured Businesses Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the interrupted featured businesses implementation with role-based permissions, two homepage sections (Featured + Recent), and admin workflow.

**Architecture:** Enhance role system with super admin flag, add featured fields to businesses table, create request/approval workflow where community admins nominate and super admins approve, display featured businesses in manual order on homepage with no duplicates in recent section.

**Tech Stack:** Next.js 16, React 19, Supabase (PostgreSQL + RLS), TypeScript, Tailwind CSS, Radix UI

---

## Task 1: Create Database Migration

**Files:**
- Create: `supabase/migrations/005_add_featured_businesses_and_super_admin.sql`

**Step 1: Create migration file**

Create file with complete SQL:

```sql
-- Add is_super_admin column to profiles table
ALTER TABLE profiles
ADD COLUMN is_super_admin BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN profiles.is_super_admin IS
  'Platform-wide admin with full access across all communities';

-- Add featured fields to businesses table
ALTER TABLE businesses
ADD COLUMN featured_order INTEGER NULL,
ADD COLUMN featured_requested BOOLEAN DEFAULT FALSE,
ADD COLUMN featured_requested_at TIMESTAMP WITH TIME ZONE NULL;

-- Create indexes for efficient queries
CREATE INDEX idx_businesses_featured_order
  ON businesses(community_id, is_featured, featured_order)
  WHERE is_featured = TRUE AND status = 'approved';

CREATE INDEX idx_businesses_featured_requested
  ON businesses(community_id, featured_requested)
  WHERE featured_requested = TRUE;

-- Add comments
COMMENT ON COLUMN businesses.featured_order IS
  'Manual sort order for featured businesses (lower = higher priority)';
COMMENT ON COLUMN businesses.featured_requested IS
  'Community admin requested this business to be featured';
COMMENT ON COLUMN businesses.featured_requested_at IS
  'Timestamp when featured status was requested';

-- Create helper function: is_super_admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role = 'admin'
      AND is_super_admin = TRUE
  );
$$;

-- Create helper function: can_manage_featured
CREATE OR REPLACE FUNCTION can_manage_featured(business_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    is_super_admin()
    OR
    EXISTS (
      SELECT 1 FROM businesses b
      INNER JOIN profiles p ON p.id = auth.uid()
      WHERE b.id = business_id
        AND p.role = 'admin'
        AND p.community_id = b.community_id
        AND (p.is_super_admin IS FALSE OR p.is_super_admin IS NULL)
    );
$$;

-- Create RLS policy: Super admins can update featured fields
CREATE POLICY "businesses_update_featured_super_admin"
ON businesses FOR UPDATE
TO public
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Create RLS policy: Community admins can request featured
CREATE POLICY "businesses_update_featured_request_community_admin"
ON businesses FOR UPDATE
TO public
USING (
  is_community_admin(community_id)
  AND NOT is_super_admin()
)
WITH CHECK (
  is_community_admin(community_id)
);
```

**Step 2: Commit migration file**

```bash
git add supabase/migrations/005_add_featured_businesses_and_super_admin.sql
git commit -m "feat: add featured businesses database migration

- Add is_super_admin to profiles table
- Add featured_order, featured_requested, featured_requested_at to businesses
- Create helper functions is_super_admin() and can_manage_featured()
- Add RLS policies for featured business management
- Create indexes for efficient queries

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Apply Migration to Database

**Files:**
- Execute: `supabase/migrations/005_add_featured_businesses_and_super_admin.sql`

**Step 1: Apply migration using Supabase MCP**

Use Supabase MCP `apply_migration` tool with:
- name: `add_featured_businesses_and_super_admin`
- query: (contents of migration file)

**Step 2: Verify migration applied**

Use Supabase MCP `list_migrations` to confirm migration appears in list.

**Step 3: Verify schema changes**

Use Supabase MCP `execute_sql`:
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'is_super_admin';
```

Expected: Returns row with `is_super_admin` boolean column.

**Step 4: Verify businesses table**

Use Supabase MCP `execute_sql`:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'businesses'
  AND column_name IN ('featured_order', 'featured_requested', 'featured_requested_at');
```

Expected: Returns 3 rows with correct column types.

---

## Task 3: Update TypeScript Database Types

**Files:**
- Modify: `lib/types/database.ts`

**Step 1: Generate updated types from Supabase**

Use Supabase MCP `generate_typescript_types` tool to get latest types.

**Step 2: Update database.ts with new types**

Add to `businesses.Row` (around line 27):
```typescript
is_featured: boolean | null
featured_order: number | null
featured_requested: boolean | null
featured_requested_at: string | null
```

Add to `profiles.Row`:
```typescript
is_super_admin: boolean | null
```

**Step 3: Update Insert types**

In `businesses.Insert`, add:
```typescript
featured_order?: number | null
featured_requested?: boolean | null
featured_requested_at?: string | null
```

In `profiles.Insert`, add:
```typescript
is_super_admin?: boolean | null
```

**Step 4: Update Update types**

In `businesses.Update`, add:
```typescript
featured_order?: number | null
featured_requested?: boolean | null
featured_requested_at?: string | null
```

In `profiles.Update`, add:
```typescript
is_super_admin?: boolean | null
```

**Step 5: Commit type updates**

```bash
git add lib/types/database.ts
git commit -m "feat: update database types for featured businesses

- Add is_featured, featured_order, featured_requested fields to businesses
- Add is_super_admin to profiles
- Update Insert and Update types

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Refactor FeaturedBusinesses Component to BusinessSection

**Files:**
- Modify: `components/home/featured-businesses.tsx`

**Step 1: Update component props to support both sections**

Replace lines 6-10 with:
```typescript
type Business = {
  id: string; name: string; slug: string; description: string | null
  photos: string[] | null; whatsapp: string | null; address: string | null
  categories: { name: string; slug: string } | null
}

type BusinessSectionProps = {
  businesses: Business[]
  communitySlug: string
  title: string
  showBadge?: boolean
}
```

**Step 2: Update component signature**

Replace line 12 with:
```typescript
export function BusinessSection({
  businesses,
  communitySlug,
  title,
  showBadge = false
}: BusinessSectionProps) {
```

**Step 3: Update title rendering**

Replace lines 18-20 with:
```typescript
<h2 className="text-3xl font-heading font-black uppercase italic tracking-tight">
  Negocios <span className="text-primary underline decoration-4 underline-offset-4">{title}</span>
</h2>
```

**Step 4: Add badge to business cards conditionally**

Replace line 29 with:
```typescript
<div className="relative">
  {showBadge && (
    <div className="absolute -top-3 -right-3 z-10 bg-secondary text-black text-[10px] font-black uppercase tracking-widest px-3 py-1 rotate-[-2deg] border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
      Destacado
    </div>
  )}
  <BusinessCard key={biz.id} business={biz} communitySlug={communitySlug} />
</div>
```

**Step 5: Commit component refactor**

```bash
git add components/home/featured-businesses.tsx
git commit -m "refactor: convert FeaturedBusinesses to reusable BusinessSection

- Add title and showBadge props for flexibility
- Support both featured and recent business sections
- Add yellow DESTACADO badge for featured businesses
- Keep same neo-brutalist styling

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Update Homepage with Featured + Recent Sections

**Files:**
- Modify: `app/[community]/page.tsx`

**Step 1: Update imports**

Replace line 4 with:
```typescript
import { BusinessSection } from '@/components/home/featured-businesses'
```

**Step 2: Add featured businesses query**

Replace lines 19-25 with:
```typescript
const [businessCountRes, featuredRes, recentRes] = await Promise.all([
  supabase.from('businesses').select('id', { count: 'exact', head: true })
    .eq('community_id', community.id).eq('status', 'approved'),

  // Featured businesses query
  supabase.from('businesses').select('id, name, slug, description, photos, whatsapp, address, categories(name, slug)')
    .eq('community_id', community.id)
    .eq('status', 'approved')
    .eq('is_featured', true)
    .order('featured_order', { ascending: true, nullsFirst: false })
    .limit(3),

  // Recent businesses query (will exclude featured in next step)
  supabase.from('businesses').select('id, name, slug, description, photos, whatsapp, address, categories(name, slug)')
    .eq('community_id', community.id)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(10) // Fetch extra to account for featured exclusions
])
```

**Step 3: Filter out featured businesses from recent**

After line 25, add:
```typescript
// Exclude featured businesses from recent list
const featuredIds = featuredRes.data?.map(b => b.id) ?? []
const recentBusinesses = recentRes.data?.filter(b => !featuredIds.includes(b.id)).slice(0, 3) ?? []
```

**Step 4: Update JSX to render both sections**

Replace lines 27-34 with:
```typescript
return (
  <>
    <HeroBanner community={community} businessCount={businessCountRes.count ?? 0} />
    <QuickNav communitySlug={slug} />

    {/* Featured businesses section */}
    {featuredRes.data && featuredRes.data.length > 0 && (
      <BusinessSection
        businesses={featuredRes.data}
        communitySlug={slug}
        title="Destacados"
        showBadge={true}
      />
    )}

    {/* Recent businesses section */}
    {recentBusinesses.length > 0 && (
      <BusinessSection
        businesses={recentBusinesses}
        communitySlug={slug}
        title="Recientes"
        showBadge={false}
      />
    )}

    <RegisterCTA communitySlug={slug} />
  </>
)
```

**Step 5: Commit homepage updates**

```bash
git add app/[community]/page.tsx
git commit -m "feat: add featured and recent business sections to homepage

- Query featured businesses ordered by featured_order
- Query recent businesses excluding featured ones
- Render two separate sections with BusinessSection component
- Featured section shows DESTACADO badge
- Both sections show up to 3 businesses

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Create Featured Business API Route

**Files:**
- Create: `app/api/admin/businesses/[id]/featured/route.ts`

**Step 1: Create API route file**

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()

  // Get user profile to check role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_super_admin, community_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden - Must be admin' }, { status: 403 })
  }

  // Super admin can update is_featured and featured_order
  if (profile.is_super_admin) {
    const updateData: any = {
      is_featured: body.is_featured,
      featured_requested: false, // Clear request when super admin acts
    }

    // Only set featured_order if business is being featured
    if (body.is_featured && body.featured_order !== undefined) {
      updateData.featured_order = body.featured_order
    } else if (!body.is_featured) {
      updateData.featured_order = null
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

    return NextResponse.json({ data })
  }

  // Community admin can only request featured
  // Verify business belongs to their community
  const { data: business } = await supabase
    .from('businesses')
    .select('community_id')
    .eq('id', id)
    .single()

  if (!business || business.community_id !== profile.community_id) {
    return NextResponse.json({ error: 'Forbidden - Business not in your community' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('businesses')
    .update({
      featured_requested: true,
      featured_requested_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}
```

**Step 2: Commit API route**

```bash
git add app/api/admin/businesses/[id]/featured/route.ts
git commit -m "feat: add featured business management API route

- Super admins can set is_featured and featured_order
- Community admins can only request featured status
- Validate permissions based on role and community
- Clear featured_requested when super admin acts

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Update Admin Business Detail Page - Fetch Logic

**Files:**
- Modify: `app/admin/businesses/[id]/page.tsx`

**Step 1: Read current file to understand structure**

Use Read tool on `app/admin/businesses/[id]/page.tsx` to see current implementation.

**Step 2: Update business query to include featured fields**

Find the business query (around line 15-20) and add featured fields:
```typescript
.select('*, categories(name, slug), profiles!businesses_owner_id_profiles_fkey(full_name, phone), communities(name, slug)')
```

Ensure the query includes:
```typescript
is_featured, featured_order, featured_requested, featured_requested_at
```

**Step 3: Fetch current user profile with role check**

After business query, add:
```typescript
// Get current user profile to determine permissions
const { data: { user } } = await supabase.auth.getUser()
const { data: currentProfile } = await supabase
  .from('profiles')
  .select('role, is_super_admin, community_id')
  .eq('id', user?.id ?? '')
  .single()

const isSuperAdmin = currentProfile?.is_super_admin === true
const isCommunityAdmin = currentProfile?.role === 'admin' && !isSuperAdmin
const isAdminOfThisBusiness = isCommunityAdmin && currentProfile?.community_id === business.community_id
```

**Step 4: Pass props to page component**

Update the component to accept and pass these new props to client component:
```typescript
<BusinessDetailPage
  business={business}
  isSuperAdmin={isSuperAdmin}
  isCommunityAdmin={isAdminOfThisBusiness}
/>
```

**Step 5: Commit fetch logic updates**

```bash
git add app/admin/businesses/[id]/page.tsx
git commit -m "feat: add role-based permissions check to admin business page

- Fetch current user profile with role and is_super_admin
- Determine if user is super admin or community admin
- Pass permissions to client component for UI rendering

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Create Featured Business Management Client Component

**Files:**
- Create: `components/admin/featured-business-controls.tsx`

**Step 1: Create client component for super admins**

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useRouter } from 'next/navigation'

type Business = {
  id: string
  is_featured: boolean | null
  featured_order: number | null
  featured_requested: boolean | null
  featured_requested_at: string | null
}

type FeaturedBusinessControlsProps = {
  business: Business
  isSuperAdmin: boolean
  isCommunityAdmin: boolean
}

export function FeaturedBusinessControls({
  business,
  isSuperAdmin,
  isCommunityAdmin
}: FeaturedBusinessControlsProps) {
  const router = useRouter()
  const [isFeatured, setIsFeatured] = useState(business.is_featured ?? false)
  const [featuredOrder, setFeaturedOrder] = useState(business.featured_order ?? 1)
  const [loading, setLoading] = useState(false)

  const handleSaveFeatured = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/businesses/${business.id}/featured`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_featured: isFeatured,
          featured_order: isFeatured ? featuredOrder : null,
        }),
      })

      if (res.ok) {
        router.refresh()
        alert('Cambios guardados exitosamente')
      } else {
        const error = await res.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      alert('Error al guardar cambios')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleRequestFeatured = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/businesses/${business.id}/featured`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (res.ok) {
        router.refresh()
        alert('Solicitud enviada exitosamente')
      } else {
        const error = await res.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      alert('Error al enviar solicitud')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  // Render nothing if user has no admin permissions
  if (!isSuperAdmin && !isCommunityAdmin) {
    return null
  }

  // Super Admin View
  if (isSuperAdmin) {
    return (
      <div className="brutalist-card p-6">
        <h3 className="font-heading font-black uppercase text-lg mb-4">
          Destacar Negocio
        </h3>

        {business.featured_requested && (
          <div className="mb-4 p-3 bg-secondary/20 border-2 border-black">
            <p className="text-sm font-bold">
              ⚠️ Solicitud pendiente de destacado
            </p>
            <p className="text-xs text-muted-foreground">
              Solicitado: {business.featured_requested_at
                ? new Date(business.featured_requested_at).toLocaleDateString('es-CO')
                : 'Fecha desconocida'}
            </p>
          </div>
        )}

        <div className="flex items-center gap-3 mb-4">
          <Switch
            checked={isFeatured}
            onCheckedChange={setIsFeatured}
            disabled={loading}
          />
          <Label>Marcar como negocio destacado</Label>
        </div>

        {isFeatured && (
          <div className="mb-4">
            <Label htmlFor="featured-order">Orden de visualización</Label>
            <Input
              id="featured-order"
              type="number"
              value={featuredOrder}
              onChange={(e) => setFeaturedOrder(Number(e.target.value))}
              placeholder="1, 2, 3..."
              className="brutalist-input mt-1"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Números menores aparecen primero en el homepage
            </p>
          </div>
        )}

        <Button
          onClick={handleSaveFeatured}
          disabled={loading}
          className="brutalist-button"
        >
          {loading ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </div>
    )
  }

  // Community Admin View
  if (isCommunityAdmin) {
    return (
      <div className="brutalist-card p-6">
        <h3 className="font-heading font-black uppercase text-lg mb-4">
          Solicitar Destacado
        </h3>

        {business.featured_requested ? (
          <div className="p-3 bg-secondary/20 border-2 border-black">
            <p className="text-sm font-bold">✓ Solicitud enviada</p>
            <p className="text-xs text-muted-foreground">
              Pendiente de aprobación por super admin
            </p>
          </div>
        ) : business.is_featured ? (
          <div className="p-3 bg-primary/20 border-2 border-black">
            <p className="text-sm font-bold">★ Negocio destacado</p>
            <p className="text-xs text-muted-foreground">
              Este negocio está actualmente destacado
            </p>
          </div>
        ) : (
          <Button
            onClick={handleRequestFeatured}
            disabled={loading}
            className="brutalist-button"
          >
            {loading ? 'Enviando...' : 'Solicitar destacar este negocio'}
          </Button>
        )}
      </div>
    )
  }

  return null
}
```

**Step 2: Commit featured controls component**

```bash
git add components/admin/featured-business-controls.tsx
git commit -m "feat: add featured business controls component

- Super admin view: toggle featured + order input
- Community admin view: request featured button
- Show pending request indicator
- Handle API calls with loading states
- Neo-brutalist styling

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Integrate Featured Controls into Admin Page

**Files:**
- Modify: `app/admin/businesses/[id]/page.tsx`

**Step 1: Import the new component**

Add to imports at top of file:
```typescript
import { FeaturedBusinessControls } from '@/components/admin/featured-business-controls'
```

**Step 2: Add component to page layout**

Find the section where business details are rendered (likely after business info card), and add:
```typescript
{/* Featured Business Controls */}
<FeaturedBusinessControls
  business={{
    id: business.id,
    is_featured: business.is_featured,
    featured_order: business.featured_order,
    featured_requested: business.featured_requested,
    featured_requested_at: business.featured_requested_at,
  }}
  isSuperAdmin={isSuperAdmin}
  isCommunityAdmin={isAdminOfThisBusiness}
/>
```

**Step 3: Commit integration**

```bash
git add app/admin/businesses/[id]/page.tsx
git commit -m "feat: integrate featured controls into admin business page

- Add FeaturedBusinessControls component to page
- Pass business featured data and user permissions
- Component renders role-appropriate UI

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 10: Add Pending Featured Requests Indicator to Admin List

**Files:**
- Modify: `app/admin/businesses/page.tsx`

**Step 1: Update businesses query to include featured_requested**

Find the businesses query and ensure it selects:
```typescript
.select('id, name, slug, status, created_at, featured_requested, categories(name, slug), communities(name, slug)')
```

**Step 2: Add Badge import**

Add to imports:
```typescript
import { Badge } from '@/components/ui/badge'
```

**Step 3: Add visual indicator in business list**

In the business list rendering (likely in a table or grid), add after business name:
```typescript
{business.featured_requested && (
  <Badge className="ml-2 bg-secondary text-black border-2 border-black text-[10px] font-black uppercase tracking-widest">
    Solicitud destacado
  </Badge>
)}
```

**Step 4: Commit list indicator**

```bash
git add app/admin/businesses/page.tsx
git commit -m "feat: add featured request indicator to admin business list

- Show SOLICITUD DESTACADO badge on businesses with pending requests
- Helps super admins quickly identify pending featured requests
- Neo-brutalist badge styling

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 11: Manual Testing Checklist

**No files modified - testing only**

**Step 1: Test database migration**

Use Supabase MCP to verify:
```sql
-- Check profiles has is_super_admin
SELECT is_super_admin FROM profiles LIMIT 1;

-- Check businesses has featured fields
SELECT is_featured, featured_order, featured_requested FROM businesses LIMIT 1;

-- Test helper function
SELECT is_super_admin();
```

Expected: All queries return successfully

**Step 2: Create test super admin**

Use Supabase MCP:
```sql
UPDATE profiles
SET is_super_admin = TRUE, role = 'admin'
WHERE id = 'YOUR_USER_ID';
```

Replace YOUR_USER_ID with your actual user ID from auth.users.

**Step 3: Test homepage rendering**

1. Navigate to `/{community}/` in browser
2. Verify "Negocios Destacados" section does NOT appear (no featured businesses yet)
3. Verify "Negocios Recientes" section shows up to 3 recent businesses

**Step 4: Test super admin featured workflow**

1. Login as super admin
2. Navigate to admin business detail page
3. Verify "Destacar Negocio" section appears
4. Toggle "Marcar como negocio destacado" ON
5. Set featured_order to 1
6. Click "Guardar cambios"
7. Navigate to homepage
8. Verify business appears in "Negocios Destacados" section with yellow badge

**Step 5: Test featured ordering**

1. Feature 2 more businesses with orders 2 and 3
2. Navigate to homepage
3. Verify 3 businesses appear in correct order (1, 2, 3)
4. Verify "Negocios Recientes" excludes these 3 featured businesses

**Step 6: Test community admin request workflow**

1. Create test community admin (role='admin', is_super_admin=false, community_id set)
2. Login as community admin
3. Navigate to admin business detail page
4. Verify "Solicitar Destacado" section appears (NOT full controls)
5. Click "Solicitar destacar este negocio"
6. Verify success message and request sent
7. Login as super admin
8. Verify "⚠️ Solicitud pendiente" indicator appears
9. Navigate to admin business list
10. Verify "SOLICITUD DESTACADO" badge appears on business

**Step 7: Test security**

1. Login as regular merchant (business owner)
2. Navigate to admin pages
3. Verify NO featured controls appear
4. Try to call API directly: `PATCH /api/admin/businesses/{id}/featured`
5. Expected: 403 Forbidden

**Step 8: Document test results**

Create test report:
```bash
echo "# Featured Businesses Test Report

Date: $(date)

## Database Migration
- [x] Migration applied successfully
- [x] Helper functions created
- [x] RLS policies active

## Homepage
- [x] Featured section appears when businesses featured
- [x] Recent section excludes featured businesses
- [x] Badge displays on featured businesses

## Super Admin
- [x] Can toggle featured status
- [x] Can set featured order
- [x] Changes persist and appear on homepage

## Community Admin
- [x] Can request featured status
- [x] Cannot set featured directly
- [x] Request indicator visible to super admin

## Security
- [x] Non-admins cannot access featured controls
- [x] API returns 403 for unauthorized users
- [x] RLS policies enforced

All tests passed ✓
" > docs/test-reports/2026-02-23-featured-businesses-test.md
```

---

## Task 12: Final Verification and Cleanup

**Files:**
- Review: All modified files

**Step 1: Run type check**

```bash
npm run type-check
```

Expected: No type errors

**Step 2: Check for unused imports**

Review all modified files for unused imports and remove them.

**Step 3: Verify neo-brutalist styling consistency**

Check all new UI components use:
- `.brutalist-card` class
- `.brutalist-button` class
- `.brutalist-input` class
- 2-4px black borders
- Hard shadow effects
- Uppercase labels with tracking-widest

**Step 4: Create final commit**

```bash
git add -A
git commit -m "test: verify featured businesses implementation complete

- All manual tests passing
- Type checking clean
- Neo-brutalist styling consistent
- Security verified

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

**Step 5: Create completion summary**

Document what was implemented:
```markdown
# Featured Businesses Implementation - Complete

## What Was Built

✅ Database migration with featured fields and super admin role
✅ Role-based permissions (super admin + community admin)
✅ Two homepage sections (Featured + Recent, no duplicates)
✅ Manual ordering for featured businesses
✅ Request/approval workflow
✅ Admin UI with role-based controls
✅ API route for featured management
✅ RLS policies enforcing security
✅ Visual indicators and badges
✅ Neo-brutalist styling maintained

## Files Created
- supabase/migrations/005_add_featured_businesses_and_super_admin.sql
- app/api/admin/businesses/[id]/featured/route.ts
- components/admin/featured-business-controls.tsx
- docs/test-reports/2026-02-23-featured-businesses-test.md

## Files Modified
- lib/types/database.ts
- components/home/featured-businesses.tsx
- app/[community]/page.tsx
- app/admin/businesses/[id]/page.tsx
- app/admin/businesses/page.tsx

## Next Steps
- Monitor featured business performance
- Gather feedback from community admins
- Consider email notifications for super admins
- Track conversion rates for featured businesses
```

---

## Success Criteria

- [ ] Migration applied successfully
- [ ] TypeScript types updated and type-check passes
- [ ] Homepage shows featured section with manual ordering
- [ ] Homepage recent section excludes featured businesses
- [ ] Super admins can mark businesses as featured
- [ ] Super admins can set featured order
- [ ] Community admins can request featured status
- [ ] Community admins cannot directly set featured
- [ ] API route enforces role-based permissions
- [ ] RLS policies block unauthorized updates
- [ ] Visual indicators for pending requests
- [ ] Neo-brutalist styling maintained throughout
- [ ] All manual tests passing

## Rollback Plan

If issues arise:

1. **Database rollback:**
```sql
-- Remove RLS policies
DROP POLICY IF EXISTS "businesses_update_featured_super_admin" ON businesses;
DROP POLICY IF EXISTS "businesses_update_featured_request_community_admin" ON businesses;

-- Remove helper functions
DROP FUNCTION IF EXISTS is_super_admin();
DROP FUNCTION IF EXISTS can_manage_featured(UUID);

-- Remove indexes
DROP INDEX IF EXISTS idx_businesses_featured_order;
DROP INDEX IF EXISTS idx_businesses_featured_requested;

-- Remove columns
ALTER TABLE businesses DROP COLUMN IF EXISTS featured_order;
ALTER TABLE businesses DROP COLUMN IF EXISTS featured_requested;
ALTER TABLE businesses DROP COLUMN IF EXISTS featured_requested_at;
ALTER TABLE profiles DROP COLUMN IF EXISTS is_super_admin;
```

2. **Code rollback:**
```bash
git revert HEAD~N  # Revert last N commits
git push origin master
```

---

**Total estimated time:** 2-3 hours for complete implementation and testing
