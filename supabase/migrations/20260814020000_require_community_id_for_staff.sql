-- Every community-scoped RLS check (is_community_admin, is_community_staff,
-- is_community_admin_only) matches on `community_id = <caller's own community_id>`.
-- If a non-super-admin admin/moderator's own community_id is NULL, that
-- comparison is NULL for every row, so these functions always return false —
-- silently hiding all community content/users from that staff member, with no
-- error anywhere. This already happened once (an admin's community_id was
-- NULL from an earlier trigger failure) and nothing prevented it.
--
-- This constraint makes that state impossible to create again, regardless of
-- whether it's attempted via the trigger, the admin role-assignment UI, a
-- future API route, or a manual dashboard edit.

ALTER TABLE profiles ADD CONSTRAINT profiles_staff_requires_community
CHECK (
  is_super_admin = true
  OR role NOT IN ('admin', 'moderator')
  OR community_id IS NOT NULL
);
