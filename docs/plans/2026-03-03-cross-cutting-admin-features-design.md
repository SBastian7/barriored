# Cross-Cutting Admin Features - Design Document

**Date:** 2026-03-03
**Status:** Approved
**Approach:** Security-First Incremental (3 Phases)

---

## Executive Summary

This design addresses critical multi-tenant security gaps and implements cross-cutting admin features for the BarrioRed platform. The implementation follows a three-phase approach prioritizing security fixes, then adding monitoring infrastructure, and finally building super admin management features.

### Critical Issues Identified

**Security vulnerabilities in current RLS policies:**
- `community_alerts`: Any admin can manage alerts across ALL communities
- `community_posts`: Any admin can manage posts across ALL communities
- `public_services`: Any admin can manage services across ALL communities
- `content_reports`: Any admin can view reports from ALL communities

**Root cause:** RLS policies check `role = 'admin'` without verifying `community_id` match.

### Scope

**Included:**
- ✅ Fix multi-tenant RLS policies
- ✅ Add moderator role support (limited to content moderation)
- ✅ Audit logs (track admin actions)
- ✅ Error logs (capture runtime errors)
- ✅ Super admin community CRUD
- ✅ Platform-wide dashboard
- ✅ Assign community admins/moderators

**Deferred:**
- ❌ Community geographic boundaries
- ❌ Global settings management

---

## Role Definitions

### Super Admin
- Platform-wide access across ALL communities
- Can create/edit/archive communities
- Can assign community admins/moderators
- Can view all logs and errors
- Flag: `profiles.is_super_admin = true`

### Community Admin
- Full access to their own community only
- Can manage: businesses, users, posts, alerts, services, reports
- Cannot access other communities' data
- Flag: `profiles.role = 'admin'` AND `profiles.community_id = X`

### Community Moderator
- Limited access to content moderation in their community only
- Can manage: posts, alerts, reports
- Cannot manage: businesses, users, services
- Cannot access other communities' data
- Flag: `profiles.role = 'moderator'` AND `profiles.community_id = X`

---

## Phase 1: Security Fix (Critical - Deploy ASAP)

### Helper Functions

Create reusable security check functions:

```sql
-- Check if user is super admin (already exists)
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role = 'admin'
      AND is_super_admin = TRUE
  );
$$;

-- Check if user is admin of specific community (already exists)
CREATE OR REPLACE FUNCTION is_community_admin(community_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role = 'admin'
      AND community_id = community_uuid
  );
$$;

-- NEW: Check if user is admin OR moderator of specific community
CREATE OR REPLACE FUNCTION is_community_staff(community_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT
    is_super_admin()
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND community_id = community_uuid
        AND role IN ('admin', 'moderator')
    );
$$;

-- NEW: Check if user can moderate content in specific community
CREATE OR REPLACE FUNCTION can_moderate_content(community_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT is_community_staff(community_uuid);
$$;
```

### RLS Policy Fixes

#### Pattern: Community-Scoped Content Tables

**Tables:** `community_posts`, `community_alerts`

```sql
-- SELECT: Super admin sees all, staff sees their community only
CREATE POLICY "table_select_staff"
FOR SELECT USING (
  is_super_admin()
  OR is_community_staff(community_id)
);

-- INSERT: Authenticated users can create in their community
CREATE POLICY "table_insert"
FOR INSERT WITH CHECK (
  auth.uid() = author_id
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND community_id = table.community_id
  )
);

-- UPDATE: Staff can update in their community
CREATE POLICY "table_update_staff"
FOR UPDATE USING (
  is_super_admin()
  OR is_community_staff(community_id)
);

-- DELETE: Staff can delete in their community
CREATE POLICY "table_delete_staff"
FOR DELETE USING (
  is_super_admin()
  OR is_community_staff(community_id)
);
```

#### Pattern: Admin-Only Tables

**Tables:** `public_services`, `businesses` (verify existing), `profiles` (verify existing)

