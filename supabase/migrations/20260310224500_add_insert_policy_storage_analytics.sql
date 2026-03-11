-- Add INSERT policy for image_storage_analytics
-- Allows admins to insert storage snapshots for their community

CREATE POLICY "Admins can insert storage analytics"
  ON image_storage_analytics
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM profiles
      WHERE (role = 'admin' AND community_id = image_storage_analytics.community_id)
         OR is_super_admin = true
    )
  );

-- Comment
COMMENT ON POLICY "Admins can insert storage analytics" ON image_storage_analytics IS 'Allows admins to sync storage data for their community';
