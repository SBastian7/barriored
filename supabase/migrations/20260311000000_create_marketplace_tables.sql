-- Migration: Create Marketplace Tables
-- Date: 2026-03-11
-- Description: Add marketplace/classifieds functionality with categories, listings, and user bans

-- ============================================================================
-- EXTEND CONTENT_REPORTS: Add support for 'classified' entity type
-- ============================================================================

-- Drop old constraint that only allows 'business' and 'post'
ALTER TABLE content_reports DROP CONSTRAINT IF EXISTS content_reports_reported_entity_type_check;

-- Add new constraint that includes 'classified'
ALTER TABLE content_reports ADD CONSTRAINT content_reports_reported_entity_type_check
  CHECK (reported_entity_type IN ('business', 'post', 'classified'));

COMMENT ON COLUMN content_reports.reported_entity_type IS
  'Type of entity: business, post, or classified';

-- Add community_id column to content_reports for better filtering (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'content_reports' AND column_name = 'community_id'
  ) THEN
    ALTER TABLE content_reports ADD COLUMN community_id UUID REFERENCES communities(id);
    CREATE INDEX idx_content_reports_community ON content_reports(community_id, status);

    COMMENT ON COLUMN content_reports.community_id IS
      'Community where the reported entity belongs (for filtering and isolation)';
  END IF;
END $$;

-- ============================================================================
-- MARKETPLACE_CATEGORIES: Marketplace-specific categories for classifieds
-- ============================================================================

CREATE TABLE marketplace_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  icon TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE marketplace_categories IS
  'Categories for marketplace classifieds (Vendo, Compro, Arriendo, Servicios, Trabajo)';

-- ============================================================================
-- CLASSIFIEDS: Main marketplace listings table
-- ============================================================================

CREATE TABLE classifieds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES marketplace_categories(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price TEXT,
  images TEXT[],
  whatsapp TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  is_featured BOOLEAN DEFAULT false,
  featured_until TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  sold_at TIMESTAMPTZ,
  flagged_at TIMESTAMPTZ,
  flagged_by UUID REFERENCES profiles(id),
  flagged_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT classifieds_status_check CHECK (status IN ('active', 'sold', 'archived', 'flagged', 'removed'))
);

COMMENT ON TABLE classifieds IS
  'Marketplace classifieds posted by community members';

COMMENT ON COLUMN classifieds.status IS
  'active: visible, sold: marked as sold, archived: auto-archived after 60 days, flagged: marked inappropriate, removed: deleted by admin';

COMMENT ON COLUMN classifieds.price IS
  'Optional price - can be numeric, "Negociable", "Gratis", etc.';

COMMENT ON COLUMN classifieds.images IS
  'Array of Supabase storage URLs (max 5 images)';

-- ============================================================================
-- MARKETPLACE_USER_BANS: Track users banned from marketplace
-- ============================================================================

CREATE TABLE marketplace_user_bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  banned_by UUID NOT NULL REFERENCES profiles(id),
  reason TEXT NOT NULL,
  banned_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);

COMMENT ON TABLE marketplace_user_bans IS
  'Users banned from posting in marketplace (temporary or permanent)';

COMMENT ON COLUMN marketplace_user_bans.expires_at IS
  'NULL = permanent ban, otherwise temporary ban until this timestamp';

-- ============================================================================
-- INDEXES: Performance optimization
-- ============================================================================

CREATE INDEX idx_classifieds_community_status ON classifieds(community_id, status);
CREATE INDEX idx_classifieds_user ON classifieds(user_id);
CREATE INDEX idx_classifieds_category ON classifieds(category_id);
CREATE INDEX idx_classifieds_activity ON classifieds(last_activity_at);
CREATE INDEX idx_marketplace_bans_user ON marketplace_user_bans(user_id, is_active);

-- ============================================================================
-- SEED DATA: Default marketplace categories
-- ============================================================================