```sql
-- SELECT: Super admin sees all, community admin sees their community
CREATE POLICY "table_select_admin"
FOR SELECT USING (
  is_super_admin()
  OR is_community_admin(community_id)
);

-- INSERT/UPDATE/DELETE: Admin or super admin only
CREATE POLICY "table_modify_admin"
FOR {INSERT|UPDATE|DELETE} USING (
  is_super_admin()
  OR is_community_admin(community_id)
);
```

#### Pattern: Content Reports (No Direct community_id)

**Table:** `content_reports`

```sql
-- SELECT: Super admin sees all, staff sees reports for entities in their community
CREATE POLICY "content_reports_select_staff"
FOR SELECT USING (
  is_super_admin()
  OR
  (
    reported_entity_type = 'business'
    AND EXISTS (
      SELECT 1 FROM businesses
      WHERE id = reported_entity_id
        AND is_community_staff(community_id)
    )
  )
  OR
  (
    reported_entity_type = 'post'
    AND EXISTS (
      SELECT 1 FROM community_posts
      WHERE id = reported_entity_id
        AND is_community_staff(community_id)
    )
  )
  OR
  auth.uid() = reporter_id  -- Users can see their own reports
);
```

### Database Migration

**File:** `supabase/migrations/20260303000001_fix_multi_tenant_rls.sql`

**Steps:**
1. Create new helper functions
2. Drop conflicting old policies
3. Create new community-scoped policies
4. Add comments explaining policy logic

### Testing Checklist

- [ ] Create 3 test users: super_admin, community1_admin, community2_moderator
- [ ] Verify community1_admin cannot see community2 data
- [ ] Verify moderator can manage posts/alerts but NOT businesses/users
- [ ] Verify super admin can see/manage ALL communities
- [ ] Test all CRUD operations (businesses, posts, alerts, services, reports)
- [ ] Verify RLS policies in Supabase SQL editor with `auth.uid()` simulation

---

## Phase 2: Monitoring Infrastructure

### Audit Logs Table

Track admin actions for compliance and debugging:

```sql
CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid REFERENCES communities(id),  -- NULL for platform-wide actions
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  action text NOT NULL,  -- 'approve_business', 'reject_post', 'delete_user', etc.
  entity_type text,      -- 'business', 'post', 'user', 'community', 'alert', 'service'
  entity_id uuid,        -- ID of affected entity
  old_data jsonb,        -- Snapshot before change (for updates/deletes)
  new_data jsonb,        -- Snapshot after change (for creates/updates)
  metadata jsonb DEFAULT '{}',  -- IP address, user agent, request ID, etc.
  created_at timestamptz DEFAULT now()
);

-- Indexes for fast lookups
CREATE INDEX idx_audit_logs_community_created
  ON audit_logs(community_id, created_at DESC);
CREATE INDEX idx_audit_logs_user_created
  ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_entity
  ON audit_logs(entity_type, entity_id, created_at DESC);
CREATE INDEX idx_audit_logs_action
  ON audit_logs(action, created_at DESC);

-- RLS policies
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Super admin sees all logs
CREATE POLICY "audit_logs_select_super_admin"
ON audit_logs FOR SELECT
USING (is_super_admin());

-- Community admin sees logs for their community
CREATE POLICY "audit_logs_select_community_admin"
ON audit_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role = 'admin'
      AND community_id = audit_logs.community_id
  )
);

-- Moderators see logs for content they can moderate
CREATE POLICY "audit_logs_select_moderator"
ON audit_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role = 'moderator'
      AND community_id = audit_logs.community_id
  )
  AND entity_type IN ('post', 'alert', 'report')
);

-- Only backend can insert (service role)
-- No public INSERT policy
```

### Error Logs Table

Capture runtime errors for debugging:

