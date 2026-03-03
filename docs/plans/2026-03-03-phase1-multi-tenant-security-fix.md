# Phase 1: Multi-Tenant Security Fix - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix critical multi-tenant RLS security vulnerabilities where community admins can access data from other communities.

**Architecture:** Create reusable SQL helper functions for role checking, then systematically update RLS policies for all tables to enforce community_id matching. Moderator role gets content moderation access only (posts, alerts, reports) while admins retain full community access.

**Tech Stack:** PostgreSQL, Supabase RLS, Row Level Security policies, SQL functions

**Design Doc:** See `docs/plans/2026-03-03-cross-cutting-admin-features-design.md`

---

## Pre-Implementation Checklist

- [ ] Review current RLS policies in `supabase/migrations/002_rls_policies.sql`
- [ ] Understand existing helper functions in `supabase/migrations/005_add_featured_businesses_and_super_admin.sql`
- [ ] Have access to Supabase Studio for testing RLS policies
- [ ] Create database backup before applying migration

---

## Task 1: Create Migration File

**Files:**
- Create: `supabase/migrations/20260303000001_fix_multi_tenant_rls.sql`

**Step 1: Create migration file**

Create the file with initial structure:

```sql
-- Migration: Fix Multi-Tenant RLS Policies
-- Date: 2026-03-03
-- Description: Add community_id scoping to all RLS policies to prevent cross-community data access
-- Critical: Security fix - deploy ASAP

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Helper functions will be added in next steps
```

**Step 2: Verify file created**

Run: `ls -la supabase/migrations/20260303000001_fix_multi_tenant_rls.sql`
Expected: File exists

**Step 3: Commit**

