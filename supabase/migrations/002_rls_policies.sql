-- Enable RLS on all tables
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

-- COMMUNITIES: public read for active
CREATE POLICY "communities_select_active" ON communities
  FOR SELECT USING (is_active = true);

-- CATEGORIES: public read
CREATE POLICY "categories_select_all" ON categories
  FOR SELECT USING (true);

CREATE POLICY "categories_admin_insert" ON categories
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "categories_admin_update" ON categories
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "categories_admin_delete" ON categories
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- PROFILES
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "profiles_select_admin" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles AS p
      WHERE p.id = auth.uid() AND p.role = 'admin' AND p.community_id = profiles.community_id
    )
  );

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "profiles_admin_update_role" ON profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles AS p
      WHERE p.id = auth.uid() AND p.role = 'admin' AND p.community_id = profiles.community_id
    )
  );

-- BUSINESSES: public read approved
CREATE POLICY "businesses_select_approved" ON businesses
  FOR SELECT USING (
    status = 'approved' AND is_active = true
    AND EXISTS (SELECT 1 FROM communities WHERE id = community_id AND is_active = true)
  );

-- Owner can see own businesses (any status)
CREATE POLICY "businesses_select_own" ON businesses
  FOR SELECT USING (owner_id = auth.uid());

-- Admin can see all in their community
CREATE POLICY "businesses_select_admin" ON businesses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin' AND community_id = businesses.community_id
    )
  );

-- Authenticated users can insert in their community
CREATE POLICY "businesses_insert_own" ON businesses
  FOR INSERT WITH CHECK (
    auth.uid() = owner_id
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND community_id = businesses.community_id
    )
  );

-- Owner can update own business
CREATE POLICY "businesses_update_own" ON businesses
  FOR UPDATE USING (owner_id = auth.uid());

-- Admin can update businesses in their community
CREATE POLICY "businesses_update_admin" ON businesses
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin' AND community_id = businesses.community_id
    )
  );

-- Admin can delete in their community
CREATE POLICY "businesses_delete_admin" ON businesses
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin' AND community_id = businesses.community_id
    )
  );