```sql
CREATE TABLE error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid REFERENCES communities(id),  -- NULL for platform-wide errors
  user_id uuid REFERENCES auth.users(id),        -- NULL for unauthenticated errors
  error_type text NOT NULL,     -- 'api_error', 'validation_error', 'db_error', 'client_error'
  error_message text,
  stack_trace text,
  request_url text,
  request_method text,
  request_body jsonb,
  status_code integer,
  metadata jsonb DEFAULT '{}',  -- Browser info, device type, etc.
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_error_logs_created
  ON error_logs(created_at DESC);
CREATE INDEX idx_error_logs_type_created
  ON error_logs(error_type, created_at DESC);
CREATE INDEX idx_error_logs_user
  ON error_logs(user_id, created_at DESC) WHERE user_id IS NOT NULL;

-- RLS policies
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Only super admin can view error logs (contains sensitive data)
CREATE POLICY "error_logs_select_super_admin"
ON error_logs FOR SELECT
USING (is_super_admin());

-- Public can insert (for client-side error reporting)
CREATE POLICY "error_logs_insert_public"
ON error_logs FOR INSERT
WITH CHECK (true);
```

### API Endpoints

#### Audit Logs API

**File:** `app/api/admin/logs/audit/route.ts`

```typescript
// GET /api/admin/logs/audit
// Query params: community_id?, entity_type?, action?, user_id?, limit=50, offset=0
export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user || !['admin', 'moderator'].includes(user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const communityId = searchParams.get('community_id')
  const entityType = searchParams.get('entity_type')
  const action = searchParams.get('action')
  const userId = searchParams.get('user_id')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  let query = supabase
    .from('audit_logs')
    .select('*, user:profiles!user_id(full_name, avatar_url)')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  // RLS handles community filtering automatically
  if (communityId) query = query.eq('community_id', communityId)
  if (entityType) query = query.eq('entity_type', entityType)
  if (action) query = query.eq('action', action)
  if (userId) query = query.eq('user_id', userId)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ logs: data })
}

// POST /api/admin/logs/audit (internal only - called by other endpoints)
export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { action, entity_type, entity_id, old_data, new_data, community_id } = body

  // Get request metadata
  const metadata = {
    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
    user_agent: request.headers.get('user-agent'),
    timestamp: new Date().toISOString(),
  }

  const { error } = await supabaseAdmin  // Use service role
    .from('audit_logs')
    .insert({
      community_id,
      user_id: user.id,
      action,
      entity_type,
      entity_id,
      old_data,
      new_data,
      metadata,
    })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
```

#### Error Logs API

**File:** `app/api/admin/logs/error/route.ts`

```typescript
// GET /api/admin/logs/errors
// Query params: error_type?, limit=50, offset=0
// Super admin only
export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user || !user.is_super_admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const errorType = searchParams.get('error_type')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  let query = supabase
    .from('error_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (errorType) query = query.eq('error_type', errorType)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ errors: data })
}

// POST /api/admin/logs/error
// Public endpoint for client-side error reporting
// Rate limited: 10 errors per user per minute
export async function POST(request: Request) {
  const body = await request.json()
  const user = await getCurrentUser() // May be null for unauthenticated errors

  const {
    error_type,
    error_message,
    stack_trace,
    request_url,
    request_method,
    status_code,
  } = body

  // Get client metadata
  const metadata = {
    user_agent: request.headers.get('user-agent'),
    referrer: request.headers.get('referer'),
    browser: body.browser,
    device: body.device,
  }

  // TODO: Implement rate limiting (Redis or similar)
  // For now, just log it

  const { error } = await supabaseAdmin  // Use service role
    .from('error_logs')
    .insert({
      community_id: user?.community_id || null,
      user_id: user?.id || null,
      error_type,
      error_message,
      stack_trace,
      request_url,
      request_method,
      status_code,
      metadata,
    })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
```

### Audit Logger Utility

**File:** `lib/utils/audit-logger.ts`

