# Admin Panel Enhancements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build comprehensive admin panel with three-tier role system (user/moderator/admin), business management enhancements, user management, statistics dashboard, and category reordering.

**Architecture:** Phased implementation starting with database migration and permission system, then building features incrementally. Each phase is independently testable and deployable. Uses granular permission checks instead of simple role checks for maximum flexibility.

**Tech Stack:** Next.js 16, React 19, TypeScript, Supabase (PostgreSQL + RLS), Radix UI, @dnd-kit/sortable, Tailwind CSS

---

## FOUNDATION: Database Migration & Permission System

### Task 1: Database Migration - Add Role System Columns

**Files:**
- Create: `supabase/migrations/20260227000001_admin_panel_enhancements.sql`

**Step 1: Create migration file**

```sql
-- Admin Panel Enhancements Migration
-- Date: 2026-02-27
-- Description: Add three-tier role system, user suspension, and business rejection tracking

-- ============================================================================
-- PROFILES TABLE - Add suspension and role management columns
-- ============================================================================

-- Add suspension tracking
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS suspended_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS suspension_reason TEXT;

-- Add role constraint (user/moderator/admin)
DO $$
BEGIN
  -- Drop constraint if it exists
  ALTER TABLE profiles DROP CONSTRAINT IF EXISTS valid_role;

  -- Add new constraint
  ALTER TABLE profiles
    ADD CONSTRAINT valid_role
    CHECK (role IN ('user', 'moderator', 'admin'));
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- Set default role for existing NULL values
UPDATE profiles
SET role = 'user'
WHERE role IS NULL OR role = '';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_suspended ON profiles(is_suspended) WHERE is_suspended = TRUE;
CREATE INDEX IF NOT EXISTS idx_profiles_is_super_admin ON profiles(is_super_admin) WHERE is_super_admin = TRUE;

-- ============================================================================
-- BUSINESSES TABLE - Add rejection tracking and edit history
-- ============================================================================

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS rejection_details TEXT,
  ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS last_edited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_businesses_rejection_reason ON businesses(rejection_reason) WHERE rejection_reason IS NOT NULL;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Check if user is moderator or admin
CREATE OR REPLACE FUNCTION is_moderator_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT COALESCE(role IN ('moderator', 'admin'), FALSE) OR COALESCE(is_super_admin, FALSE)
    FROM profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user can manage users (admin only)
CREATE OR REPLACE FUNCTION can_manage_users()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT COALESCE(role = 'admin', FALSE) OR COALESCE(is_super_admin, FALSE)
    FROM profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Business approval (moderators can approve)
DROP POLICY IF EXISTS "Admins can approve businesses" ON businesses;
CREATE POLICY "Staff can approve businesses" ON businesses
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND (role IN ('admin', 'moderator') OR is_super_admin = TRUE)
    )
  );

-- Category management (admins only)
DROP POLICY IF EXISTS "Admins can manage categories" ON categories;
CREATE POLICY "Admins can manage categories" ON categories
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND (role = 'admin' OR is_super_admin = TRUE)
    )
  );

-- User profile viewing (admins can see all)
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND (p.role = 'admin' OR p.is_super_admin = TRUE)
    )
  );

-- User profile updating (admins can update any, users can update own)
DROP POLICY IF EXISTS "Users can update profiles" ON profiles;
CREATE POLICY "Users can update profiles" ON profiles
  FOR UPDATE
  USING (
    auth.uid() = id
    OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND (p.role = 'admin' OR p.is_super_admin = TRUE)
    )
  )
  WITH CHECK (
    -- Prevent users from escalating their own role
    (NEW.role = OLD.role OR auth.uid() IN (
      SELECT id FROM profiles
      WHERE role = 'admin' OR is_super_admin = TRUE
    ))
    AND
    -- Prevent users from unsuspending themselves
    (NEW.is_suspended = OLD.is_suspended OR auth.uid() IN (
      SELECT id FROM profiles
      WHERE role = 'admin' OR is_super_admin = TRUE
    ))
  );

-- Prevent suspended users from creating content
DROP POLICY IF EXISTS "Suspended users cannot create businesses" ON businesses;
CREATE POLICY "Suspended users cannot create businesses" ON businesses
  FOR INSERT
  WITH CHECK (
    NOT EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_suspended = TRUE
    )
  );

DROP POLICY IF EXISTS "Suspended users cannot create posts" ON community_posts;
CREATE POLICY "Suspended users cannot create posts" ON community_posts
  FOR INSERT
  WITH CHECK (
    NOT EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_suspended = TRUE
    )
  );
```

