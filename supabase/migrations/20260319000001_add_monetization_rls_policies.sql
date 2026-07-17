-- ============================================================================
-- ROW LEVEL SECURITY POLICIES FOR MONETIZATION TABLES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE business_analytics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE banner_ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE banner_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_flags ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- BUSINESS_ANALYTICS_DAILY POLICIES
-- ============================================================================

-- Business owners can read their own analytics
CREATE POLICY "Business owners can view their own analytics"
  ON business_analytics_daily FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- Community admins can view all analytics in their community
CREATE POLICY "Community admins can view community analytics"
  ON business_analytics_daily FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN businesses b ON b.id = business_analytics_daily.business_id
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
        AND p.community_id = b.community_id
    )
  );

-- Super admins can view all analytics
CREATE POLICY "Super admins can view all analytics"
  ON business_analytics_daily FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- Analytics tracking can insert/update (restricted to existing businesses in user's community)
CREATE POLICY "Allow analytics tracking inserts"
  ON business_analytics_daily FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT b.id FROM businesses b
      JOIN profiles p ON p.community_id = b.community_id
      WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "Allow analytics tracking updates"
  ON business_analytics_daily FOR UPDATE
  USING (date = CURRENT_DATE);

-- ============================================================================
-- BUSINESS_SUBSCRIPTIONS POLICIES
-- ============================================================================

-- Business owners can read their own subscriptions
CREATE POLICY "Business owners can view their subscriptions"
  ON business_subscriptions FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- Business owners can create subscription requests
CREATE POLICY "Business owners can request subscriptions"
  ON business_subscriptions FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- Business owners can cancel their own active subscriptions
CREATE POLICY "Business owners can cancel their subscriptions"
  ON business_subscriptions FOR UPDATE
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
    AND status = 'active'
  )
  WITH CHECK (
    status = 'cancelled'
  );

-- Community admins can view subscriptions in their community
CREATE POLICY "Admins can view community subscriptions"
  ON business_subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN businesses b ON b.id = business_subscriptions.business_id
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
        AND p.community_id = b.community_id
    )
  );

-- Community admins can update subscriptions in their community
CREATE POLICY "Admins can manage community subscriptions"
  ON business_subscriptions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN businesses b ON b.id = business_subscriptions.business_id
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
        AND p.community_id = b.community_id
    )
  );

-- Super admins have full access
CREATE POLICY "Super admins have full subscription access"
  ON business_subscriptions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- ============================================================================
-- SUBSCRIPTION_PAYMENTS POLICIES
-- ============================================================================

-- Business owners can view payments for their subscriptions
CREATE POLICY "Business owners can view their payments"
  ON subscription_payments FOR SELECT
  USING (
    subscription_id IN (
      SELECT s.id FROM business_subscriptions s
      JOIN businesses b ON b.id = s.business_id
      WHERE b.owner_id = auth.uid()
    )
  );

-- Only admins can create payment records
CREATE POLICY "Admins can create payment records"
  ON subscription_payments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN business_subscriptions s ON s.id = subscription_payments.subscription_id
      JOIN businesses b ON b.id = s.business_id
      WHERE p.id = auth.uid()
        AND (p.is_super_admin = true OR (p.role = 'admin' AND p.community_id = b.community_id))
    )
  );

-- Admins can view payments in their community
CREATE POLICY "Admins can view community payments"
  ON subscription_payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN business_subscriptions s ON s.id = subscription_payments.subscription_id
      JOIN businesses b ON b.id = s.business_id
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
        AND p.community_id = b.community_id
    )
  );

-- Super admins have full access
CREATE POLICY "Super admins have full payment access"
  ON subscription_payments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- ============================================================================
-- BANNER_ADS POLICIES
-- ============================================================================

-- Business owners can create banner requests
CREATE POLICY "Business owners can request banner ads"
  ON banner_ads FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- Business owners can read their own banners
CREATE POLICY "Business owners can view their banners"
  ON banner_ads FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- Public can read active banners (for display)
CREATE POLICY "Public can view active banners"
  ON banner_ads FOR SELECT
  USING (
    status = 'active'
    AND community_id IN (SELECT id FROM communities WHERE is_active = true)
  );

-- Admins can view all banners in their community
CREATE POLICY "Admins can view community banners"
  ON banner_ads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role = 'admin'
        AND community_id = banner_ads.community_id
    )
  );

-- Admins can update banners in their community
CREATE POLICY "Admins can manage community banners"
  ON banner_ads FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role = 'admin'
        AND community_id = banner_ads.community_id
    )
  );

-- Super admins have full access
CREATE POLICY "Super admins have full banner access"
  ON banner_ads FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- ============================================================================
-- BANNER_PAYMENTS POLICIES
-- ============================================================================

-- Business owners can view payments for their banners
CREATE POLICY "Business owners can view their banner payments"
  ON banner_payments FOR SELECT
  USING (
    banner_id IN (
      SELECT ba.id FROM banner_ads ba
      JOIN businesses b ON b.id = ba.business_id
      WHERE b.owner_id = auth.uid()
    )
  );

-- Only admins can create payment records
CREATE POLICY "Admins can create banner payment records"
  ON banner_payments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN banner_ads ba ON ba.id = banner_payments.banner_id
      WHERE p.id = auth.uid()
        AND (p.is_super_admin = true OR (p.role = 'admin' AND p.community_id = ba.community_id))
    )
  );

-- Admins can view payments in their community
CREATE POLICY "Admins can view community banner payments"
  ON banner_payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN banner_ads ba ON ba.id = banner_payments.banner_id
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
        AND p.community_id = ba.community_id
    )
  );

-- Super admins have full access
CREATE POLICY "Super admins have full banner payment access"
  ON banner_payments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- ============================================================================
-- REVIEW_FLAGS POLICIES
-- ============================================================================

-- Business owners can flag reviews on their businesses
CREATE POLICY "Business owners can flag reviews"
  ON review_flags FOR INSERT
  WITH CHECK (
    review_id IN (
      SELECT br.id FROM business_reviews br
      JOIN businesses b ON b.id = br.business_id
      WHERE b.owner_id = auth.uid()
    )
  );

-- Business owners can view flags they created
CREATE POLICY "Business owners can view their flags"
  ON review_flags FOR SELECT
  USING (flagged_by = auth.uid());

-- Admins can view all flags in their community
CREATE POLICY "Admins can view community flags"
  ON review_flags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN business_reviews br ON br.id = review_flags.review_id
      JOIN businesses b ON b.id = br.business_id
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'moderator')
        AND p.community_id = b.community_id
    )
  );

-- Admins can update flags in their community
CREATE POLICY "Admins can resolve community flags"
  ON review_flags FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN business_reviews br ON br.id = review_flags.review_id
      JOIN businesses b ON b.id = br.business_id
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'moderator')
        AND p.community_id = b.community_id
    )
  );

-- Super admins have full access
CREATE POLICY "Super admins have full review flag access"
  ON review_flags FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );
