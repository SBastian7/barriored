-- Migration: Fix Multi-Tenant RLS Policies
-- Date: 2026-03-03
-- Description: Add community_id scoping to all RLS policies to prevent cross-community data access
-- Critical: Security fix - deploy ASAP

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

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

-- ============================================================================
-- COMMUNITY_POSTS: Fix RLS policies to enforce community scoping
-- ============================================================================

-- Drop old policies that don't check community_id
DROP POLICY IF EXISTS "community_posts_delete_admin" ON community_posts;
DROP POLICY IF EXISTS "community_posts_select_admin" ON community_posts;
DROP POLICY IF EXISTS "community_posts_update_admin" ON community_posts;

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

COMMENT ON POLICY "community_posts_select_staff" ON community_posts IS
  'Fixed: Added community_id check. Staff (admin/moderator) can only see posts in their community.';

COMMENT ON POLICY "community_posts_update_staff" ON community_posts IS
  'Fixed: Added community_id check. Staff can only update posts in their community.';

COMMENT ON POLICY "community_posts_delete_staff" ON community_posts IS
  'Fixed: Added community_id check. Staff can only delete posts in their community.';

-- ============================================================================
-- COMMUNITY_ALERTS: Fix RLS policies to enforce community scoping
-- ============================================================================

-- Drop old broken policies
DROP POLICY IF EXISTS "community_alerts_delete_admin" ON community_alerts;
DROP POLICY IF EXISTS "community_alerts_insert_admin" ON community_alerts;
DROP POLICY IF EXISTS "community_alerts_update_admin" ON community_alerts;

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

COMMENT ON POLICY "community_alerts_insert_staff" ON community_alerts IS
  'Fixed: Added community_id check. Staff can only create alerts in their community.';

COMMENT ON POLICY "community_alerts_update_staff" ON community_alerts IS
  'Fixed: Added community_id check. Staff can only update alerts in their community.';

COMMENT ON POLICY "community_alerts_delete_staff" ON community_alerts IS
  'Fixed: Added community_id check. Staff can only delete alerts in their community.';

-- ============================================================================
-- PUBLIC_SERVICES: Fix RLS policies (Admin-only, moderators excluded)
-- ============================================================================

-- Drop old broken policies
DROP POLICY IF EXISTS "public_services_delete_admin" ON public_services;
DROP POLICY IF EXISTS "public_services_insert_admin" ON public_services;
DROP POLICY IF EXISTS "public_services_update_admin" ON public_services;

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

COMMENT ON POLICY "public_services_insert_admin" ON public_services IS
  'Fixed: Added community_id check. Only admins (not moderators) can create services in their community.';

COMMENT ON POLICY "public_services_update_admin" ON public_services IS
  'Fixed: Added community_id check. Only admins (not moderators) can update services in their community.';

COMMENT ON POLICY "public_services_delete_admin" ON public_services IS
  'Fixed: Added community_id check. Only admins (not moderators) can delete services in their community.';
