-- Migration: Add Audit Logs and Error Logs Tables
-- Date: 2026-03-03
-- Description: Track admin actions and capture runtime errors for debugging

-- ============================================================================
-- AUDIT_LOGS: Track admin actions for compliance
-- ============================================================================

CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid REFERENCES communities(id),  -- NULL for platform-wide actions
  user_id uuid NOT NULL REFERENCES auth.users(id),
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

-- Add comments
COMMENT ON TABLE audit_logs IS
  'Audit trail of all admin actions for compliance and debugging';

COMMENT ON COLUMN audit_logs.community_id IS
  'NULL for platform-wide actions (e.g., create_community by super admin)';

COMMENT ON COLUMN audit_logs.metadata IS
  'Additional context: IP address, user agent, request ID, etc.';

-- Enable RLS on audit_logs
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

-- No public INSERT (only backend via service role)
-- No INSERT policy means only service role can insert