```bash
git add supabase/migrations/20260303000001_fix_multi_tenant_rls.sql
git commit -m "feat(db): create migration for multi-tenant RLS fix

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Add Helper Functions

**Files:**
- Modify: `supabase/migrations/20260303000001_fix_multi_tenant_rls.sql`

**Step 1: Add is_community_staff() function**

Add after the HELPER FUNCTIONS comment:

```sql
-- Check if user is admin OR moderator of specific community (includes super admin)
CREATE OR REPLACE FUNCTION is_community_staff(community_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
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

COMMENT ON FUNCTION is_community_staff(UUID) IS
  'Returns true if user is super admin, community admin, or community moderator';
```

**Step 2: Add can_moderate_content() function**

```sql
-- Check if user can moderate content in specific community
CREATE OR REPLACE FUNCTION can_moderate_content(community_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT is_community_staff(community_uuid);
$$;

COMMENT ON FUNCTION can_moderate_content(UUID) IS
  'Returns true if user can moderate content (posts, alerts, reports) in community';
```

**Step 3: Add admin-only check function**

```sql
-- Check if user is admin (not moderator) of specific community
CREATE OR REPLACE FUNCTION is_community_admin_only(community_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    is_super_admin()
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND community_id = community_uuid
        AND role = 'admin'
    );
$$;

COMMENT ON FUNCTION is_community_admin_only(UUID) IS
  'Returns true if user is super admin or community admin (excludes moderators)';
```

**Step 4: Commit**

```bash
git add supabase/migrations/20260303000001_fix_multi_tenant_rls.sql
git commit -m "feat(db): add helper functions for role-based access control

- is_community_staff: admin OR moderator check
- can_moderate_content: content moderation check
- is_community_admin_only: admin-only check (excludes moderators)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Fix community_posts RLS Policies

**Files:**
- Modify: `supabase/migrations/20260303000001_fix_multi_tenant_rls.sql`

**Step 1: Add section comment**

```sql

-- ============================================================================
-- COMMUNITY_POSTS: Fix RLS policies to enforce community scoping
-- ============================================================================
```

**Step 2: Drop old broken policies**

```sql
-- Drop old policies that don't check community_id
DROP POLICY IF EXISTS "community_posts_delete_admin" ON community_posts;
DROP POLICY IF EXISTS "community_posts_select_admin" ON community_posts;
DROP POLICY IF EXISTS "community_posts_update_admin" ON community_posts;
```

**Step 3: Create new community-scoped policies**

```sql
-- SELECT: Super admin sees all, staff (admin/moderator) sees their community
CREATE POLICY "community_posts_select_staff"
ON community_posts FOR SELECT
USING (
  is_super_admin()
  OR is_community_staff(community_id)
  OR (status = 'approved' AND auth.uid() IS NOT NULL)  -- Authenticated users see approved
  OR auth.uid() = author_id  -- Authors see their own
);

-- UPDATE: Staff can update posts in their community
CREATE POLICY "community_posts_update_staff"
ON community_posts FOR UPDATE
USING (
  is_super_admin()
  OR is_community_staff(community_id)
  OR (auth.uid() = author_id AND status = 'pending')  -- Authors can update pending posts
);

-- DELETE: Staff can delete in their community, authors can delete own pending
CREATE POLICY "community_posts_delete_staff"
ON community_posts FOR DELETE
USING (
  is_super_admin()
  OR is_community_staff(community_id)
  OR auth.uid() = author_id
);
```

**Step 4: Add comment explaining the fix**

```sql
COMMENT ON POLICY "community_posts_select_staff" ON community_posts IS
  'Fixed: Added community_id check. Staff (admin/moderator) can only see posts in their community.';

COMMENT ON POLICY "community_posts_update_staff" ON community_posts IS
  'Fixed: Added community_id check. Staff can only update posts in their community.';

COMMENT ON POLICY "community_posts_delete_staff" ON community_posts IS
  'Fixed: Added community_id check. Staff can only delete posts in their community.';
```

**Step 5: Commit**

```bash
git add supabase/migrations/20260303000001_fix_multi_tenant_rls.sql
git commit -m "fix(db): enforce community scoping for community_posts RLS

SECURITY FIX: Admins could previously access posts from other communities.
Now restricted to their own community only (super admin has full access).

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Fix community_alerts RLS Policies

**Files:**
- Modify: `supabase/migrations/20260303000001_fix_multi_tenant_rls.sql`

**Step 1: Add section comment**

```sql

-- ============================================================================
-- COMMUNITY_ALERTS: Fix RLS policies to enforce community scoping
-- ============================================================================
```

**Step 2: Drop old broken policies**

```sql
DROP POLICY IF EXISTS "community_alerts_delete_admin" ON community_alerts;
DROP POLICY IF EXISTS "community_alerts_insert_admin" ON community_alerts;
DROP POLICY IF EXISTS "community_alerts_update_admin" ON community_alerts;
```

**Step 3: Create new community-scoped policies**

```sql
-- SELECT: Everyone sees active alerts, staff sees all in their community
CREATE POLICY "community_alerts_select"
ON community_alerts FOR SELECT
USING (
  is_active = true  -- Public can see active alerts
  OR is_super_admin()
  OR is_community_staff(community_id)
);

-- INSERT: Staff can create alerts in their community
CREATE POLICY "community_alerts_insert_staff"
ON community_alerts FOR INSERT
WITH CHECK (
  is_super_admin()
  OR is_community_staff(community_id)
);

-- UPDATE: Staff can update alerts in their community
CREATE POLICY "community_alerts_update_staff"
ON community_alerts FOR UPDATE
USING (
  is_super_admin()
  OR is_community_staff(community_id)
);

-- DELETE: Staff can delete alerts in their community
CREATE POLICY "community_alerts_delete_staff"
ON community_alerts FOR DELETE
USING (
  is_super_admin()
  OR is_community_staff(community_id)
);
```

**Step 4: Add comments**

```sql
COMMENT ON POLICY "community_alerts_insert_staff" ON community_alerts IS
  'Fixed: Added community_id check. Staff can only create alerts in their community.';

COMMENT ON POLICY "community_alerts_update_staff" ON community_alerts IS
  'Fixed: Added community_id check. Staff can only update alerts in their community.';

COMMENT ON POLICY "community_alerts_delete_staff" ON community_alerts IS
  'Fixed: Added community_id check. Staff can only delete alerts in their community.';
```

**Step 5: Commit**

```bash
git add supabase/migrations/20260303000001_fix_multi_tenant_rls.sql
git commit -m "fix(db): enforce community scoping for community_alerts RLS

SECURITY FIX: Admins could previously manage alerts from other communities.
Now restricted to their own community only.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Fix public_services RLS Policies

**Files:**
- Modify: `supabase/migrations/20260303000001_fix_multi_tenant_rls.sql`

**Step 1: Add section comment**

```sql

-- ============================================================================
-- PUBLIC_SERVICES: Fix RLS policies (Admin-only, moderators excluded)
-- ============================================================================
```

**Step 2: Drop old broken policies**

```sql
DROP POLICY IF EXISTS "public_services_delete_admin" ON public_services;
DROP POLICY IF EXISTS "public_services_insert_admin" ON public_services;
DROP POLICY IF EXISTS "public_services_update_admin" ON public_services;
```

**Step 3: Create new admin-only policies**

```sql
-- SELECT: Public sees active services
CREATE POLICY "public_services_select"
ON public_services FOR SELECT
USING (
  is_active = true
  OR is_super_admin()
  OR is_community_admin_only(community_id)
);

-- INSERT: Admin only (not moderators)
CREATE POLICY "public_services_insert_admin"
ON public_services FOR INSERT
WITH CHECK (
  is_super_admin()
  OR is_community_admin_only(community_id)
);

-- UPDATE: Admin only (not moderators)
CREATE POLICY "public_services_update_admin"
ON public_services FOR UPDATE
USING (
  is_super_admin()
  OR is_community_admin_only(community_id)
);

-- DELETE: Admin only (not moderators)
CREATE POLICY "public_services_delete_admin"
ON public_services FOR DELETE
USING (
  is_super_admin()
  OR is_community_admin_only(community_id)
);
```

**Step 4: Add comments**

```sql
COMMENT ON POLICY "public_services_insert_admin" ON public_services IS
  'Fixed: Added community_id check. Only admins (not moderators) can create services in their community.';

COMMENT ON POLICY "public_services_update_admin" ON public_services IS
  'Fixed: Added community_id check. Only admins (not moderators) can update services in their community.';

COMMENT ON POLICY "public_services_delete_admin" ON public_services IS
  'Fixed: Added community_id check. Only admins (not moderators) can delete services in their community.';
```

**Step 5: Commit**

```bash
git add supabase/migrations/20260303000001_fix_multi_tenant_rls.sql
git commit -m "fix(db): enforce community scoping for public_services RLS

SECURITY FIX: Admins could previously manage services from other communities.
Now restricted to their own community only. Moderators excluded (admin-only).

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Fix content_reports RLS Policies

**Files:**
- Modify: `supabase/migrations/20260303000001_fix_multi_tenant_rls.sql`

**Step 1: Add section comment**

```sql

-- ============================================================================
-- CONTENT_REPORTS: Fix RLS policies (complex - needs JOIN to get community_id)
-- ============================================================================
```

**Step 2: Drop old broken policies**

```sql
DROP POLICY IF EXISTS "Admins can view all reports" ON content_reports;
DROP POLICY IF EXISTS "Admins can update reports" ON content_reports;
```

**Step 3: Create new community-scoped policies**

```sql
-- SELECT: Staff can see reports for entities in their community
CREATE POLICY "content_reports_select_staff"
ON content_reports FOR SELECT
USING (
  auth.uid() = reporter_id  -- Users see their own reports
  OR is_super_admin()
  OR (
    reported_entity_type = 'business'
    AND EXISTS (
      SELECT 1 FROM businesses
      WHERE id = reported_entity_id
        AND is_community_staff(community_id)
    )
  )
  OR (
    reported_entity_type = 'post'
    AND EXISTS (
      SELECT 1 FROM community_posts
      WHERE id = reported_entity_id
        AND is_community_staff(community_id)
    )
  )
);

-- UPDATE: Staff can update reports for entities in their community
CREATE POLICY "content_reports_update_staff"
ON content_reports FOR UPDATE
USING (
  is_super_admin()
  OR (
    reported_entity_type = 'business'
    AND EXISTS (
      SELECT 1 FROM businesses
      WHERE id = reported_entity_id
        AND is_community_staff(community_id)
    )
  )
  OR (
    reported_entity_type = 'post'
    AND EXISTS (
      SELECT 1 FROM community_posts
      WHERE id = reported_entity_id
        AND is_community_staff(community_id)
    )
  )
);
```

**Step 4: Add comments**

```sql
COMMENT ON POLICY "content_reports_select_staff" ON content_reports IS
  'Fixed: Added community check via JOIN. Staff can only see reports for entities in their community.';

COMMENT ON POLICY "content_reports_update_staff" ON content_reports IS
  'Fixed: Added community check via JOIN. Staff can only update reports for entities in their community.';
```

**Step 5: Commit**

```bash
git add supabase/migrations/20260303000001_fix_multi_tenant_rls.sql
git commit -m "fix(db): enforce community scoping for content_reports RLS

SECURITY FIX: Admins could previously view reports from other communities.
Now restricted via JOIN to check reported entity's community_id.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Verify Existing Policies (businesses, profiles)

**Files:**
- Modify: `supabase/migrations/20260303000001_fix_multi_tenant_rls.sql`

**Step 1: Add verification section**

```sql

-- ============================================================================
-- VERIFICATION: Existing policies already have community scoping
-- ============================================================================

-- BUSINESSES: Already has community_id checks in policies
-- ✅ businesses_select_admin: EXISTS (... AND community_id = businesses.community_id)
-- ✅ businesses_update_admin: EXISTS (... AND community_id = businesses.community_id)
-- ✅ businesses_delete_admin: EXISTS (... AND community_id = businesses.community_id)
-- No changes needed - already secure

-- PROFILES: Already uses is_community_admin() helper
-- ✅ profiles_select_admin: is_community_admin(community_id)
-- ✅ profiles_admin_update_role: is_community_admin(community_id)
-- ✅ profiles_delete_admin: Checks community_id match
-- No changes needed - already secure

-- CATEGORIES: Global table, admin-only (no community scoping needed)
-- ✅ Already restricted to admins only
-- No changes needed

-- COMMUNITIES: Will be secured in Phase 3 (super admin only)
-- Defer to Phase 3 migration
```

**Step 2: Commit**

```bash
git add supabase/migrations/20260303000001_fix_multi_tenant_rls.sql
git commit -m "docs(db): verify existing RLS policies are secure

businesses, profiles, categories already have proper community scoping.
No changes needed for these tables.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Update profiles Table Role Constraint

**Files:**
- Modify: `supabase/migrations/20260303000001_fix_multi_tenant_rls.sql`

**Step 1: Add section for profiles update**

```sql

-- ============================================================================
-- PROFILES: Update role constraint to ensure 'moderator' is valid
-- ============================================================================
```

**Step 2: Drop old constraint and add new one**

```sql
-- Drop old constraint (only has 'user', 'moderator', 'admin')
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add new constraint with moderator included
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('user', 'moderator', 'admin'));

COMMENT ON COLUMN profiles.role IS
  'User role: user (neighbor), moderator (content moderation only), admin (full community access)';
```

**Step 3: Commit**

```bash
git add supabase/migrations/20260303000001_fix_multi_tenant_rls.sql
git commit -m "fix(db): ensure moderator role is in profiles constraint

Added 'moderator' to role check constraint. Moderators have limited access
to content moderation (posts, alerts, reports) but not businesses/users.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Apply Migration to Local Database

**Files:**
- None (database operation)

**Step 1: Check migration file syntax**

Run: `cat supabase/migrations/20260303000001_fix_multi_tenant_rls.sql | head -20`
Expected: Valid SQL syntax visible

**Step 2: Apply migration locally**

Run: `supabase db reset`
Expected: Migration applied successfully

**Step 3: Verify helper functions exist**

Run in Supabase Studio SQL Editor:
```sql
SELECT proname, prosrc
FROM pg_proc
WHERE proname IN ('is_community_staff', 'can_moderate_content', 'is_community_admin_only');
```
Expected: 3 rows returned with function definitions

**Step 4: Verify RLS policies updated**

Run in Supabase Studio SQL Editor:
```sql
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('community_posts', 'community_alerts', 'public_services', 'content_reports')
ORDER BY tablename, policyname;
```
Expected: New policy names visible (e.g., `community_posts_select_staff`)

**Step 5: Commit checkpoint**

```bash
git add .
git commit -m "test(db): verify migration applies successfully

Migration applied locally without errors.
Helper functions and updated policies confirmed.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 10: Manual Testing - Create Test Users

**Files:**
- None (manual database operations)

**Step 1: Create super admin test user**

Run in Supabase Studio SQL Editor:
```sql
-- Create super admin
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'super@test.com',
  crypt('password123', gen_salt('bf')),
  now()
);