```typescript
import { createClient } from '@/lib/supabase/server'

export type AuditAction =
  | 'approve_business'
  | 'reject_business'
  | 'delete_business'
  | 'approve_post'
  | 'reject_post'
  | 'delete_post'
  | 'pin_post'
  | 'unpin_post'
  | 'create_alert'
  | 'update_alert'
  | 'delete_alert'
  | 'suspend_user'
  | 'unsuspend_user'
  | 'delete_user'
  | 'assign_role'
  | 'create_community'
  | 'update_community'
  | 'archive_community'

export type EntityType =
  | 'business'
  | 'post'
  | 'alert'
  | 'user'
  | 'community'
  | 'service'
  | 'report'

interface LogAuditParams {
  action: AuditAction
  entityType: EntityType
  entityId: string
  oldData?: any
  newData?: any
  communityId?: string
}

export async function logAuditAction(params: LogAuditParams) {
  const { action, entityType, entityId, oldData, newData, communityId } = params

  try {
    const response = await fetch('/api/admin/logs/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        entity_type: entityType,
        entity_id: entityId,
        old_data: oldData,
        new_data: newData,
        community_id: communityId,
      }),
    })

    if (!response.ok) {
      console.error('Failed to log audit action:', await response.text())
    }
  } catch (error) {
    console.error('Error logging audit action:', error)
    // Don't throw - audit logging should not break the main operation
  }
}
```

### Admin UI for Logs

**File:** `app/admin/logs/page.tsx`

```typescript
// Brutalist design with tabs: Audit Logs | Error Logs
// Filters: Date range, action type, user, entity type
// Pagination with 50 items per page
// Super admin sees all, community admin sees their community only

export default async function AdminLogsPage() {
  const user = await getCurrentUser()

  if (!user || !['admin', 'moderator'].includes(user.role)) {
    redirect('/auth/login')
  }

  return (
    <div>
      <h1 className="text-4xl font-black uppercase tracking-tighter italic">
        Logs del Sistema
      </h1>

      <Tabs defaultValue="audit">
        <TabsList>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
          {user.is_super_admin && (
            <TabsTrigger value="errors">Error Logs</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="audit">
          <AuditLogsTable />
        </TabsContent>

        {user.is_super_admin && (
          <TabsContent value="errors">
            <ErrorLogsTable />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
```

### Integration Points

Add `logAuditAction()` calls to existing endpoints:

- `/api/admin/businesses/[id]` - approve/reject/delete
- `/api/admin/users/[id]` - suspend/delete/assign role
- `/api/admin/community/[id]` - approve/reject/delete/pin posts
- `/api/admin/alerts/[id]` - create/update/delete alerts
- `/api/admin/services/[id]` - create/update/delete services

**Example:**

```typescript
// Before
await supabase
  .from('businesses')
  .update({ status: 'approved' })
  .eq('id', businessId)

// After
const oldBusiness = await supabase
  .from('businesses')
  .select('*')
  .eq('id', businessId)
  .single()

await supabase
  .from('businesses')
  .update({ status: 'approved' })
  .eq('id', businessId)

await logAuditAction({
  action: 'approve_business',
  entityType: 'business',
  entityId: businessId,
  oldData: { status: oldBusiness.data.status },
  newData: { status: 'approved' },
  communityId: oldBusiness.data.community_id,
})
```

---

## Phase 3: Super Admin Panel

### Communities Management API

#### List All Communities

**File:** `app/api/admin/communities/route.ts`

```typescript
// GET /api/admin/communities
// Super admin only
export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user || !user.is_super_admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { data: communities, error } = await supabase
    .from('communities')
    .select(`
      *,
      businesses:businesses(count),
      users:profiles(count),
      posts:community_posts(count)
    `)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Transform counts
  const communitiesWithStats = communities.map(c => ({
    ...c,
    stats: {
      businesses_count: c.businesses[0]?.count || 0,
      users_count: c.users[0]?.count || 0,
      posts_count: c.posts[0]?.count || 0,
    },
  }))

  return NextResponse.json({ communities: communitiesWithStats })
}

// POST /api/admin/communities
// Create new community (super admin only)
export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user || !user.is_super_admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await request.json()
  const { name, slug, municipality, department, description, logo_url } = body

  // Validate slug uniqueness
  const { data: existing } = await supabase
    .from('communities')
    .select('id')
    .eq('slug', slug)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Slug already exists' }, { status: 400 })
  }

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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Log audit action
  await logAuditAction({
    action: 'create_community',
    entityType: 'community',
    entityId: community.id,
    newData: community,
  })

  return NextResponse.json({ community })
}
```