INSERT INTO marketplace_categories (name, slug, icon, description, display_order) VALUES
  ('Vendo', 'vendo', 'ShoppingCart', 'Artículos en venta', 1),
  ('Compro', 'compro', 'ShoppingBag', 'Buscando comprar', 2),
  ('Arriendo', 'arriendo', 'Home', 'Propiedades en arriendo', 3),
  ('Servicios', 'servicios', 'Wrench', 'Servicios ofrecidos', 4),
  ('Trabajo', 'trabajo', 'Briefcase', 'Oportunidades laborales', 5);

-- ============================================================================
-- RLS POLICIES: Row Level Security
-- ============================================================================

-- Enable RLS
ALTER TABLE classifieds ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_user_bans ENABLE ROW LEVEL SECURITY;

-- CLASSIFIEDS POLICIES

-- Users can view active/sold classifieds in their community
CREATE POLICY "classifieds_select_users"
  ON classifieds FOR SELECT
  USING (
    community_id = (SELECT community_id FROM profiles WHERE id = auth.uid())
    AND status IN ('active', 'sold')
  );

-- Users can insert classifieds if not banned
CREATE POLICY "classifieds_insert_users"
  ON classifieds FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND community_id = (SELECT community_id FROM profiles WHERE id = auth.uid())
    AND NOT EXISTS (
      SELECT 1 FROM marketplace_user_bans
      WHERE user_id = auth.uid()
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > NOW())
    )
  );

-- Users can update only their own classifieds
CREATE POLICY "classifieds_update_own"
  ON classifieds FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete only their own classifieds
CREATE POLICY "classifieds_delete_own"
  ON classifieds FOR DELETE
  USING (user_id = auth.uid());

-- Moderators can view all classifieds in their community
CREATE POLICY "classifieds_select_moderators"
  ON classifieds FOR SELECT
  USING (
    community_id = (SELECT community_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'moderator')
  );

-- Admins can update any classified in their community
CREATE POLICY "classifieds_update_admins"
  ON classifieds FOR UPDATE
  USING (
    community_id = (SELECT community_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Admins can delete any classified in their community
CREATE POLICY "classifieds_delete_admins"
  ON classifieds FOR DELETE
  USING (
    community_id = (SELECT community_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Super admins can do everything
CREATE POLICY "classifieds_all_super_admins"
  ON classifieds FOR ALL
  USING ((SELECT is_super_admin FROM profiles WHERE id = auth.uid()) = true);

-- MARKETPLACE_CATEGORIES POLICIES

-- Everyone can view active categories (public)
CREATE POLICY "marketplace_categories_select_all"
  ON marketplace_categories FOR SELECT
  TO public
  USING (is_active = true);

-- MARKETPLACE_USER_BANS POLICIES

-- Admins and moderators can view bans in their community
CREATE POLICY "marketplace_bans_select_staff"
  ON marketplace_user_bans FOR SELECT
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'moderator')
    OR (SELECT is_super_admin FROM profiles WHERE id = auth.uid()) = true
  );

-- Only admins can create bans
CREATE POLICY "marketplace_bans_insert_admin"
  ON marketplace_user_bans FOR INSERT
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    OR (SELECT is_super_admin FROM profiles WHERE id = auth.uid()) = true
  );

-- Only admins can update bans (for unbanning)
CREATE POLICY "marketplace_bans_update_admin"
  ON marketplace_user_bans FOR UPDATE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    OR (SELECT is_super_admin FROM profiles WHERE id = auth.uid()) = true
  );

-- Add RLS policy for content_reports to support classifieds
CREATE POLICY "content_reports_select_classified"
  ON content_reports FOR SELECT
  USING (
    auth.uid() = reporter_id  -- Users see their own reports
    OR is_super_admin()
    OR (
      reported_entity_type = 'classified'
      AND EXISTS (
        SELECT 1 FROM classifieds
        WHERE id = reported_entity_id
          AND is_community_staff(community_id)
      )
    )
  );

CREATE POLICY "content_reports_update_classified"
  ON content_reports FOR UPDATE
  USING (
    is_super_admin()
    OR (
      reported_entity_type = 'classified'
      AND EXISTS (
        SELECT 1 FROM classifieds
        WHERE id = reported_entity_id
          AND is_community_staff(community_id)
      )
    )
  );