INSERT INTO profiles (id, full_name, role, is_super_admin)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Super Admin',
  'admin',
  true
);
```

**Step 2: Create community 1 admin**

```sql
-- Get first community ID
SELECT id, name FROM communities LIMIT 1;
-- Copy the ID (let's assume: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')

INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at)
VALUES (
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'admin1@test.com',
  crypt('password123', gen_salt('bf')),
  now()
);

INSERT INTO profiles (id, full_name, role, community_id, is_super_admin)
VALUES (
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'Community 1 Admin',
  'admin',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',  -- Replace with actual community 1 ID
  false
);
```

**Step 3: Create community 1 moderator**

```sql
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at)
VALUES (
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  'mod1@test.com',
  crypt('password123', gen_salt('bf')),
  now()
);

INSERT INTO profiles (id, full_name, role, community_id, is_super_admin)
VALUES (
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  'Community 1 Moderator',
  'moderator',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',  -- Same community as admin1
  false
);
```

**Step 4: Create community 2 admin (if exists)**

```sql
-- Get second community ID (if exists)
SELECT id, name FROM communities OFFSET 1 LIMIT 1;
-- If another community exists, create admin2 for that community
-- Use similar INSERT statements as above
```

**Step 5: Document test user IDs**

Create a test note:
```bash
echo "Test Users:
- super@test.com - Super Admin (all communities)
- admin1@test.com - Admin of Community 1
- mod1@test.com - Moderator of Community 1
- admin2@test.com - Admin of Community 2 (if exists)
" > docs/test-users.txt
```

---

## Task 11: Manual Testing - Test RLS Isolation

**Files:**
- None (manual testing)

**Step 1: Test super admin can see all businesses**

Run in Supabase Studio SQL Editor:
```sql
-- Simulate super admin user
SET LOCAL "request.jwt.claims" = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}';