#### Community Details & Updates

**File:** `app/api/admin/communities/[id]/route.ts`

```typescript
// GET /api/admin/communities/[id]
// Super admin only
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser()
  if (!user || !user.is_super_admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { data: community, error } = await supabase
    .from('communities')
    .select(`
      *,
      admins:profiles!community_id(id, full_name, avatar_url, role)
    `)
    .eq('id', params.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ community })
}

// PATCH /api/admin/communities/[id]
// Update community (super admin only)
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser()
  if (!user || !user.is_super_admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await request.json()

  // Get old data for audit
  const { data: oldCommunity } = await supabase
    .from('communities')
    .select('*')
    .eq('id', params.id)
    .single()

  const { data: community, error } = await supabase
    .from('communities')
    .update(body)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

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

// DELETE /api/admin/communities/[id]
// Soft delete (set is_active=false)
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser()
  if (!user || !user.is_super_admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { error } = await supabase
    .from('communities')
    .update({ is_active: false })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Log audit action
  await logAuditAction({
    action: 'archive_community',
    entityType: 'community',
    entityId: params.id,
  })

  return NextResponse.json({ success: true })
}
```

#### Manage Community Staff

**File:** `app/api/admin/communities/[id]/staff/route.ts`

```typescript
// POST /api/admin/communities/[id]/staff
// Assign admin or moderator to community (super admin only)
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser()
  if (!user || !user.is_super_admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await request.json()
  const { user_id, role } = body

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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

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

// DELETE /api/admin/communities/[id]/staff/[userId]
// Remove staff from community
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; userId: string } }
) {
  const user = await getCurrentUser()
  if (!user || !user.is_super_admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  // Reset to regular user
  const { error } = await supabase
    .from('profiles')
    .update({
      community_id: null,
      role: 'user',
    })
    .eq('id', params.userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Log audit action
  await logAuditAction({
    action: 'assign_role',
    entityType: 'user',
    entityId: params.userId,
    oldData: { role: 'admin/moderator', community_id: params.id },
    newData: { role: 'user', community_id: null },
  })

  return NextResponse.json({ success: true })
}
```

### Communities Management UI

#### Communities List

**File:** `app/admin/communities/page.tsx`

```typescript
// Brutalist grid of community cards
// Each card shows: name, location, stats, is_active badge
// Actions: View, Edit, Archive buttons

export default async function CommunitiesPage() {
  const user = await getCurrentUser()

  if (!user || !user.is_super_admin) {
    redirect('/admin')
  }

  const response = await fetch(`${process.env.NEXT_PUBLIC_URL}/api/admin/communities`)
  const { communities } = await response.json()

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-black uppercase tracking-tighter italic">
          Comunidades
        </h1>
        <Link href="/admin/communities/new">
          <Button className="brutalist-button">
            Nueva Comunidad
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {communities.map((community) => (
          <CommunityCard key={community.id} community={community} />
        ))}
      </div>
    </div>
  )
}
```

#### Create Community

**File:** `app/admin/communities/new/page.tsx`

```typescript
// Multi-step form (basic info → location details → logo upload)
// Slug auto-generation from name
// Form validation with Zod

export default function NewCommunityPage() {
  const user = await getCurrentUser()

  if (!user || !user.is_super_admin) {
    redirect('/admin')
  }

  return (
    <div>
      <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-8">
        Nueva Comunidad
      </h1>

      <CommunityForm mode="create" />
    </div>
  )
}
```

#### Community Details

**File:** `app/admin/communities/[id]/page.tsx`

