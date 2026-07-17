-- ============================================================================
-- PHASE 2: MONETIZATION TABLES
-- Analytics, Premium Subscriptions, Banner Ads, Review Flags
-- ============================================================================

-- 1. BUSINESS ANALYTICS DAILY
-- Stores daily snapshots for charting
CREATE TABLE IF NOT EXISTS business_analytics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  profile_views INT DEFAULT 0,
  whatsapp_clicks INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(business_id, date)
);

CREATE INDEX idx_analytics_business_date ON business_analytics_daily(business_id, date DESC);

COMMENT ON TABLE business_analytics_daily IS 'Daily analytics snapshots for business profile views and WhatsApp clicks';
COMMENT ON COLUMN business_analytics_daily.profile_views IS 'Number of profile page views on this date';
COMMENT ON COLUMN business_analytics_daily.whatsapp_clicks IS 'Number of WhatsApp button clicks on this date';

-- 2. BUSINESS SUBSCRIPTIONS
-- Premium subscription management
CREATE TABLE IF NOT EXISTS business_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('requested', 'active', 'cancelled')),
  requested_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_business ON business_subscriptions(business_id, status);
CREATE INDEX idx_subscriptions_expires ON business_subscriptions(expires_at) WHERE status = 'active';

COMMENT ON TABLE business_subscriptions IS 'Premium subscription management with monthly billing cycle';
COMMENT ON COLUMN business_subscriptions.status IS 'requested = pending admin approval, active = currently premium, cancelled = ended';
COMMENT ON COLUMN business_subscriptions.expires_at IS 'Expiration date for monthly billing, auto-downgrade on expiry';

-- 3. SUBSCRIPTION PAYMENTS
-- Admin-entered payment records
CREATE TABLE IF NOT EXISTS subscription_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES business_subscriptions(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method TEXT,
  payment_proof_url TEXT,
  recorded_by UUID NOT NULL REFERENCES profiles(id),
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  notes TEXT
);

CREATE INDEX idx_payments_subscription ON subscription_payments(subscription_id, recorded_at DESC);

COMMENT ON TABLE subscription_payments IS 'Manual payment records entered by admins for premium subscriptions';
COMMENT ON COLUMN subscription_payments.recorded_by IS 'Admin user who recorded this payment';
COMMENT ON COLUMN subscription_payments.payment_proof_url IS 'Optional receipt/proof image URL from Supabase Storage';

-- 4. BANNER ADS
-- Banner ad campaigns
CREATE TABLE IF NOT EXISTS banner_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES communities(id),
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  link_url TEXT,
  placement TEXT NOT NULL CHECK (placement IN ('homepage', 'directory')),
  status TEXT NOT NULL CHECK (status IN ('requested', 'active', 'paused', 'expired')),
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_banners_active ON banner_ads(community_id, placement, status)
  WHERE status = 'active';
CREATE INDEX idx_banners_business ON banner_ads(business_id, status);

COMMENT ON TABLE banner_ads IS 'Banner ad campaigns with homepage and directory placement options';
COMMENT ON COLUMN banner_ads.image_url IS 'Banner image URL from Supabase Storage (1200x400px recommended)';
COMMENT ON COLUMN banner_ads.placement IS 'homepage = community homepage, directory = business directory page';

-- 5. BANNER PAYMENTS
-- Payment tracking for banners
CREATE TABLE IF NOT EXISTS banner_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  banner_id UUID NOT NULL REFERENCES banner_ads(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method TEXT,
  payment_proof_url TEXT,
  recorded_by UUID NOT NULL REFERENCES profiles(id),
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

CREATE INDEX idx_banner_payments ON banner_payments(banner_id, recorded_at DESC);

COMMENT ON TABLE banner_payments IS 'Manual payment records for banner ad campaigns';

-- 6. REVIEW FLAGS
-- Business owner reports of inappropriate reviews
CREATE TABLE IF NOT EXISTS review_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES business_reviews(id) ON DELETE CASCADE,
  flagged_by UUID NOT NULL REFERENCES profiles(id),
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'offensive', 'fake', 'irrelevant', 'other')),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed')),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(review_id, flagged_by)
);

CREATE INDEX idx_review_flags_status ON review_flags(status, created_at DESC);
CREATE INDEX idx_review_flags_review ON review_flags(review_id);

COMMENT ON TABLE review_flags IS 'Business owner reports of inappropriate reviews for admin moderation';
COMMENT ON COLUMN review_flags.status IS 'pending = awaiting admin review, reviewed = admin took action, dismissed = flag rejected';

-- 7. ADD ANALYTICS COLUMNS TO BUSINESSES TABLE
-- Rolling counters for quick totals
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS total_profile_views INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_whatsapp_clicks INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_analytics_update TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_businesses_analytics ON businesses(total_profile_views DESC, total_whatsapp_clicks DESC);

COMMENT ON COLUMN businesses.total_profile_views IS 'Running total of profile page views (client-side tracked)';
COMMENT ON COLUMN businesses.total_whatsapp_clicks IS 'Running total of WhatsApp button clicks';
COMMENT ON COLUMN businesses.last_analytics_update IS 'Last time analytics were updated';
