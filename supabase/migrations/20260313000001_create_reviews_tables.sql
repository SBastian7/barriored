-- Migration: Create Business Reviews & Ratings System
-- Date: 2026-03-13
-- Description: Creates tables and RLS policies for business reviews and owner responses
-- Phase: Phase 2 - Monetization

-- ============================================================================
-- BUSINESS_REVIEWS TABLE
-- ============================================================================

CREATE TABLE business_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One review per user per business
  CONSTRAINT unique_user_business_review UNIQUE (business_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_reviews_business_id ON business_reviews(business_id);
CREATE INDEX idx_reviews_user_id ON business_reviews(user_id);
CREATE INDEX idx_reviews_created_at ON business_reviews(created_at DESC);
CREATE INDEX idx_reviews_rating ON business_reviews(rating);

-- Auto-update updated_at timestamp
CREATE TRIGGER business_reviews_updated_at
  BEFORE UPDATE ON business_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE business_reviews IS
  'User reviews and ratings for businesses. One review per user per business.';

COMMENT ON COLUMN business_reviews.rating IS
  'Rating from 1 (worst) to 5 (best) stars';

COMMENT ON COLUMN business_reviews.review_text IS
  'Optional text review/comment from user';

-- ============================================================================
-- BUSINESS_REVIEW_RESPONSES TABLE
-- ============================================================================

CREATE TABLE business_review_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES business_reviews(id) ON DELETE CASCADE,
  response_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One response per review
  CONSTRAINT unique_review_response UNIQUE (review_id)
);

-- Index for foreign key lookups
CREATE INDEX idx_review_responses_review_id ON business_review_responses(review_id);

-- Auto-update updated_at timestamp
CREATE TRIGGER business_review_responses_updated_at
  BEFORE UPDATE ON business_review_responses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE business_review_responses IS
  'Business owner responses to reviews. One response per review.';

COMMENT ON COLUMN business_review_responses.response_text IS
  'Business owner response to the review';

-- ============================================================================
-- HELPER FUNCTION: Check if user owns the business
-- ============================================================================

CREATE OR REPLACE FUNCTION owns_business_for_review(review_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM business_reviews br
    JOIN businesses b ON b.id = br.business_id
    WHERE br.id = review_uuid
      AND b.owner_id = auth.uid()
  );
$$;

COMMENT ON FUNCTION owns_business_for_review(UUID) IS
  'Returns true if the current user owns the business associated with the review';

-- ============================================================================
-- RLS POLICIES: business_reviews
-- ============================================================================

-- Enable RLS
ALTER TABLE business_reviews ENABLE ROW LEVEL SECURITY;

-- SELECT: Anyone can view reviews for approved businesses
CREATE POLICY "business_reviews_select_public"
ON business_reviews FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM businesses
    WHERE id = business_reviews.business_id
      AND status = 'approved'
      AND is_active = true
  )
);

-- INSERT: Authenticated users can create reviews for approved businesses
-- User ID must match auth.uid() to prevent impersonation
CREATE POLICY "business_reviews_insert_auth"
ON business_reviews FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM businesses
    WHERE id = business_reviews.business_id
      AND status = 'approved'
      AND is_active = true
  )
);

-- UPDATE: Users can update their own reviews
CREATE POLICY "business_reviews_update_own"
ON business_reviews FOR UPDATE
USING (auth.uid() = user_id);

-- DELETE: Users can delete their own reviews
CREATE POLICY "business_reviews_delete_own"
ON business_reviews FOR DELETE
USING (auth.uid() = user_id);

-- ALL: Community staff can manage all reviews in their community
CREATE POLICY "business_reviews_all_staff"
ON business_reviews FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM businesses
    WHERE id = business_reviews.business_id
      AND is_community_staff(community_id)
  )
);

COMMENT ON POLICY "business_reviews_select_public" ON business_reviews IS
  'Anyone can view reviews for approved, active businesses';

COMMENT ON POLICY "business_reviews_insert_auth" ON business_reviews IS
  'Authenticated users can create reviews for approved businesses. User ID must match auth user.';

COMMENT ON POLICY "business_reviews_update_own" ON business_reviews IS
  'Users can update their own reviews only';

COMMENT ON POLICY "business_reviews_delete_own" ON business_reviews IS
  'Users can delete their own reviews only';

COMMENT ON POLICY "business_reviews_all_staff" ON business_reviews IS
  'Community staff (admin/moderator) can manage all reviews in their community';

-- ============================================================================
-- RLS POLICIES: business_review_responses
-- ============================================================================

-- Enable RLS
ALTER TABLE business_review_responses ENABLE ROW LEVEL SECURITY;

-- SELECT: Anyone can view responses for reviews on approved businesses
CREATE POLICY "business_review_responses_select_public"
ON business_review_responses FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM business_reviews br
    JOIN businesses b ON b.id = br.business_id
    WHERE br.id = business_review_responses.review_id
      AND b.status = 'approved'
      AND b.is_active = true
  )
);

-- ALL: Business owners can manage responses for their business reviews
CREATE POLICY "business_review_responses_all_owner"
ON business_review_responses FOR ALL
USING (owns_business_for_review(review_id));

-- ALL: Community staff can manage all responses in their community
CREATE POLICY "business_review_responses_all_staff"
ON business_review_responses FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM business_reviews br
    JOIN businesses b ON b.id = br.business_id
    WHERE br.id = business_review_responses.review_id
      AND is_community_staff(b.community_id)
  )
);

COMMENT ON POLICY "business_review_responses_select_public" ON business_review_responses IS
  'Anyone can view responses for reviews on approved, active businesses';

COMMENT ON POLICY "business_review_responses_all_owner" ON business_review_responses IS
  'Business owners can create, update, and delete responses to reviews of their business';

COMMENT ON POLICY "business_review_responses_all_staff" ON business_review_responses IS
  'Community staff (admin/moderator) can manage all responses in their community';

-- ============================================================================
-- VERIFICATION QUERIES (commented out - for reference only)
-- ============================================================================

-- Verify table creation:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
-- AND table_name IN ('business_reviews', 'business_review_responses');

-- Verify RLS is enabled:
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- AND tablename IN ('business_reviews', 'business_review_responses');

-- Verify policies exist:
-- SELECT schemaname, tablename, policyname, cmd
-- FROM pg_policies
-- WHERE tablename IN ('business_reviews', 'business_review_responses')
-- ORDER BY tablename, policyname;