```typescript
// Community overview with tabs:
// - Stats (businesses, users, posts, activity)
// - Admins & Moderators (list with remove button, add new button)
// - Recent Activity (audit logs for this community)
// - Settings (edit community info)

export default async function CommunityDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const user = await getCurrentUser()

  if (!user || !user.is_super_admin) {
    redirect('/admin')
  }

  const response = await fetch(`${process.env.NEXT_PUBLIC_URL}/api/admin/communities/${params.id}`)
  const { community } = await response.json()

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-black uppercase tracking-tighter italic">
          {community.name}
        </h1>
        <Link href={`/admin/communities/${params.id}/edit`}>
          <Button className="brutalist-button">Editar</Button>
        </Link>
      </div>

      <Tabs defaultValue="stats">
        <TabsList>
          <TabsTrigger value="stats">Estadísticas</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
          <TabsTrigger value="activity">Actividad</TabsTrigger>
        </TabsList>

        <TabsContent value="stats">
          <CommunityStatsPanel community={community} />
        </TabsContent>

        <TabsContent value="staff">
          <CommunityStaffPanel community={community} />
        </TabsContent>

        <TabsContent value="activity">
          <CommunityActivityPanel communityId={params.id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

### Platform-Wide Dashboard

**File:** `app/admin/page.tsx` (modified)

```typescript
// For super admin: Show platform-wide stats with community selector dropdown
// For community admin: Show their community stats only (no dropdown)

export default async function AdminDashboard() {
  const user = await getCurrentUser()

  if (!user || !['admin', 'moderator'].includes(user.role)) {
    redirect('/auth/login')
  }

  const isSuperAdmin = user.is_super_admin
  const selectedCommunityId = isSuperAdmin ? null : user.community_id // null = all communities

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-black uppercase tracking-tighter italic">
          Dashboard
        </h1>

        {isSuperAdmin && (
          <CommunitySelectorDropdown
            onChange={(id) => {
              // Update URL param and refetch stats
            }}
          />
        )}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Negocios" value={stats.businesses} />
        <StatCard title="Usuarios" value={stats.users} />
        <StatCard title="Posts" value={stats.posts} />
        <StatCard title="Alertas Activas" value={stats.alerts} />
      </div>

      {/* Charts (if super admin) */}
      {isSuperAdmin && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <BarChart title="Negocios por Comunidad" data={chartData.businessesByCommunity} />
            <BarChart title="Usuarios por Comunidad" data={chartData.usersByCommunity} />
          </div>

          <ActivityHeatmap data={chartData.activityHeatmap} />
        </>
      )}

      {/* Recent activity */}
      <RecentActivityFeed communityId={selectedCommunityId} />
    </div>
  )
}
```

### Role-Based Navigation

**File:** `components/admin/collapsible-sidebar.tsx` (modified)

```typescript
const navItems = [
  { href: '/admin', label: 'Dashboard', icon: BarChart3, roles: ['admin', 'moderator', 'super_admin'] },

  // Admin + Super Admin only
  { href: '/admin/businesses', label: 'Negocios', icon: Building2, roles: ['admin', 'super_admin'] },
  { href: '/admin/users', label: 'Usuarios', icon: Users, roles: ['admin', 'super_admin'] },
  { href: '/admin/categories', label: 'Categorías', icon: FolderTree, roles: ['admin', 'super_admin'] },
  { href: '/admin/services', label: 'Servicios', icon: Briefcase, roles: ['admin', 'super_admin'] },

  // Admin + Moderator + Super Admin (content moderation)
  { href: '/admin/community', label: 'Comunidad', icon: MessageSquare, roles: ['admin', 'moderator', 'super_admin'] },
  { href: '/admin/alerts', label: 'Alertas', icon: Bell, roles: ['admin', 'moderator', 'super_admin'] },
  { href: '/admin/reports', label: 'Reportes', icon: Flag, roles: ['admin', 'moderator', 'super_admin'] },

  // All roles
  { href: '/admin/statistics', label: 'Estadísticas', icon: BarChart3, roles: ['admin', 'moderator', 'super_admin'] },
  { href: '/admin/engagement', label: 'Engagement', icon: Activity, roles: ['admin', 'moderator', 'super_admin'] },

  // Super Admin only (with divider)
  { href: '/admin/communities', label: 'Comunidades', icon: Globe, roles: ['super_admin'], divider: true },
  { href: '/admin/logs', label: 'Logs', icon: FileText, roles: ['super_admin'] },
]