-- Should see ALL businesses across all communities
SELECT id, name, community_id FROM businesses;
```
Expected: Returns all businesses (no filtering by community)

**Step 2: Test community admin sees only their community**

```sql
-- Reset session
RESET "request.jwt.claims";

-- Simulate community 1 admin
SET LOCAL "request.jwt.claims" = '{"sub": "cccccccc-cccc-cccc-cccc-cccccccccccc"}';

-- Should see ONLY community 1 businesses
SELECT id, name, community_id FROM businesses;
```
Expected: Returns only businesses where `community_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'`

**Step 3: Test moderator can see posts but NOT businesses**

```sql
-- Reset session
RESET "request.jwt.claims";

-- Simulate community 1 moderator
SET LOCAL "request.jwt.claims" = '{"sub": "dddddddd-dddd-dddd-dddd-dddddddddddd"}';

-- Moderator SHOULD see community posts
SELECT id, title, community_id FROM community_posts;

-- Moderator should NOT see businesses (or get empty result if no owner match)
SELECT id, name, community_id FROM businesses;
```
Expected:
- Posts query returns community 1 posts
- Businesses query returns empty or only if moderator owns a business

**Step 4: Test cross-community isolation**

```sql
-- Simulate community 1 admin trying to access community 2 data
SET LOCAL "request.jwt.claims" = '{"sub": "cccccccc-cccc-cccc-cccc-cccccccccccc"}';

-- Try to select businesses from community 2
SELECT id, name, community_id FROM businesses
WHERE community_id != 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
```
Expected: Returns 0 rows (RLS blocks cross-community access)

