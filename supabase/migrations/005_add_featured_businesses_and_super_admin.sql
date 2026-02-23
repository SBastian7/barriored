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