**Step 2: Apply migration via Supabase**

Run in Supabase SQL Editor or via CLI:
```bash
supabase db push
```

Expected: Migration applied successfully, all columns created, indexes created, policies created

**Step 3: Verify migration**

Query to check:
```sql
-- Check profiles columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN ('is_suspended', 'suspended_at', 'suspended_by', 'suspension_reason');

-- Check businesses columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'businesses'
  AND column_name IN ('rejection_reason', 'rejection_details', 'rejected_by', 'rejected_at', 'last_edited_by', 'admin_notes');
```

Expected: All columns present

**Step 4: Regenerate TypeScript types**

```bash
npm run db:types
```

Expected: `lib/types/database.ts` updated with new columns

**Step 5: Commit**

```bash
git add supabase/migrations/ lib/types/database.ts
git commit -m "feat(db): add admin panel enhancements migration

- Add user suspension columns (is_suspended, suspended_at, suspended_by, suspension_reason)
- Add business rejection tracking (rejection_reason, rejection_details, rejected_by, rejected_at)
- Add business edit tracking (last_edited_by, admin_notes)
- Add role constraint (user/moderator/admin)
- Create helper functions (is_moderator_or_admin, can_manage_users)
- Update RLS policies for new role system
- Prevent suspended users from creating content

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 2: Permission System - Core Infrastructure

**Files:**
- Create: `lib/auth/permissions.ts`
- Create: `lib/auth/api-protection.ts`

**Step 1: Create permission types and helper**

File: `lib/auth/permissions.ts`
```typescript
import { Database } from '@/lib/types/database'

export type UserRole = 'user' | 'moderator' | 'admin'

export interface UserPermissions {
  // Admin panel access
  canViewAdminPanel: boolean

  // Business management
  canApproveBusinesses: boolean
  canRejectBusinesses: boolean
  canEditAnyBusiness: boolean
  canDeleteBusinesses: boolean

  // Category management
  canManageCategories: boolean

  // User management
  canViewUsers: boolean
  canManageRoles: boolean
  canSuspendUsers: boolean
  canDeleteUsers: boolean

  // Analytics & reporting
  canViewStatistics: boolean
  canExportData: boolean

  // Community content
  canManageCommunityContent: boolean
  canManageAlerts: boolean
  canManageServices: boolean
}

/**
 * Get permissions for a given role and super admin status
 * @param role - User role (user/moderator/admin)
 * @param isSuperAdmin - Whether user is a super admin
 * @returns Object with boolean permissions
 */
export function getPermissions(
  role: UserRole | null | undefined,
  isSuperAdmin: boolean | null | undefined
): UserPermissions {
  // Super admin has all permissions across all communities
  if (isSuperAdmin === true) {
    return {
      canViewAdminPanel: true,
      canApproveBusinesses: true,
      canRejectBusinesses: true,
      canEditAnyBusiness: true,
      canDeleteBusinesses: true,
      canManageCategories: true,
      canViewUsers: true,
      canManageRoles: true,
      canSuspendUsers: true,
      canDeleteUsers: true,
      canViewStatistics: true,
      canExportData: true,
      canManageCommunityContent: true,
      canManageAlerts: true,
      canManageServices: true,
    }
  }

  // Admin role (community-level full access)
  if (role === 'admin') {
    return {
      canViewAdminPanel: true,
      canApproveBusinesses: true,
      canRejectBusinesses: true,
      canEditAnyBusiness: true,
      canDeleteBusinesses: true,
      canManageCategories: true,
      canViewUsers: true,
      canManageRoles: true,
      canSuspendUsers: true,
      canDeleteUsers: true,
      canViewStatistics: true,
      canExportData: true,
      canManageCommunityContent: true,
      canManageAlerts: true,
      canManageServices: true,
    }
  }

  // Moderator role (content moderation, no user/category management)
  if (role === 'moderator') {
    return {
      canViewAdminPanel: true,
      canApproveBusinesses: true,
      canRejectBusinesses: true,
      canEditAnyBusiness: true,
      canDeleteBusinesses: false,
      canManageCategories: false,
      canViewUsers: true,
      canManageRoles: false,
      canSuspendUsers: false,
      canDeleteUsers: false,
      canViewStatistics: true,
      canExportData: false,
      canManageCommunityContent: true,
      canManageAlerts: true,
      canManageServices: false,
    }
  }

  // Default user (no admin permissions)
  return {
    canViewAdminPanel: false,
    canApproveBusinesses: false,
    canRejectBusinesses: false,
    canEditAnyBusiness: false,
    canDeleteBusinesses: false,
    canManageCategories: false,
    canViewUsers: false,
    canManageRoles: false,
    canSuspendUsers: false,
    canDeleteUsers: false,
    canViewStatistics: false,
    canExportData: false,
    canManageCommunityContent: false,
    canManageAlerts: false,
    canManageServices: false,
  }
}