export function CollapsibleSidebar() {
  const user = useCurrentUser()
  const userRole = user.is_super_admin ? 'super_admin' : user.role

  // Filter nav items based on user role
  const visibleItems = navItems.filter(item => item.roles.includes(userRole))

  return (
    <aside>
      {/* Render filtered items */}
    </aside>
  )
}
```

**File:** `components/admin/desktop-header.tsx` (modified)

```typescript
// Add super admin badge
export function DesktopHeader() {
  const user = useCurrentUser()

  return (
    <header>
      {/* Logo, nav */}

      {user.is_super_admin && (
        <Badge className="bg-secondary text-foreground font-black uppercase">
          Super Admin
        </Badge>
      )}

      <UserMenu />
    </header>
  )
}
```

---

## Testing Strategy

### Phase 1: Security Testing

**Manual testing with test users:**

1. Create test users:
   - `super_admin@test.com` - Super admin (all communities)
   - `admin1@test.com` - Admin of community 1
   - `admin2@test.com` - Admin of community 2
   - `mod1@test.com` - Moderator of community 1

2. Verify RLS isolation:
   ```sql
   -- Test as admin1 (should only see community 1)
   SET LOCAL "request.jwt.claims" = '{"sub": "admin1-uuid"}';
   SELECT * FROM businesses; -- Should only see community 1 businesses
   SELECT * FROM community_posts; -- Should only see community 1 posts

   -- Test as super admin (should see all)
   SET LOCAL "request.jwt.claims" = '{"sub": "super_admin-uuid"}';
   SELECT * FROM businesses; -- Should see ALL businesses
   ```

3. Test moderator limitations:
   - Moderator can view/edit/delete posts ✅
   - Moderator can view/edit/delete alerts ✅
   - Moderator CANNOT view businesses ❌
   - Moderator CANNOT manage users ❌

4. Test CRUD operations:
   - Admin1 tries to approve business from community 2 → Should fail
   - Admin1 tries to delete post from community 2 → Should fail
   - Super admin can manage anything → Should succeed

### Phase 2: Logging Testing

1. Trigger audit log creation:
   - Approve a business → Check audit log created
   - Reject a post → Check audit log created
   - Suspend a user → Check audit log created

2. Verify audit log visibility:
   - Admin1 can only see logs for community 1
   - Super admin can see all logs

3. Test error logging:
   - Trigger API error → Check error log created
   - Submit client error → Check rate limiting works

### Phase 3: Super Admin Testing

1. Create test community through UI
2. Assign test admin to community
3. Login as test admin → Verify they only see their community
4. View platform dashboard as super admin
5. Test community selector filtering

---

## Database Migrations Summary

### Migration 1: Fix Multi-Tenant RLS
**File:** `supabase/migrations/20260303000001_fix_multi_tenant_rls.sql`
- Create helper functions
- Fix RLS policies for all tables

### Migration 2: Add Logging Tables
**File:** `supabase/migrations/20260303000002_add_logging_tables.sql`
- Create `audit_logs` table + indexes + RLS
- Create `error_logs` table + indexes + RLS

### Migration 3: Communities Management
**File:** `supabase/migrations/20260303000003_communities_management.sql`
- Add RLS policies for communities CRUD (super admin only)
- Add helper function for community stats aggregation

---

## Type Definitions Update

**File:** `lib/types/database.ts`

Add types for new tables:

```typescript
export interface AuditLog {
  id: string
  community_id: string | null
  user_id: string
  action: string
  entity_type: string
  entity_id: string
  old_data: any
  new_data: any
  metadata: any
  created_at: string
}