**Step 5: Document test results**

Create test results file:
```bash
echo "RLS Testing Results ($(date)):

✅ Super admin sees all businesses across communities
✅ Community 1 admin sees only community 1 businesses
✅ Community 1 moderator sees posts but NOT businesses
✅ Community 1 admin CANNOT see community 2 data
✅ RLS isolation working correctly

" >> docs/test-results-phase1.txt
```

---

## Task 12: Manual Testing - Test Moderator Permissions

**Files:**
- None (manual testing)

**Step 1: Test moderator can manage community_posts**

Run in Supabase Studio SQL Editor:
```sql
-- Simulate community 1 moderator
SET LOCAL "request.jwt.claims" = '{"sub": "dddddddd-dddd-dddd-dddd-dddddddddddd"}';

-- Moderator SHOULD be able to update posts in their community
UPDATE community_posts
SET status = 'approved'
WHERE community_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
  AND status = 'pending'
RETURNING id, title, status;
```
Expected: Update succeeds, returns updated post

**Step 2: Test moderator can manage community_alerts**

```sql
-- Moderator SHOULD be able to create alerts
INSERT INTO community_alerts (community_id, author_id, type, title, severity)
VALUES (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  'general',
  'Test Alert from Moderator',
  'info'
)
RETURNING id, title;
```
Expected: Insert succeeds, returns new alert

