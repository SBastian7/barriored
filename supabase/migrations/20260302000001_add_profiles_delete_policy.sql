-- Add DELETE policy for profiles table
-- Allows admins to delete user profiles in their community (or super admins to delete any)

CREATE POLICY "profiles_delete_admin" ON profiles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles AS p
      WHERE p.id = auth.uid()
      AND (
        -- Super admins can delete anyone
        p.is_super_admin = true
        OR
        -- Regular admins can delete users in their community
        (p.role = 'admin' AND p.community_id = profiles.community_id)
      )
    )
  );

COMMENT ON POLICY "profiles_delete_admin" ON profiles IS
  'Allows super admins to delete any profile, or community admins to delete profiles in their community';