export interface ErrorLog {
  id: string
  community_id: string | null
  user_id: string | null
  error_type: string
  error_message: string
  stack_trace: string
  request_url: string
  request_method: string
  request_body: any
  status_code: number
  metadata: any
  created_at: string
}
```

Update `Profile` type to ensure moderator is in role union:

```typescript
export interface Profile {
  id: string
  community_id: string | null
  full_name: string | null
  role: 'user' | 'moderator' | 'admin'
  is_super_admin: boolean
  // ... other fields
}
```

---

## Deployment Strategy

### Phase 1 Deployment (Critical)

1. Review migration SQL carefully
2. Test in local Supabase instance
3. Create backup of production database
4. Deploy migration to production
5. Test with test users immediately
6. Monitor for any RLS policy errors
7. Rollback plan: Restore policies from backup if issues

**Timeline:** Deploy within 2-3 days

### Phase 2 Deployment

1. Deploy logging tables migration
2. Deploy API endpoints
3. Deploy admin UI for logs
4. Add audit logging calls to existing endpoints incrementally
5. Monitor for performance impact

**Timeline:** 1 week after Phase 1

### Phase 3 Deployment

1. Deploy communities management migration
2. Deploy super admin API endpoints
3. Deploy super admin UI
4. Update navigation and role checks
5. Test super admin workflow end-to-end

**Timeline:** 2 weeks after Phase 2

---

## Risk Mitigation

### Security Risks

- **Risk:** RLS policy change breaks existing functionality
  - **Mitigation:** Comprehensive testing with different user roles before deploy
  - **Rollback:** Keep old policies commented in migration file

- **Risk:** Super admin account compromised
  - **Mitigation:** Require 2FA for super admin accounts (future enhancement)
  - **Monitoring:** Audit all super admin actions

### Performance Risks

- **Risk:** Audit logging slows down API responses
  - **Mitigation:** Log asynchronously, don't block main operation
  - **Monitoring:** Track API response times before/after

- **Risk:** Audit/error tables grow too large
  - **Mitigation:** Add data retention policy (delete logs > 90 days)
  - **Monitoring:** Track table sizes

### Data Risks

- **Risk:** Audit logs contain sensitive user data
  - **Mitigation:** Only log necessary fields, redact sensitive data
  - **Access control:** Only super admin can view error logs

---

## Success Metrics

### Phase 1
- ✅ Zero cross-community data leaks after deployment
- ✅ All existing features work correctly with new RLS policies
- ✅ Moderators can access content management but not admin features

### Phase 2
- ✅ All critical admin actions are logged
- ✅ Audit logs are queryable and filterable
- ✅ Error logs capture production issues

### Phase 3
- ✅ Super admin can create and manage communities
- ✅ Super admin can assign community staff
- ✅ Platform dashboard shows cross-community metrics
- ✅ Community selector works correctly

---

## Future Enhancements (Out of Scope)

- Community geographic boundaries (map polygons)
- Global platform settings management
- 2FA for super admin accounts
- Advanced analytics and reporting
- Automated anomaly detection in audit logs
- Data retention policies and archiving
- Export audit logs to external systems (Datadog, etc.)

---

## Appendix: Key Files Reference

### Database
- `supabase/migrations/20260303000001_fix_multi_tenant_rls.sql`
- `supabase/migrations/20260303000002_add_logging_tables.sql`
- `supabase/migrations/20260303000003_communities_management.sql`

### API Routes
- `app/api/admin/logs/audit/route.ts`
- `app/api/admin/logs/error/route.ts`
- `app/api/admin/communities/route.ts`
- `app/api/admin/communities/[id]/route.ts`
- `app/api/admin/communities/[id]/staff/route.ts`

### Admin UI
- `app/admin/logs/page.tsx`
- `app/admin/communities/page.tsx`
- `app/admin/communities/new/page.tsx`
- `app/admin/communities/[id]/page.tsx`
- `app/admin/communities/[id]/edit/page.tsx`
- `app/admin/page.tsx` (modified)

### Components
- `components/admin/collapsible-sidebar.tsx` (modified)
- `components/admin/desktop-header.tsx` (modified)

### Utilities
- `lib/utils/audit-logger.ts`
- `lib/types/database.ts` (modified)

---

**End of Design Document**