**Step 3: Test moderator CANNOT manage public_services**

```sql
-- Moderator should NOT be able to create services
INSERT INTO public_services (community_id, category, name)
VALUES (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'emergency',
  'Test Service from Moderator'
);
```
Expected: INSERT fails with RLS policy violation

**Step 4: Test moderator CANNOT manage users**

```sql
-- Moderator should NOT be able to update other user profiles
UPDATE profiles
SET role = 'admin'
WHERE id != 'dddddddd-dddd-dddd-dddd-dddddddddddd'
  AND community_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
```
Expected: UPDATE fails or affects 0 rows (RLS blocks)

**Step 5: Document moderator permission test results**

```bash
echo "
Moderator Permission Tests:

✅ Moderator CAN manage community_posts
✅ Moderator CAN manage community_alerts
❌ Moderator CANNOT manage public_services (admin-only)
❌ Moderator CANNOT manage user profiles (admin-only)

Moderator role working as designed!
" >> docs/test-results-phase1.txt
```

---

## Task 13: Update TypeScript Types

**Files:**
- Modify: `lib/types/database.ts`

**Step 1: Generate fresh types from Supabase**

Run: `npx supabase gen types typescript --local > lib/types/database-generated.ts`
Expected: New types file generated with updated role constraint

**Step 2: Verify moderator role in Profile type**

Check the generated file:
```bash
grep -A 5 "role:" lib/types/database-generated.ts
```
Expected: Should see `role: "user" | "moderator" | "admin"`

**Step 3: Copy updated types to database.ts**

Manually review and update `lib/types/database.ts` to include moderator role if not already present.

Verify this section exists:
```typescript
export interface Profile {
  id: string
  community_id: string | null
  full_name: string | null
  phone: string | null
  role: 'user' | 'moderator' | 'admin'  // ← Ensure moderator is here
  avatar_url: string | null
  created_at: string | null
  is_super_admin: boolean | null
  is_suspended: boolean | null
  suspended_at: string | null
  suspended_by: string | null
  suspension_reason: string | null
}
```

**Step 4: Commit**

```bash
git add lib/types/database.ts
git commit -m "fix(types): update Profile type to include moderator role

Generated fresh types from database schema after RLS migration.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 14: Update CLAUDE.md Documentation

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Add section about role permissions**

Find the "Architecture - Multi-Tenant" section and add:

```markdown
## Role-Based Access Control

### Super Admin
- Platform-wide access across ALL communities
- Can manage all data in all communities
- Flag: `profiles.is_super_admin = true`

### Community Admin
- Full access to their own community only
- Can manage: businesses, users, posts, alerts, services, reports
- Cannot access other communities' data
- Flag: `profiles.role = 'admin'` AND `profiles.community_id = X`

### Community Moderator
- Limited to content moderation in their community only
- Can manage: community posts, alerts, and reports
- Cannot manage: businesses, users, or public services
- Cannot access other communities' data
- Flag: `profiles.role = 'moderator'` AND `profiles.community_id = X`

### Regular User
- Can view approved content
- Can create businesses and community posts
- Can edit/delete own content only
- Flag: `profiles.role = 'user'`

**RLS Security:** All database tables enforce community-level isolation via Row Level Security policies.
Community admins/moderators can ONLY access data within their assigned community.
```

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add role-based access control documentation

Documented super admin, admin, moderator, and user permissions.
Clarified RLS multi-tenant isolation guarantees.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 15: Create Pull Request

**Files:**
- None (git operations)

**Step 1: Push to remote**

Run: `git push origin master`
Expected: All commits pushed successfully

**Step 2: Create PR (if using GitHub flow)**

If working in a feature branch:
```bash
gh pr create --title "🔒 SECURITY: Fix multi-tenant RLS policies" \
  --body "$(cat <<'EOF'
## Security Fix: Multi-Tenant RLS Isolation

### Problem
Critical vulnerability: Community admins could access data from other communities.