/**
 * Helper to check if user has staff access (moderator or admin)
 */
export function isStaff(
  role: UserRole | null | undefined,
  isSuperAdmin: boolean | null | undefined
): boolean {
  return isSuperAdmin === true || role === 'admin' || role === 'moderator'
}

/**
 * Helper to check if user is admin (for backward compatibility)
 */
export function isAdmin(
  role: UserRole | null | undefined,
  isSuperAdmin: boolean | null | undefined
): boolean {
  return isSuperAdmin === true || role === 'admin'
}
```

**Step 2: Create API protection helper**

File: `lib/auth/api-protection.ts`
```typescript
import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getPermissions, type UserPermissions } from './permissions'
import { Database } from '@/lib/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']

/**
 * Require a specific permission for an API route
 * Returns authorization result with error response if unauthorized
 */
export async function requirePermission(
  permission: keyof UserPermissions,
  supabase: SupabaseClient<Database>
): Promise<{ authorized: true } | { authorized: false; error: NextResponse }> {
  // Check if user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      authorized: false,
      error: NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      ),
    }
  }

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, is_super_admin, is_suspended')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return {
      authorized: false,
      error: NextResponse.json(
        { error: 'Perfil no encontrado' },
        { status: 404 }
      ),
    }
  }

  // Check if user is suspended
  if (profile.is_suspended) {
    return {
      authorized: false,
      error: NextResponse.json(
        { error: 'Cuenta suspendida' },
        { status: 403 }
      ),
    }
  }

  // Check permission
  const permissions = getPermissions(
    profile.role as 'user' | 'moderator' | 'admin' | null,
    profile.is_super_admin
  )

  if (!permissions[permission]) {
    return {
      authorized: false,
      error: NextResponse.json(
        { error: 'No autorizado para esta acción' },
        { status: 403 }
      ),
    }
  }

  return { authorized: true }
}
```

**Step 3: Commit**

```bash
git add lib/auth/
git commit -m "feat(auth): add granular permission system

- Create permission types (UserPermissions interface)
- Implement getPermissions() for role-based access control
- Add API protection helper (requirePermission)
- Support three-tier role system (user/moderator/admin + super_admin)
- Check suspension status in API routes

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 3: Update Middleware for Suspension Check

**Files:**
- Modify: `lib/supabase/middleware.ts`

**Step 1: Read current middleware**

```bash
cat lib/supabase/middleware.ts
```

**Step 2: Add suspension check after auth check**

Find the section after `supabase.auth.getUser()` and add:

```typescript
// After getting user, check if suspended
if (user) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_suspended')
    .eq('id', user.id)
    .single()

  if (profile?.is_suspended) {
    return NextResponse.redirect(new URL('/suspended', request.url))
  }
}
```

**Step 3: Commit**

```bash
git add lib/supabase/middleware.ts
git commit -m "feat(middleware): add suspension check

- Redirect suspended users to /suspended page
- Check suspension status after authentication
- Prevent suspended users from accessing protected routes

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## PHASE 1: Business Management Enhancements

### Task 4: Update Admin Layout with Permission Check

**Files:**
- Modify: `app/admin/layout.tsx:14-15`

**Step 1: Import permission helper**

Add to imports:
```typescript
import { getPermissions } from '@/lib/auth/permissions'
```

**Step 2: Replace role check with permission check**

Replace lines 14-15:
```typescript
// OLD
const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
if (profile?.role !== 'admin') redirect('/')

// NEW
const { data: profile } = await supabase
  .from('profiles')
  .select('role, is_super_admin')
  .eq('id', user.id)
  .single()

const permissions = getPermissions(profile?.role as any, profile?.is_super_admin)
if (!permissions.canViewAdminPanel) redirect('/')
```

**Step 3: Commit**

```bash
git add app/admin/layout.tsx
git commit -m "feat(admin): update layout with permission system

