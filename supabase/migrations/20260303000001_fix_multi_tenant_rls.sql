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