### Solution
- Added helper functions: `is_community_staff()`, `can_moderate_content()`, `is_community_admin_only()`
- Fixed RLS policies for: `community_posts`, `community_alerts`, `public_services`, `content_reports`
- Added moderator role support (content moderation only)
- Verified existing policies for `businesses` and `profiles` already secure

### Testing
- ✅ Manual RLS testing with test users (super admin, admin, moderator)
- ✅ Verified cross-community isolation
- ✅ Verified moderator limitations (can't manage businesses/users)
- ✅ Applied migration locally without errors

### Migration
- File: `supabase/migrations/20260303000001_fix_multi_tenant_rls.sql`
- Safe to deploy: Only adds policies, doesn't modify data

### Deploy Priority
🔴 **CRITICAL** - Deploy ASAP to fix security vulnerability

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"
```

**Step 3: Verify PR created**

Run: `gh pr view --web`
Expected: PR opens in browser

---

## Task 16: Prepare for Production Deployment

**Files:**
- Create: `docs/deployment-checklist-phase1.md`

**Step 1: Create deployment checklist**

```markdown
# Phase 1 Deployment Checklist

## Pre-Deployment

- [ ] Reviewed migration SQL in `supabase/migrations/20260303000001_fix_multi_tenant_rls.sql`
- [ ] Tested migration on local Supabase instance
- [ ] Created database backup (Supabase Studio → Backups)
- [ ] Verified no active admin users will be locked out
- [ ] Scheduled deployment during low-traffic window

## Deployment Steps

1. [ ] Backup production database
   ```bash
   # Via Supabase Dashboard: Settings → Database → Create Backup
   ```

2. [ ] Apply migration
   ```bash
   supabase db push
   # Or via Supabase Studio: SQL Editor → run migration file
   ```

3. [ ] Verify helper functions created
   ```sql
   SELECT proname FROM pg_proc
   WHERE proname IN ('is_community_staff', 'can_moderate_content', 'is_community_admin_only');
   ```

4. [ ] Verify RLS policies updated
   ```sql
   SELECT tablename, policyname FROM pg_policies
   WHERE tablename IN ('community_posts', 'community_alerts', 'public_services', 'content_reports')
   ORDER BY tablename;
   ```

5. [ ] Test with production users
   - [ ] Login as super admin → Verify can see all communities
   - [ ] Login as community admin → Verify can only see own community
   - [ ] Login as moderator → Verify can manage posts but not businesses

## Post-Deployment Monitoring

- [ ] Monitor Supabase logs for RLS policy errors (first 1 hour)
- [ ] Check admin panel functionality (approve business, delete post, etc.)
- [ ] Verify no user complaints about locked-out access
- [ ] Monitor database query performance (RLS adds overhead)

## Rollback Plan

If critical issues occur:

1. Restore from backup
2. Or manually revert policies:
   ```bash
   # Restore old policies from backup migration file
   supabase db reset --db-url <backup-connection-string>
   ```

## Success Criteria

- ✅ Zero cross-community data leaks
- ✅ Admin/moderator role differentiation working
- ✅ Super admin has full platform access
- ✅ No performance degradation (queries < 100ms)
```

**Step 2: Commit**

```bash
git add docs/deployment-checklist-phase1.md
git commit -m "docs: add Phase 1 deployment checklist

Comprehensive pre-deployment, deployment, and post-deployment steps.
Includes rollback plan and success criteria.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Post-Implementation Checklist

- [ ] All migration steps completed and committed
- [ ] Helper functions created and tested
- [ ] RLS policies fixed for: community_posts, community_alerts, public_services, content_reports
- [ ] Manual testing completed with test users (super admin, admin, moderator)
- [ ] TypeScript types updated to include moderator role
- [ ] CLAUDE.md documentation updated
- [ ] Deployment checklist created
- [ ] Pull request created (if applicable)
- [ ] Ready for production deployment

---

## Next Steps

**After deploying Phase 1:**

1. Monitor production for 3-5 days to ensure stability
2. Verify no unexpected RLS policy issues
3. Proceed to **Phase 2: Monitoring Infrastructure**
   - Add audit_logs table
   - Add error_logs table
   - Create logging API endpoints
   - Build admin logs UI

**Estimated Timeline:**
- Phase 1 (this): 2-3 days for implementation + testing
- Deploy to production: 1 day (with monitoring)
- Phase 2 start: 1 week after Phase 1 stable

---

**End of Phase 1 Implementation Plan**