- Use getPermissions() instead of direct role check
- Support moderator access to admin panel
- Check canViewAdminPanel permission

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 5: Enhanced Business Filters - Add Category Filter

**Files:**
- Modify: `app/admin/businesses/page.tsx:28-30,46-56`

**Step 1: Add category state and fetch**

After line 29 (add state):
```typescript
const [categoryFilter, setCategoryFilter] = useState('all')
const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
```

After `fetchBusinesses` function, add:
```typescript
async function fetchCategories() {
  const { data } = await supabase
    .from('categories')
    .select('id, name')
    .order('sort_order', { ascending: true })

  if (data) setCategories(data)
}

useEffect(() => {
  fetchCategories()
}, [])
```

**Step 2: Add category filter to query**

After line 55 (add filter):
```typescript
if (categoryFilter !== 'all') {
  query = query.eq('category_id', categoryFilter)
}
```

**Step 3: Add category filter to useEffect dependency**

Change line 106:
```typescript
}, [statusFilter, categoryFilter])
```

**Step 4: Add category filter UI**

After line 136 (after status Select):
```typescript
<Select value={categoryFilter} onValueChange={setCategoryFilter}>
  <SelectTrigger className="brutalist-input w-64">
    <SelectValue placeholder="Filtrar por categoría" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">Todas las categorías</SelectItem>
    {categories.map(cat => (
      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
    ))}
  </SelectContent>
</Select>
```

**Step 5: Commit**

```bash
git add app/admin/businesses/page.tsx
git commit -m "feat(admin): add category filter to business list

- Add category filter dropdown
- Fetch categories on mount
- Filter businesses by category_id
- Integrate with existing status filter

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 6: Enhanced Business Filters - Add Search

**Files:**
- Modify: `app/admin/businesses/page.tsx:29,56,137`

**Step 1: Add search state**

After line 29:
```typescript
const [searchQuery, setSearchQuery] = useState('')
```

**Step 2: Add search filter to query**

After line 56 (after category filter):
```typescript
if (searchQuery.trim()) {
  query = query.ilike('name', `%${searchQuery.trim()}%`)
}
```

**Step 3: Add search input UI**

After the category Select (after line 137):
```typescript
<div className="relative flex-1">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black/40" />
  <Input
    placeholder="Buscar por nombre..."
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    className="brutalist-input pl-10"
  />
</div>
```

**Step 4: Import Search icon**

Add to imports:
```typescript
import { Eye, Loader2, Search } from 'lucide-react'
```

**Step 5: Commit**

```bash
git add app/admin/businesses/page.tsx
git commit -m "feat(admin): add search to business list

- Add search input with icon
- Filter businesses by name (case-insensitive)
- Integrate with status and category filters

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 7: Rejection Dialog Component

**Files:**
- Create: `components/admin/rejection-dialog.tsx`

**Step 1: Create rejection dialog component**

```typescript
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface RejectionDialogProps {
  businessId: string
  businessName: string
  onSuccess?: () => void
}

const REJECTION_REASONS = [
  { value: 'incomplete', label: 'Información incompleta o inexacta' },
  { value: 'poor_photos', label: 'Fotos de baja calidad o inapropiadas' },
  { value: 'duplicate', label: 'Negocio duplicado' },
  { value: 'wrong_category', label: 'No corresponde a la categoría' },
  { value: 'inappropriate', label: 'Contenido inapropiado' },
  { value: 'other', label: 'Otro (especificar)' },
]

export function RejectionDialog({ businessId, businessName, onSuccess }: RejectionDialogProps) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleReject() {
    if (!reason) {
      toast.error('Selecciona un motivo de rechazo')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/businesses/${businessId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rejection_reason: reason,
          rejection_details: details.trim() || null,
        }),
      })

      if (!response.ok) {
        throw new Error('Error al rechazar negocio')
      }

      toast.success('Negocio rechazado')
      setOpen(false)

      if (onSuccess) {
        onSuccess()
      } else {
        router.push('/admin/businesses')
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al rechazar negocio')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="destructive"
          className="brutalist-button border-2 border-black"
        >
          <XCircle className="h-4 w-4 mr-2" /> Rechazar
        </Button>
      </DialogTrigger>

      <DialogContent className="brutalist-card max-w-md">
        <DialogHeader className="border-b-2 border-black pb-4">
          <DialogTitle className="font-heading font-black uppercase italic tracking-tighter text-xl">
            Rechazar: {businessName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div>
            <Label className="text-xs font-black uppercase tracking-widest text-black/60">
              Motivo del rechazo *
            </Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="brutalist-input mt-2">
                <SelectValue placeholder="Selecciona un motivo" />
              </SelectTrigger>
              <SelectContent>
                {REJECTION_REASONS.map(r => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-black uppercase tracking-widest text-black/60">
              Detalles adicionales (opcional)
            </Label>
            <Textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Proporciona más información para el comerciante..."
              className="brutalist-input mt-2"
              rows={4}
            />
          </div>

          <Button
            onClick={handleReject}
            disabled={loading || !reason}
            className="brutalist-button bg-red-600 text-white hover:bg-red-700 w-full h-12"
          >
            {loading ? 'Rechazando...' : 'Confirmar Rechazo'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

**Step 2: Commit**

```bash
git add components/admin/rejection-dialog.tsx
git commit -m "feat(admin): create rejection dialog component

