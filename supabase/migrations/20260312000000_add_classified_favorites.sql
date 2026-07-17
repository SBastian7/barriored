-- Migration: Add Classified Favorites
-- Date: 2026-03-12
-- Description: Enable users to save/bookmark classifieds

-- ============================================================================
-- CLASSIFIED_FAVORITES: Users can bookmark classifieds
-- ============================================================================

CREATE TABLE classified_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  classified_id UUID NOT NULL REFERENCES classifieds(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate favorites
  UNIQUE(user_id, classified_id)
);

COMMENT ON TABLE classified_favorites IS
  'User bookmarks/favorites for marketplace classifieds';

-- Indexes for performance
CREATE INDEX idx_favorites_user ON classified_favorites(user_id, created_at DESC);
CREATE INDEX idx_favorites_classified ON classified_favorites(classified_id);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE classified_favorites ENABLE ROW LEVEL SECURITY;

-- Users can view only their own favorites
CREATE POLICY "favorites_select_own"
  ON classified_favorites FOR SELECT
  USING (user_id = auth.uid());

-- Users can add favorites
CREATE POLICY "favorites_insert_own"
  ON classified_favorites FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can remove only their own favorites
CREATE POLICY "favorites_delete_own"
  ON classified_favorites FOR DELETE
  USING (user_id = auth.uid());
