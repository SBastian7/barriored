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