- Add predefined rejection reasons dropdown
- Include optional details textarea
- Submit to /api/businesses/[id]/reject endpoint
- Show confirmation toast and redirect
- Neo-brutalist design

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 8: Update Reject API Route with Feedback

**Files:**
- Modify: `app/api/businesses/[id]/reject/route.ts`

**Step 1: Update reject route to handle feedback**

Replace entire file content:
```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/auth/api-protection'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  // Check permission
  const auth = await requirePermission('canRejectBusinesses', supabase)
  if (!auth.authorized) return auth.error

  // Get rejection feedback from body
  const body = await request.json()
  const { rejection_reason, rejection_details } = body

  if (!rejection_reason) {
    return NextResponse.json(
      { error: 'Se requiere motivo de rechazo' },
      { status: 400 }
    )
  }

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()

  // Update business with rejection info
  const { data, error } = await supabase
    .from('businesses')
    .update({
      status: 'rejected',
      rejection_reason,
      rejection_details: rejection_details || null,
      rejected_by: user!.id,
      rejected_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error rejecting business:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // TODO: Send notification to business owner about rejection

  return NextResponse.json({ success: true, data })
}
```

**Step 2: Commit**

```bash
git add app/api/businesses/[id]/reject/route.ts
git commit -m "feat(api): add rejection feedback to reject route

- Accept rejection_reason and rejection_details from request body
- Store rejected_by and rejected_at timestamps
- Use requirePermission for authorization
- Return error if no rejection reason provided

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 9: Update Business Detail Page with Rejection Dialog

**Files:**
- Modify: `app/admin/businesses/[id]/page.tsx:12,59-69,276-280`

**Step 1: Import RejectionDialog**

Add to imports (line 12):
```typescript
import { RejectionDialog } from '@/components/admin/rejection-dialog'
```

**Step 2: Remove old handleAction function**

Delete lines 59-69 (the old handleAction function)

**Step 3: Update approve action to use fetch**

Replace with:
```typescript
async function handleApprove() {
  setLoading(true)
  const res = await fetch(`/api/businesses/${id}/approve`, { method: 'POST' })
  setLoading(false)
  if (res.ok) {
    toast.success('Negocio aprobado')
    router.push('/admin/businesses')
  } else {
    toast.error('Error procesando acción')
  }
}
```

**Step 4: Replace action buttons with new implementation**

Replace lines 276-280 with:
```typescript
{business.status === 'pending' && (
  <div className="flex gap-4 pt-6 mt-6 border-t-4 border-dashed border-black">
    <Button
      onClick={handleApprove}
      disabled={loading}
      className="flex-1 bg-green-500 hover:bg-green-600 border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-white font-black uppercase italic h-14 text-base"
    >
      <CheckCircle className="h-5 w-5 mr-2" /> Aprobar Negocio
    </Button>
    <RejectionDialog
      businessId={id}
      businessName={business.name}
    />
  </div>
)}
```

**Step 5: Commit**

```bash
git add app/admin/businesses/[id]/page.tsx
git commit -m "feat(admin): integrate rejection dialog in business detail

- Replace old reject button with RejectionDialog component
- Simplify approve action handler
- Show rejection feedback UI for pending businesses

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 10: Business Edit Page

**Files:**
- Create: `app/admin/businesses/[id]/edit/page.tsx`

**Step 1: Create edit page (skeleton first)**

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Breadcrumbs } from '@/components/shared/breadcrumbs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'

type Business = {
  id: string
  name: string
  slug: string
  description: string | null
  category_id: string
  address: string | null
  phone: string | null
  whatsapp: string | null
  email: string | null
  website: string | null
  admin_notes: string | null
}

type Category = {
  id: string
  name: string
}

export default function AdminBusinessEditPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [business, setBusiness] = useState<Business | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [adminNotes, setAdminNotes] = useState('')

  useEffect(() => {
    fetchData()
  }, [id])

  async function fetchData() {
    setLoading(true)

    // Fetch business
    const { data: bizData } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', id)
      .single()

    if (bizData) {
      setBusiness(bizData)
      setName(bizData.name)
      setDescription(bizData.description || '')
      setCategoryId(bizData.category_id)
      setAddress(bizData.address || '')
      setPhone(bizData.phone || '')
      setWhatsapp(bizData.whatsapp || '')
      setEmail(bizData.email || '')
      setWebsite(bizData.website || '')
      setAdminNotes(bizData.admin_notes || '')
    }

    // Fetch categories
    const { data: catData } = await supabase
      .from('categories')
      .select('id, name')
      .order('sort_order')

    if (catData) setCategories(catData)

    setLoading(false)
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error('El nombre es requerido')
      return
    }

    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const response = await fetch(`/api/businesses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          category_id: categoryId,
          address: address.trim() || null,
          phone: phone.trim() || null,
          whatsapp: whatsapp.trim() || null,
          email: email.trim() || null,
          website: website.trim() || null,
          admin_notes: adminNotes.trim() || null,
          last_edited_by: user?.id,
        }),
      })

      if (!response.ok) throw new Error('Error al guardar')

      toast.success('Negocio actualizado exitosamente')
      router.push(`/admin/businesses/${id}`)
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al guardar cambios')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center py-12">Cargando...</div>
  }

  if (!business) {
    return <div className="text-center py-12">Negocio no encontrado</div>
  }

  return (
    <div className="space-y-8">
      <Breadcrumbs
        items={[
          { label: 'Administración', href: '/admin/businesses' },
          { label: 'Negocios', href: '/admin/businesses' },
          { label: business.name, href: `/admin/businesses/${id}` },
          { label: 'Editar', active: true },
        ]}
      />

      <div className="flex items-center justify-between border-b-4 border-black pb-4">
        <h1 className="text-4xl font-heading font-black uppercase italic tracking-tighter">
          Editar <span className="text-primary italic">{business.name}</span>
        </h1>
        <Link href={`/admin/businesses/${id}`}>
          <Button variant="outline" className="brutalist-button">
            <ArrowLeft className="h-4 w-4 mr-2" /> Volver
          </Button>
        </Link>
      </div>

      <Card className="brutalist-card">
        <CardHeader className="border-b-2 border-black">
          <CardTitle className="font-heading font-black uppercase italic">
            Información del Negocio
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Name */}
          <div>
            <Label className="text-xs font-black uppercase tracking-widest text-black/60">
              Nombre del Negocio *
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="brutalist-input mt-2"
              placeholder="Ej: Tienda Don José"
            />
          </div>

          {/* Category */}
          <div>
            <Label className="text-xs font-black uppercase tracking-widest text-black/60">
              Categoría *
            </Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="brutalist-input mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div>
            <Label className="text-xs font-black uppercase tracking-widest text-black/60">
              Descripción
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="brutalist-input mt-2"
              rows={4}
              placeholder="Describe el negocio..."
            />
          </div>

          {/* Address */}
          <div>
            <Label className="text-xs font-black uppercase tracking-widest text-black/60">
              Dirección
            </Label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="brutalist-input mt-2"
              placeholder="Ej: Carrera 10 #5-20"
            />
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-black uppercase tracking-widest text-black/60">
                WhatsApp
              </Label>
              <Input
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="brutalist-input mt-2"
                placeholder="573001234567"
              />
            </div>
            <div>
              <Label className="text-xs font-black uppercase tracking-widest text-black/60">
                Teléfono
              </Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="brutalist-input mt-2"
                placeholder="3001234567"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-black uppercase tracking-widest text-black/60">
                Email
              </Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="brutalist-input mt-2"
                placeholder="contacto@negocio.com"
              />
            </div>
            <div>
              <Label className="text-xs font-black uppercase tracking-widest text-black/60">
                Sitio Web
              </Label>
              <Input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="brutalist-input mt-2"
                placeholder="https://negocio.com"
              />
            </div>
          </div>

          {/* Admin Notes */}
          <div className="border-t-2 border-dashed border-black pt-6">
            <Label className="text-xs font-black uppercase tracking-widest text-black/60">
              Notas Administrativas (Solo Visible para Admins)
            </Label>
            <Textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              className="brutalist-input mt-2 bg-secondary/10"
              rows={3}
              placeholder="Notas internas sobre este negocio..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <Button
              onClick={handleSave}
              disabled={saving || !name.trim() || !categoryId}
              className="brutalist-button flex-1 bg-primary text-white h-12"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
            <Link href={`/admin/businesses/${id}`} className="flex-1">
              <Button
                variant="outline"
                className="brutalist-button w-full h-12"
              >
                Cancelar
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add app/admin/businesses/[id]/edit/
git commit -m "feat(admin): create business edit page

- Add edit form for business information
- Include all editable fields (name, category, description, contact)
- Add admin notes field (admin-only)
- Track last_edited_by on save
- Neo-brutalist design with breadcrumbs

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

---

### Task 11: Business PATCH API Route

**Files:**
- Modify: `app/api/businesses/[id]/route.ts`

**Step 1: Add PATCH handler**

Add after any existing handlers:
```typescript
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  // Check permission or ownership
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { data: business } = await supabase
    .from('businesses')
    .select('owner_id')
    .eq('id', id)
    .single()

  if (!business) {
    return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_super_admin')
    .eq('id', user.id)
    .single()

  const permissions = getPermissions(profile?.role as any, profile?.is_super_admin)
  const isOwner = business.owner_id === user.id

  if (!isOwner && !permissions.canEditAnyBusiness) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  // Get update data from body
  const body = await request.json()

  // Update business
  const { data, error } = await supabase
    .from('businesses')
    .update({
      ...body,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating business:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data })
}
```

**Step 2: Import getPermissions**

Add to imports:
```typescript
import { getPermissions } from '@/lib/auth/permissions'
```

**Step 3: Commit**

```bash
git add app/api/businesses/[id]/route.ts
git commit -m "feat(api): add PATCH handler for business updates

- Allow owners or admins to edit businesses
- Check canEditAnyBusiness permission for admins
- Update updated_at timestamp
- Track last_edited_by in request body

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 12: Business DELETE API Route

**Files:**
- Modify: `app/api/businesses/[id]/route.ts`

**Step 1: Add DELETE handler**

Add after PATCH handler:
```typescript
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  // Check permission (admin only)
  const auth = await requirePermission('canDeleteBusinesses', supabase)
  if (!auth.authorized) return auth.error

  // Get business photos for cleanup
  const { data: business } = await supabase
    .from('businesses')
    .select('photos')
    .eq('id', id)
    .single()

  if (!business) {
    return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })
  }

  // Delete photos from storage
  if (business.photos && Array.isArray(business.photos)) {
    for (const photoUrl of business.photos) {
      try {
        // Extract file path from URL
        const urlParts = photoUrl.split('/')
        const fileName = urlParts[urlParts.length - 1]

        await supabase.storage
          .from('business-photos')
          .remove([fileName])
      } catch (error) {
        console.error('Error deleting photo:', error)
        // Continue with business deletion even if photo deletion fails
      }
    }
  }

  // Delete business record
  const { error } = await supabase
    .from('businesses')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting business:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
```

**Step 2: Import requirePermission**

Add to imports:
```typescript
import { requirePermission } from '@/lib/auth/api-protection'
```

**Step 3: Commit**

```bash
git add app/api/businesses/[id]/route.ts
git commit -m "feat(api): add DELETE handler for businesses

- Require canDeleteBusinesses permission (admin only)
- Delete photos from storage before deleting business
- Handle storage errors gracefully
- Return success response

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 13: Add Edit and Delete Buttons to Business Detail

**Files:**
- Modify: `app/admin/businesses/[id]/page.tsx`

**Step 1: Add delete dialog state and function**

After existing state (around line 35):
```typescript
const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
const [deleting, setDeleting] = useState(false)
```

After handleApprove function:
```typescript
async function handleDelete() {
  setDeleting(true)
  try {
    const response = await fetch(`/api/businesses/${id}`, {
      method: 'DELETE',
    })

    if (!response.ok) throw new Error('Error al eliminar')

    toast.success('Negocio eliminado')
    router.push('/admin/businesses')
  } catch (error) {
    console.error('Error:', error)
    toast.error('Error al eliminar negocio')
  } finally {
    setDeleting(false)
    setDeleteDialogOpen(false)
  }
}
```

**Step 2: Add edit and delete buttons**

After the FeaturedBusinessControls component (around line 137):
```typescript
{/* Admin Actions */}
{currentProfile && (currentProfile.role === 'admin' || currentProfile.is_super_admin) && (
  <div className="flex gap-3 mt-4">
    <Link href={`/admin/businesses/${id}/edit`} className="flex-1">
      <Button className="brutalist-button w-full">
        <Edit className="h-4 w-4 mr-2" /> Editar Negocio
      </Button>
    </Link>

    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" className="brutalist-button flex-1">
          <Trash2 className="h-4 w-4 mr-2" /> Eliminar
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="brutalist-card">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-heading font-black uppercase italic">
            ¿Eliminar este negocio permanentemente?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer. Se eliminarán todas las fotos y datos del negocio.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="brutalist-button">Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleting}
            className="brutalist-button bg-red-600 text-white"
          >
            {deleting ? 'Eliminando...' : 'Eliminar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
)}
```

**Step 3: Import required components**

Add to imports:
```typescript
import { Edit, Trash2 } from 'lucide-react'
import Link from 'next/link'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
```

**Step 4: Commit**

```bash
git add app/admin/businesses/[id]/page.tsx
git commit -m "feat(admin): add edit and delete buttons to business detail

- Add Edit button linking to edit page
- Add Delete button with confirmation dialog
- Show only for admins (not moderators)
- Clean up photos from storage on delete
- Navigate back to list after delete

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 14: Update Approve API Route with Permission

**Files:**
- Modify: `app/api/businesses/[id]/approve/route.ts`

**Step 1: Replace role check with permission check**

Replace entire file:
```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/auth/api-protection'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  // Check permission (moderators and admins can approve)
  const auth = await requirePermission('canApproveBusinesses', supabase)
  if (!auth.authorized) return auth.error

  // Update business status
  const { data, error } = await supabase
    .from('businesses')
    .update({ status: 'approved' })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error approving business:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // TODO: Send notification to business owner

  return NextResponse.json({ success: true, data })
}
```

**Step 2: Commit**

```bash
git add app/api/businesses/[id]/approve/route.ts
git commit -m "feat(api): update approve route with permission check

- Use requirePermission instead of role check
- Allow moderators to approve businesses
- Consistent with new permission system

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 15: Update Community Posts Approve/Reject Routes

**Files:**
- Modify: `app/api/community/posts/[id]/approve/route.ts`
- Modify: `app/api/community/posts/[id]/reject/route.ts`

**Step 1: Update approve route**

File: `app/api/community/posts/[id]/approve/route.ts`
```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/auth/api-protection'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const auth = await requirePermission('canManageCommunityContent', supabase)
  if (!auth.authorized) return auth.error

  const { error } = await supabase
    .from('community_posts')
    .update({ status: 'approved' })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
```

**Step 2: Update reject route**

File: `app/api/community/posts/[id]/reject/route.ts`
```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/auth/api-protection'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const auth = await requirePermission('canManageCommunityContent', supabase)
  if (!auth.authorized) return auth.error

  const { error } = await supabase
    .from('community_posts')
    .update({ status: 'rejected' })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
```

**Step 3: Commit**

```bash
git add app/api/community/posts/[id]/approve/route.ts app/api/community/posts/[id]/reject/route.ts
git commit -m "feat(api): update community post routes with permissions

- Use canManageCommunityContent permission
- Allow moderators to manage community posts
- Consistent authorization across all routes

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Phase 1 Complete! ✅

**What we built:**
- ✅ Database migration with role system and suspension
- ✅ Permission system infrastructure
- ✅ Middleware suspension check
- ✅ Business category filter
- ✅ Business name search
- ✅ Rejection feedback dialog
- ✅ Business edit page
- ✅ Business delete functionality
- ✅ Updated all API routes with permission checks

**Next Steps:**
- See `2026-02-27-phase-2-user-management.md` for User Management implementation
- See `2026-02-27-phase-3-analytics-reporting.md` for Statistics Dashboard
- See `2026-02-27-phase-4-ux-enhancements.md` for Category Reordering

---

## Execution Choice

Plan complete and saved to `docs/plans/2026-02-27-admin-panel-enhancements.md`.

**Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
