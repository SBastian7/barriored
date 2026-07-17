# Business Owner Monetization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement Phase 2 Monetization features enabling business owners to view analytics, upgrade to premium, purchase banner ads, and flag inappropriate reviews with manual admin payment processing.

**Architecture:** Incremental Database-First approach - build database schema and migrations first, then layer API routes, then UI components progressively. All payments handled manually by admins. Analytics tracked client-side with rolling counters + daily snapshots.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Supabase (PostgreSQL + Storage), Tailwind CSS, Recharts (for analytics charts), Radix UI

**Design Document:** See `docs/plans/2026-03-19-business-owner-monetization-design.md` for complete specifications.

---

## PHASE 1: DATABASE FOUNDATION

### Task 1: Create Monetization Migration File

**Files:**
- Create: `supabase/migrations/20260319000000_add_monetization_tables.sql`

**Step 1: Create migration file**

Create new file with complete SQL migration:

```sql
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
```

**Step 2: Apply migration**

Run: `npx supabase migration up`
Expected: Success message with all tables created

**Step 3: Generate TypeScript types**

Run: `npx supabase gen types typescript --local > lib/types/supabase.ts`
Expected: New types file generated

**Step 4: Commit migration**

```bash
git add supabase/migrations/20260319000000_add_monetization_tables.sql
git commit -m "feat(db): add monetization tables for analytics, subscriptions, banners, review flags"
```

---

### Task 2: Add RLS Policies for All Tables

**Files:**
- Create: `supabase/migrations/20260319000001_add_monetization_rls_policies.sql`

**Step 1: Create RLS policies migration**

```sql
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
        AND p.role IN ('admin', 'moderator')
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

-- Analytics tracking can insert/update (public, rate-limited in API)
CREATE POLICY "Allow analytics tracking inserts"
  ON business_analytics_daily FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow analytics tracking updates"
  ON business_analytics_daily FOR UPDATE
  USING (true);

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
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND (role = 'admin' OR is_super_admin = true)
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
  USING (status = 'active');

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
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND (role = 'admin' OR is_super_admin = true)
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
```

**Step 2: Apply RLS policies migration**

Run: `npx supabase migration up`
Expected: All RLS policies created successfully

**Step 3: Commit RLS policies**

```bash
git add supabase/migrations/20260319000001_add_monetization_rls_policies.sql
git commit -m "feat(db): add RLS policies for monetization tables"
```

---

### Task 3: Update TypeScript Database Types

**Files:**
- Modify: `lib/types/database.ts` (append at end)

**Step 1: Add helper types**

Append to end of `lib/types/database.ts`:

```typescript
// ============================================================================
// MONETIZATION HELPER TYPES
// ============================================================================

// Analytics
export type BusinessAnalyticsDaily = Database['public']['Tables']['business_analytics_daily']['Row']
export type AnalyticsSummary = {
  totals: {
    profileViews: number
    whatsappClicks: number
    lastUpdated: string | null
  }
  daily: BusinessAnalyticsDaily[]
  chartData: {
    labels: string[]
    views: number[]
    clicks: number[]
  }
}

// Subscriptions
export type Subscription = Database['public']['Tables']['business_subscriptions']['Row']
export type SubscriptionPayment = Database['public']['Tables']['subscription_payments']['Row']
export type SubscriptionWithPayments = Subscription & {
  payments: SubscriptionPayment[]
  business?: {
    id: string
    name: string
    slug: string
  }
}

// Banners
export type BannerAd = Database['public']['Tables']['banner_ads']['Row']
export type BannerPayment = Database['public']['Tables']['banner_payments']['Row']
export type BannerWithPayments = BannerAd & {
  payments: BannerPayment[]
  business?: {
    id: string
    name: string
    slug: string
  }
}

// Review Flags
export type ReviewFlag = Database['public']['Tables']['review_flags']['Row']
export type ReviewFlagWithReview = ReviewFlag & {
  review: ReviewWithRelations
  business: {
    id: string
    name: string
    slug: string
  }
  flagger: {
    id: string
    full_name: string | null
  }
}
```

**Step 2: Commit type updates**

```bash
git add lib/types/database.ts
git commit -m "feat(types): add monetization helper types"
```

---

## PHASE 2: ANALYTICS API & TRACKING

### Task 4: Create Analytics Tracking API Route

**Files:**
- Create: `app/api/analytics/track/route.ts`

**Step 1: Write analytics tracking endpoint**

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { businessId, eventType } = body as {
      businessId: string
      eventType: 'profile_view' | 'whatsapp_click'
    }

    // Validate input
    if (!businessId || !eventType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!['profile_view', 'whatsapp_click'].includes(eventType)) {
      return NextResponse.json(
        { error: 'Invalid event type' },
        { status: 400 }
      )
    }

    // Verify business exists
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('id', businessId)
      .single()

    if (businessError || !business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

    // Increment rolling counter on businesses table
    const columnName = eventType === 'profile_view'
      ? 'total_profile_views'
      : 'total_whatsapp_clicks'

    const { error: updateError } = await supabase
      .from('businesses')
      .update({
        [columnName]: supabase.raw(`${columnName} + 1`),
        last_analytics_update: new Date().toISOString()
      })
      .eq('id', businessId)

    if (updateError) {
      console.error('Error updating business analytics:', updateError)
      return NextResponse.json(
        { error: 'Failed to update analytics' },
        { status: 500 }
      )
    }

    // Upsert daily snapshot
    const dailyColumn = eventType === 'profile_view'
      ? 'profile_views'
      : 'whatsapp_clicks'

    // Check if record exists for today
    const { data: existing } = await supabase
      .from('business_analytics_daily')
      .select('id, profile_views, whatsapp_clicks')
      .eq('business_id', businessId)
      .eq('date', today)
      .single()

    if (existing) {
      // Update existing record
      const { error: dailyError } = await supabase
        .from('business_analytics_daily')
        .update({
          [dailyColumn]: existing[dailyColumn] + 1
        })
        .eq('id', existing.id)

      if (dailyError) {
        console.error('Error updating daily analytics:', dailyError)
      }
    } else {
      // Insert new record
      const { error: dailyError } = await supabase
        .from('business_analytics_daily')
        .insert({
          business_id: businessId,
          date: today,
          [dailyColumn]: 1
        })

      if (dailyError) {
        console.error('Error inserting daily analytics:', dailyError)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Analytics tracking error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

**Step 2: Test analytics tracking manually**

Run dev server: `npm run dev`

Test with curl:
```bash
curl -X POST http://localhost:3000/api/analytics/track \
  -H "Content-Type: application/json" \
  -d '{"businessId":"<valid-business-id>","eventType":"profile_view"}'
```

Expected: `{"success":true}`

**Step 3: Commit analytics tracking route**

```bash
git add app/api/analytics/track/route.ts
git commit -m "feat(api): add analytics tracking endpoint for views and clicks"
```

---

### Task 5: Create Business Analytics API Route

**Files:**
- Create: `app/api/businesses/[id]/analytics/route.ts`

**Step 1: Write business analytics endpoint**

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { AnalyticsSummary } from '@/lib/types/database'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { id: businessId } = await params

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify user owns business or is admin
    const { data: business } = await supabase
      .from('businesses')
      .select('id, owner_id, community_id, total_profile_views, total_whatsapp_clicks, last_analytics_update')
      .eq('id', businessId)
      .single()

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role, is_super_admin, community_id')
      .eq('id', user.id)
      .single()

    const isOwner = business.owner_id === user.id
    const isAdmin = profile?.role === 'admin' && profile.community_id === business.community_id
    const isSuperAdmin = profile?.is_super_admin === true

    if (!isOwner && !isAdmin && !isSuperAdmin) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Get last 7 days of daily analytics
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: daily } = await supabase
      .from('business_analytics_daily')
      .select('date, profile_views, whatsapp_clicks')
      .eq('business_id', businessId)
      .gte('date', sevenDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: true })

    // Format for chart
    const labels: string[] = []
    const views: number[] = []
    const clicks: number[] = []

    // Fill in missing days with zeros
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateString = date.toISOString().split('T')[0]

      const dayData = daily?.find(d => d.date === dateString)

      labels.push(new Date(dateString).toLocaleDateString('es-CO', {
        month: 'short',
        day: 'numeric'
      }))
      views.push(dayData?.profile_views || 0)
      clicks.push(dayData?.whatsapp_clicks || 0)
    }

    const response: AnalyticsSummary = {
      totals: {
        profileViews: business.total_profile_views || 0,
        whatsappClicks: business.total_whatsapp_clicks || 0,
        lastUpdated: business.last_analytics_update
      },
      daily: daily || [],
      chartData: {
        labels,
        views,
        clicks
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Business analytics error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

**Step 2: Test business analytics endpoint**

Run dev server and test:
```bash
curl http://localhost:3000/api/businesses/<business-id>/analytics \
  -H "Cookie: <auth-cookie>"
```

Expected: JSON with totals, daily data, and chartData

**Step 3: Commit business analytics route**

```bash
git add app/api/businesses/[id]/analytics/route.ts
git commit -m "feat(api): add business analytics endpoint with 7-day chart data"
```

---

### Task 6: Create Analytics Tracker Client Component

**Files:**
- Create: `components/analytics/analytics-tracker.tsx`

**Step 1: Write analytics tracker component**

```typescript
'use client'

import { useEffect } from 'react'

interface AnalyticsTrackerProps {
  businessId: string
  eventType?: 'profile_view' | 'whatsapp_click'
}

export function AnalyticsTracker({ businessId, eventType = 'profile_view' }: AnalyticsTrackerProps) {
  useEffect(() => {
    if (eventType === 'profile_view') {
      // Check sessionStorage to prevent duplicate tracking
      const storageKey = `viewed_${businessId}`
      const alreadyTracked = sessionStorage.getItem(storageKey)

      if (!alreadyTracked) {
        // Track the view
        fetch('/api/analytics/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessId, eventType: 'profile_view' })
        }).then(() => {
          // Mark as tracked for this session
          sessionStorage.setItem(storageKey, 'true')
        }).catch((error) => {
          console.error('Failed to track analytics:', error)
        })
      }
    }
  }, [businessId, eventType])

  return null // This component renders nothing
}

// Helper function for WhatsApp click tracking
export async function trackWhatsAppClick(businessId: string): Promise<void> {
  try {
    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId, eventType: 'whatsapp_click' })
    })
  } catch (error) {
    console.error('Failed to track WhatsApp click:', error)
  }
}
```

**Step 2: Commit analytics tracker**

```bash
git add components/analytics/analytics-tracker.tsx
git commit -m "feat(components): add analytics tracker for profile views"
```

---

## PHASE 3: SUBSCRIPTION API

### Task 7: Create Subscription Request API Route

**Files:**
- Create: `app/api/subscriptions/request/route.ts`

**Step 1: Write subscription request endpoint**

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { businessId } = body as { businessId: string }

    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID required' },
        { status: 400 }
      )
    }

    // Verify user owns business
    const { data: business } = await supabase
      .from('businesses')
      .select('id, owner_id, name')
      .eq('id', businessId)
      .single()

    if (!business || business.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Check for existing subscription
    const { data: existing } = await supabase
      .from('business_subscriptions')
      .select('id, status')
      .eq('business_id', businessId)
      .in('status', ['requested', 'active'])
      .single()

    if (existing) {
      if (existing.status === 'active') {
        return NextResponse.json(
          { error: 'Ya tienes una suscripción activa' },
          { status: 400 }
        )
      }
      if (existing.status === 'requested') {
        return NextResponse.json(
          { error: 'Ya tienes una solicitud pendiente' },
          { status: 400 }
        )
      }
    }

    // Create new subscription request
    const { data: subscription, error: insertError } = await supabase
      .from('business_subscriptions')
      .insert({
        business_id: businessId,
        status: 'requested',
        requested_at: new Date().toISOString()
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating subscription:', insertError)
      return NextResponse.json(
        { error: 'Failed to create subscription request' },
        { status: 500 }
      )
    }

    return NextResponse.json({ subscription }, { status: 201 })
  } catch (error) {
    console.error('Subscription request error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

**Step 2: Test subscription request**

```bash
curl -X POST http://localhost:3000/api/subscriptions/request \
  -H "Content-Type: application/json" \
  -H "Cookie: <auth-cookie>" \
  -d '{"businessId":"<your-business-id>"}'
```

Expected: `{"subscription":{...}}`

**Step 3: Commit subscription request route**

```bash
git add app/api/subscriptions/request/route.ts
git commit -m "feat(api): add subscription request endpoint for premium"
```

---

### Task 8: Create Get Subscription Status API Route

**Files:**
- Create: `app/api/businesses/[id]/subscription/route.ts`

**Step 1: Write get subscription endpoint**

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { id: businessId } = await params

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify user owns business or is admin
    const { data: business } = await supabase
      .from('businesses')
      .select('id, owner_id, community_id, is_featured')
      .eq('id', businessId)
      .single()

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role, is_super_admin, community_id')
      .eq('id', user.id)
      .single()

    const isOwner = business.owner_id === user.id
    const isAdmin = profile?.role === 'admin' && profile.community_id === business.community_id
    const isSuperAdmin = profile?.is_super_admin === true

    if (!isOwner && !isAdmin && !isSuperAdmin) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Get most recent subscription
    const { data: subscription } = await supabase
      .from('business_subscriptions')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    return NextResponse.json({
      subscription: subscription || null,
      isPremium: business.is_featured || false
    })
  } catch (error) {
    console.error('Get subscription error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

**Step 2: Commit get subscription route**

```bash
git add app/api/businesses/[id]/subscription/route.ts
git commit -m "feat(api): add get subscription status endpoint"
```

---

### Task 9: Create Cancel Subscription API Route

**Files:**
- Create: `app/api/subscriptions/cancel/route.ts`

**Step 1: Write cancel subscription endpoint**

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { subscriptionId, reason } = body as {
      subscriptionId: string
      reason?: string
    }

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'Subscription ID required' },
        { status: 400 }
      )
    }

    // Get subscription and verify ownership
    const { data: subscription } = await supabase
      .from('business_subscriptions')
      .select('id, business_id, status, businesses(owner_id)')
      .eq('id', subscriptionId)
      .single()

    if (!subscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      )
    }

    const business = subscription.businesses as unknown as { owner_id: string }
    if (business.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    if (subscription.status !== 'active') {
      return NextResponse.json(
        { error: 'Only active subscriptions can be cancelled' },
        { status: 400 }
      )
    }

    // Cancel subscription
    const { error: updateError } = await supabase
      .from('business_subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason || 'Usuario canceló',
        updated_at: new Date().toISOString()
      })
      .eq('id', subscriptionId)

    if (updateError) {
      console.error('Error cancelling subscription:', updateError)
      return NextResponse.json(
        { error: 'Failed to cancel subscription' },
        { status: 500 }
      )
    }

    // Remove premium status from business
    const { error: businessError } = await supabase
      .from('businesses')
      .update({ is_featured: false })
      .eq('id', subscription.business_id)

    if (businessError) {
      console.error('Error removing premium status:', businessError)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Cancel subscription error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

**Step 2: Commit cancel subscription route**

```bash
git add app/api/subscriptions/cancel/route.ts
git commit -m "feat(api): add cancel subscription endpoint"
```

---

### Task 10: Create Admin Activate Subscription API Route

**Files:**
- Create: `app/api/admin/subscriptions/[id]/activate/route.ts`

**Step 1: Write activate subscription endpoint**

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { id: subscriptionId } = await params

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_super_admin, community_id')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'admin' && !profile.is_super_admin)) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      activatedAt,
      expiresAt,
      paymentAmount,
      paymentMethod,
      paymentProofUrl,
      notes
    } = body as {
      activatedAt: string
      expiresAt: string
      paymentAmount: number
      paymentMethod: string
      paymentProofUrl?: string
      notes?: string
    }

    // Validate required fields
    if (!activatedAt || !expiresAt || !paymentAmount || !paymentMethod) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get subscription and verify community access
    const { data: subscription } = await supabase
      .from('business_subscriptions')
      .select('id, business_id, status, businesses(community_id)')
      .eq('id', subscriptionId)
      .single()

    if (!subscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      )
    }

    const business = subscription.businesses as unknown as { community_id: string }
    if (!profile.is_super_admin && profile.community_id !== business.community_id) {
      return NextResponse.json(
        { error: 'Forbidden - Wrong community' },
        { status: 403 }
      )
    }

    // Update subscription to active
    const { error: subError } = await supabase
      .from('business_subscriptions')
      .update({
        status: 'active',
        activated_at: activatedAt,
        expires_at: expiresAt,
        notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscriptionId)

    if (subError) {
      console.error('Error activating subscription:', subError)
      return NextResponse.json(
        { error: 'Failed to activate subscription' },
        { status: 500 }
      )
    }

    // Create payment record
    const periodStart = new Date(activatedAt).toISOString().split('T')[0]
    const periodEnd = new Date(expiresAt).toISOString().split('T')[0]

    const { error: paymentError } = await supabase
      .from('subscription_payments')
      .insert({
        subscription_id: subscriptionId,
        amount: paymentAmount,
        payment_method: paymentMethod,
        payment_proof_url: paymentProofUrl,
        recorded_by: user.id,
        period_start: periodStart,
        period_end: periodEnd,
        notes
      })

    if (paymentError) {
      console.error('Error creating payment record:', paymentError)
    }

    // Set business as featured
    const { error: businessError } = await supabase
      .from('businesses')
      .update({ is_featured: true })
      .eq('id', subscription.business_id)

    if (businessError) {
      console.error('Error setting business as featured:', businessError)
    }

    // Get updated subscription
    const { data: updated } = await supabase
      .from('business_subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .single()

    return NextResponse.json({ subscription: updated })
  } catch (error) {
    console.error('Activate subscription error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

**Step 2: Commit activate subscription route**

```bash
git add app/api/admin/subscriptions/[id]/activate/route.ts
git commit -m "feat(api): add admin activate subscription endpoint"
```

---

### Task 11: Create Admin Record Payment API Route

**Files:**
- Create: `app/api/admin/subscriptions/[id]/payment/route.ts`

**Step 1: Write record payment endpoint**

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { id: subscriptionId } = await params

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_super_admin, community_id')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'admin' && !profile.is_super_admin)) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      amount,
      paymentMethod,
      paymentProofUrl,
      periodStart,
      periodEnd,
      notes
    } = body as {
      amount: number
      paymentMethod: string
      paymentProofUrl?: string
      periodStart: string
      periodEnd: string
      notes?: string
    }

    if (!amount || !paymentMethod || !periodStart || !periodEnd) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('subscription_payments')
      .insert({
        subscription_id: subscriptionId,
        amount,
        payment_method: paymentMethod,
        payment_proof_url: paymentProofUrl,
        recorded_by: user.id,
        period_start: periodStart,
        period_end: periodEnd,
        notes
      })
      .select()
      .single()

    if (paymentError) {
      console.error('Error creating payment:', paymentError)
      return NextResponse.json(
        { error: 'Failed to create payment record' },
        { status: 500 }
      )
    }

    // Extend subscription expiration
    const { error: subError } = await supabase
      .from('business_subscriptions')
      .update({
        expires_at: periodEnd,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscriptionId)

    if (subError) {
      console.error('Error extending subscription:', subError)
    }

    return NextResponse.json({ payment }, { status: 201 })
  } catch (error) {
    console.error('Record payment error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

**Step 2: Commit record payment route**

```bash
git add app/api/admin/subscriptions/[id]/payment/route.ts
git commit -m "feat(api): add admin record payment endpoint for subscription renewals"
```

---

## PHASE 4: BANNER ADS API

### Task 12: Create Supabase Storage Bucket for Banners

**Files:**
- Run manual Supabase command

**Step 1: Create storage bucket**

Via Supabase Dashboard or SQL:
```sql
-- Create storage bucket for banner images
INSERT INTO storage.buckets (id, name, public)
VALUES ('banners', 'banners', true);

-- Add storage policy for authenticated uploads
CREATE POLICY "Authenticated users can upload banners"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'banners');

-- Public can view banners
CREATE POLICY "Public can view banners"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'banners');

-- Only admins can delete
CREATE POLICY "Admins can delete banners"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'banners'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND (role = 'admin' OR is_super_admin = true)
  )
);
```

**Step 2: Verify bucket created**

Check Supabase dashboard → Storage → Buckets → Should see "banners"

**Step 3: Commit documentation**

Create file: `docs/storage-setup.md`:
```markdown
# Storage Setup

## Banners Bucket

Created bucket `banners` for banner ad images.

**Policies:**
- Authenticated users can upload
- Public can view
- Only admins can delete

**Usage:**
Upload path: `banners/{businessId}/{timestamp}.{ext}`
Public URL: `{supabase_url}/storage/v1/object/public/banners/{path}`
```

```bash
git add docs/storage-setup.md
git commit -m "docs: add storage setup for banner images"
```

---

### Task 13: Create Banner Request API Route

**Files:**
- Create: `app/api/banners/request/route.ts`

**Step 1: Write banner request endpoint with file upload**

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const businessId = formData.get('businessId') as string
    const title = formData.get('title') as string
    const imageFile = formData.get('imageFile') as File
    const placement = formData.get('placement') as 'homepage' | 'directory'
    const linkUrl = formData.get('linkUrl') as string | null

    // Validate required fields
    if (!businessId || !title || !imageFile || !placement) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify user owns business
    const { data: business } = await supabase
      .from('businesses')
      .select('id, owner_id, community_id')
      .eq('id', businessId)
      .single()

    if (!business || business.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Validate image file
    if (!imageFile.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      )
    }

    if (imageFile.size > 5 * 1024 * 1024) { // 5MB max
      return NextResponse.json(
        { error: 'Image must be less than 5MB' },
        { status: 400 }
      )
    }

    // Upload image to Supabase Storage
    const fileExt = imageFile.name.split('.').pop()
    const fileName = `${businessId}/${Date.now()}.${fileExt}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('banners')
      .upload(fileName, imageFile, {
        contentType: imageFile.type,
        upsert: false
      })

    if (uploadError) {
      console.error('Error uploading banner image:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload image' },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('banners')
      .getPublicUrl(uploadData.path)

    // Create banner record
    const { data: banner, error: insertError } = await supabase
      .from('banner_ads')
      .insert({
        business_id: businessId,
        community_id: business.community_id,
        title,
        image_url: publicUrl,
        link_url: linkUrl,
        placement,
        status: 'requested'
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating banner:', insertError)
      return NextResponse.json(
        { error: 'Failed to create banner request' },
        { status: 500 }
      )
    }

    return NextResponse.json({ banner }, { status: 201 })
  } catch (error) {
    console.error('Banner request error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

**Step 2: Commit banner request route**

```bash
git add app/api/banners/request/route.ts
git commit -m "feat(api): add banner request endpoint with image upload"
```

---

### Task 14: Create Get Active Banners API Route

**Files:**
- Create: `app/api/banners/active/route.ts`

**Step 1: Write get active banners endpoint**

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const communityId = searchParams.get('communityId')
    const placement = searchParams.get('placement') as 'homepage' | 'directory' | null

    if (!communityId || !placement) {
      return NextResponse.json(
        { error: 'Community ID and placement required' },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()

    // Get active banners
    const { data: banners, error } = await supabase
      .from('banner_ads')
      .select('id, title, image_url, link_url, placement')
      .eq('community_id', communityId)
      .eq('placement', placement)
      .eq('status', 'active')
      .lte('starts_at', now)
      .gte('ends_at', now)

    if (error) {
      console.error('Error fetching active banners:', error)
      return NextResponse.json(
        { error: 'Failed to fetch banners' },
        { status: 500 }
      )
    }

    return NextResponse.json({ banners: banners || [] })
  } catch (error) {
    console.error('Get active banners error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

**Step 2: Commit active banners route**

```bash
git add app/api/banners/active/route.ts
git commit -m "feat(api): add get active banners endpoint for rotation"
```

---

### Task 15: Create Admin Approve Banner API Route

**Files:**
- Create: `app/api/admin/banners/[id]/approve/route.ts`

**Step 1: Write approve banner endpoint**

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { id: bannerId } = await params

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_super_admin, community_id')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'admin' && !profile.is_super_admin)) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      startsAt,
      endsAt,
      paymentAmount,
      paymentMethod,
      paymentProofUrl,
      notes
    } = body as {
      startsAt: string
      endsAt: string
      paymentAmount: number
      paymentMethod: string
      paymentProofUrl?: string
      notes?: string
    }

    if (!startsAt || !endsAt || !paymentAmount || !paymentMethod) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get banner and verify community access
    const { data: banner } = await supabase
      .from('banner_ads')
      .select('id, business_id, community_id')
      .eq('id', bannerId)
      .single()

    if (!banner) {
      return NextResponse.json(
        { error: 'Banner not found' },
        { status: 404 }
      )
    }

    if (!profile.is_super_admin && profile.community_id !== banner.community_id) {
      return NextResponse.json(
        { error: 'Forbidden - Wrong community' },
        { status: 403 }
      )
    }

    // Approve banner
    const { error: updateError } = await supabase
      .from('banner_ads')
      .update({
        status: 'active',
        starts_at: startsAt,
        ends_at: endsAt,
        approved_at: new Date().toISOString(),
        approved_by: user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', bannerId)

    if (updateError) {
      console.error('Error approving banner:', updateError)
      return NextResponse.json(
        { error: 'Failed to approve banner' },
        { status: 500 }
      )
    }

    // Create payment record
    const { error: paymentError } = await supabase
      .from('banner_payments')
      .insert({
        banner_id: bannerId,
        amount: paymentAmount,
        payment_method: paymentMethod,
        payment_proof_url: paymentProofUrl,
        recorded_by: user.id,
        notes
      })

    if (paymentError) {
      console.error('Error creating banner payment:', paymentError)
    }

    // Get updated banner
    const { data: updated } = await supabase
      .from('banner_ads')
      .select('*')
      .eq('id', bannerId)
      .single()

    return NextResponse.json({ banner: updated })
  } catch (error) {
    console.error('Approve banner error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

**Step 2: Commit approve banner route**

```bash
git add app/api/admin/banners/[id]/approve/route.ts
git commit -m "feat(api): add admin approve banner endpoint with payment recording"
```

---

### Task 16: Create Update Banner Status API Route

**Files:**
- Create: `app/api/admin/banners/[id]/route.ts`

**Step 1: Write update banner status endpoint**

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { id: bannerId } = await params

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_super_admin, community_id')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'admin' && !profile.is_super_admin)) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { status } = body as { status: 'active' | 'paused' | 'expired' }

    if (!status || !['active', 'paused', 'expired'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      )
    }

    // Get banner and verify community access
    const { data: banner } = await supabase
      .from('banner_ads')
      .select('id, community_id')
      .eq('id', bannerId)
      .single()

    if (!banner) {
      return NextResponse.json(
        { error: 'Banner not found' },
        { status: 404 }
      )
    }

    if (!profile.is_super_admin && profile.community_id !== banner.community_id) {
      return NextResponse.json(
        { error: 'Forbidden - Wrong community' },
        { status: 403 }
      )
    }

    // Update banner status
    const { data: updated, error: updateError } = await supabase
      .from('banner_ads')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', bannerId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating banner:', updateError)
      return NextResponse.json(
        { error: 'Failed to update banner' },
        { status: 500 }
      )
    }

    return NextResponse.json({ banner: updated })
  } catch (error) {
    console.error('Update banner error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

**Step 2: Commit update banner route**

```bash
git add app/api/admin/banners/[id]/route.ts
git commit -m "feat(api): add admin update banner status endpoint (pause/resume/expire)"
```

---

## PHASE 5: REVIEW FLAGGING API

### Task 17: Create Flag Review API Route

**Files:**
- Create: `app/api/reviews/[reviewId]/flag/route.ts`

**Step 1: Write flag review endpoint**

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { reviewId } = await params

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { reason, description } = body as {
      reason: 'spam' | 'offensive' | 'fake' | 'irrelevant' | 'other'
      description?: string
    }

    if (!reason) {
      return NextResponse.json(
        { error: 'Reason required' },
        { status: 400 }
      )
    }

    // Validate reason
    const validReasons = ['spam', 'offensive', 'fake', 'irrelevant', 'other']
    if (!validReasons.includes(reason)) {
      return NextResponse.json(
        { error: 'Invalid reason' },
        { status: 400 }
      )
    }

    // Get review and verify user owns the business
    const { data: review } = await supabase
      .from('business_reviews')
      .select('id, business_id, businesses(owner_id)')
      .eq('id', reviewId)
      .single()

    if (!review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      )
    }

    const business = review.businesses as unknown as { owner_id: string }
    if (business.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden - You can only flag reviews on your own business' },
        { status: 403 }
      )
    }

    // Check for existing flag by this user
    const { data: existing } = await supabase
      .from('review_flags')
      .select('id')
      .eq('review_id', reviewId)
      .eq('flagged_by', user.id)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Ya reportaste esta reseña' },
        { status: 400 }
      )
    }

    // Create flag
    const { data: flag, error: insertError } = await supabase
      .from('review_flags')
      .insert({
        review_id: reviewId,
        flagged_by: user.id,
        reason,
        description,
        status: 'pending'
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating flag:', insertError)
      return NextResponse.json(
        { error: 'Failed to flag review' },
        { status: 500 }
      )
    }

    return NextResponse.json({ flag }, { status: 201 })
  } catch (error) {
    console.error('Flag review error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

**Step 2: Commit flag review route**

```bash
git add app/api/reviews/[reviewId]/flag/route.ts
git commit -m "feat(api): add flag review endpoint for business owners"
```

---

### Task 18: Create Get Review Flags API Route (Admin)

**Files:**
- Create: `app/api/admin/review-flags/route.ts`

**Step 1: Write get review flags endpoint**

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_super_admin, community_id')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'moderator' && !profile.is_super_admin)) {
      return NextResponse.json(
        { error: 'Forbidden - Admin/Moderator access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as 'pending' | 'reviewed' | 'dismissed' | null
    const communityId = searchParams.get('communityId')

    if (!communityId && !profile.is_super_admin) {
      return NextResponse.json(
        { error: 'Community ID required' },
        { status: 400 }
      )
    }

    // Build query
    let query = supabase
      .from('review_flags')
      .select(`
        *,
        business_reviews (
          id,
          rating,
          review_text,
          created_at,
          profiles!business_reviews_user_id_fkey (
            id,
            full_name,
            avatar_url
          ),
          businesses (
            id,
            name,
            slug,
            community_id
          )
        ),
        profiles!review_flags_flagged_by_fkey (
          id,
          full_name
        )
      `)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data: flags, error } = await query

    if (error) {
      console.error('Error fetching flags:', error)
      return NextResponse.json(
        { error: 'Failed to fetch flags' },
        { status: 500 }
      )
    }

    // Filter by community if not super admin
    let filteredFlags = flags || []
    if (!profile.is_super_admin && communityId) {
      filteredFlags = filteredFlags.filter(flag => {
        const review = flag.business_reviews as any
        const business = review?.businesses
        return business?.community_id === communityId
      })
    }

    return NextResponse.json({ flags: filteredFlags })
  } catch (error) {
    console.error('Get review flags error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

**Step 2: Commit get flags route**

```bash
git add app/api/admin/review-flags/route.ts
git commit -m "feat(api): add admin get review flags endpoint with filters"
```

---

### Task 19: Create Resolve Review Flag API Route (Admin)

**Files:**
- Create: `app/api/admin/review-flags/[id]/resolve/route.ts`

**Step 1: Write resolve flag endpoint**

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { id: flagId } = await params

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_super_admin, community_id')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'moderator' && !profile.is_super_admin)) {
      return NextResponse.json(
        { error: 'Forbidden - Admin/Moderator access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { status, resolutionNotes, deleteReview } = body as {
      status: 'reviewed' | 'dismissed'
      resolutionNotes?: string
      deleteReview?: boolean
    }

    if (!status || !['reviewed', 'dismissed'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      )
    }

    // Get flag
    const { data: flag } = await supabase
      .from('review_flags')
      .select('id, review_id')
      .eq('id', flagId)
      .single()

    if (!flag) {
      return NextResponse.json(
        { error: 'Flag not found' },
        { status: 404 }
      )
    }

    // Update flag
    const { error: updateError } = await supabase
      .from('review_flags')
      .update({
        status,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        resolution_notes: resolutionNotes
      })
      .eq('id', flagId)

    if (updateError) {
      console.error('Error resolving flag:', updateError)
      return NextResponse.json(
        { error: 'Failed to resolve flag' },
        { status: 500 }
      )
    }

    // Delete review if requested
    if (deleteReview) {
      const { error: deleteError } = await supabase
        .from('business_reviews')
        .delete()
        .eq('id', flag.review_id)

      if (deleteError) {
        console.error('Error deleting review:', deleteError)
        return NextResponse.json(
          { error: 'Failed to delete review' },
          { status: 500 }
        )
      }
    }

    // Get updated flag
    const { data: updated } = await supabase
      .from('review_flags')
      .select('*')
      .eq('id', flagId)
      .single()

    return NextResponse.json({ flag: updated })
  } catch (error) {
    console.error('Resolve flag error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

**Step 2: Commit resolve flag route**

```bash
git add app/api/admin/review-flags/[id]/resolve/route.ts
git commit -m "feat(api): add admin resolve review flag endpoint with optional review deletion"
```

---

## PHASE 6: MERCHANT DASHBOARD UI

**Note:** For brevity, UI component tasks will focus on key files. Full implementation details available in design document.

### Task 20: Install Recharts for Analytics Charts

**Files:**
- Modify: `package.json`

**Step 1: Install Recharts**

Run: `npm install recharts`
Expected: Package installed successfully

**Step 2: Commit dependency**

```bash
git add package.json package-lock.json
git commit -m "chore: add recharts for analytics charts"
```

---

### Task 21: Create Analytics Chart Component

**Files:**
- Create: `components/analytics/analytics-chart.tsx`

**Step 1: Write analytics chart component**

Create complete Recharts implementation with brutalist styling. (See design doc for full code)

**Step 2: Test chart renders**

Create test page or integrate into dashboard to verify chart displays correctly.

**Step 3: Commit chart component**

```bash
git add components/analytics/analytics-chart.tsx
git commit -m "feat(ui): add analytics chart component with Recharts"
```

---

### Task 22: Create Business Analytics Widget

**Files:**
- Create: `components/business/business-analytics.tsx`

**Step 1: Write business analytics widget**

Fetch data from API, display stats cards and chart. (Full implementation in design doc)

**Step 2: Commit analytics widget**

```bash
git add components/business/business-analytics.tsx
git commit -m "feat(ui): add business analytics widget for merchant dashboard"
```

---

### Task 23: Create Premium Status Widget

**Files:**
- Create: `components/subscription/premium-status-widget.tsx`

**Step 1: Write premium status widget**

Show subscription status with appropriate CTAs for each state. (Full implementation in design doc)

**Step 2: Commit premium widget**

```bash
git add components/subscription/premium-status-widget.tsx
git commit -m "feat(ui): add premium status widget showing subscription state"
```

---

### Task 24: Create Premium Benefits Modal

**Files:**
- Create: `components/subscription/premium-benefits-modal.tsx`

**Step 1: Write premium benefits modal**

List premium features with request button. (Full implementation in design doc)

**Step 2: Commit benefits modal**

```bash
git add components/subscription/premium-benefits-modal.tsx
git commit -m "feat(ui): add premium benefits modal with feature list"
```

---

### Task 25: Create Banner Ad Upload Component

**Files:**
- Create: `components/banners/banner-ad-upload.tsx`

**Step 1: Write banner upload form**

File upload with preview, validation, placement selection. (Full implementation in design doc)

**Step 2: Commit banner upload**

```bash
git add components/banners/banner-ad-upload.tsx
git commit -m "feat(ui): add banner ad upload form with image preview"
```

---

### Task 26: Create Flag Review Button

**Files:**
- Create: `components/reviews/flag-review-button.tsx`

**Step 1: Write flag button with modal**

Small button opens modal with reason selection. (Full implementation in design doc)

**Step 2: Commit flag button**

```bash
git add components/reviews/flag-review-button.tsx
git commit -m "feat(ui): add flag review button for business owners"
```

---

### Task 27: Integrate Analytics into Merchant Dashboard

**Files:**
- Modify: `app/dashboard/page.tsx` (BusinessTabContent function)

**Step 1: Add analytics widget**

Import and render `<BusinessAnalytics>` component in BusinessTabContent after business list.

**Step 2: Test in browser**

Navigate to /dashboard, verify analytics widget displays.

**Step 3: Commit dashboard integration**

```bash
git add app/dashboard/page.tsx
git commit -m "feat(dashboard): integrate analytics widget into business tab"
```

---

### Task 28: Integrate Premium Widget into Dashboard

**Files:**
- Modify: `app/dashboard/page.tsx`

**Step 1: Add premium status widget**

Import and render `<PremiumStatusWidget>` after analytics widget.

**Step 2: Commit premium integration**

```bash
git add app/dashboard/page.tsx
git commit -m "feat(dashboard): integrate premium status widget"
```

---

### Task 29: Integrate Banner Ads into Dashboard

**Files:**
- Modify: `app/dashboard/page.tsx`

**Step 1: Add banner ads section**

Import and render `<BannerAdsManager>` (create this component combining upload + list).

**Step 2: Commit banner integration**

```bash
git add app/dashboard/page.tsx components/banners/banner-ads-manager.tsx
git commit -m "feat(dashboard): integrate banner ads manager"
```

---

### Task 30: Add Analytics Tracker to Business Profile Page

**Files:**
- Modify: `app/[community]/business/[slug]/page.tsx`

**Step 1: Import analytics tracker**

Add `<AnalyticsTracker businessId={business.id} />` to page component.

**Step 2: Update WhatsApp button**

Modify WhatsApp button to call `trackWhatsAppClick()` before opening link.

**Step 3: Commit tracking integration**

```bash
git add app/[community]/business/[slug]/page.tsx components/shared/whatsapp-button.tsx
git commit -m "feat(tracking): add analytics tracking to business profile page"
```

---

## PHASE 7: ADMIN PANEL UI

### Task 31: Create Admin Subscriptions Table

**Files:**
- Create: `app/admin/subscriptions/page.tsx`
- Create: `components/admin/subscriptions-table.tsx`

**Step 1: Write subscriptions table**

Display all subscriptions with filters, stats, and actions. (Full implementation in design doc)

**Step 2: Commit subscriptions page**

```bash
git add app/admin/subscriptions/page.tsx components/admin/subscriptions-table.tsx
git commit -m "feat(admin): add subscriptions management page with table"
```

---

### Task 32: Create Subscription Detail Page

**Files:**
- Create: `app/admin/subscriptions/[id]/page.tsx`

**Step 1: Write subscription detail**

Show full subscription info, payment history, action forms. (Full implementation in design doc)

**Step 2: Commit detail page**

```bash
git add app/admin/subscriptions/[id]/page.tsx
git commit -m "feat(admin): add subscription detail page with payment history"
```

---

### Task 33: Create Activate Subscription Form

**Files:**
- Create: `components/admin/activate-subscription-form.tsx`

**Step 1: Write activation form**

Form with dates, payment fields, submission logic. (Full implementation in design doc)

**Step 2: Commit activation form**

```bash
git add components/admin/activate-subscription-form.tsx
git commit -m "feat(admin): add activate subscription form component"
```

---

### Task 34: Create Record Payment Form

**Files:**
- Create: `components/admin/record-payment-form.tsx`

**Step 1: Write payment form**

Form for recording renewal payments. (Full implementation in design doc)

**Step 2: Commit payment form**

```bash
git add components/admin/record-payment-form.tsx
git commit -m "feat(admin): add record payment form for renewals"
```

---

### Task 35: Create Admin Banners Table

**Files:**
- Create: `app/admin/banners/page.tsx`
- Create: `components/admin/banners-table.tsx`

**Step 1: Write banners table**

Display banners with image previews, filters, actions. (Full implementation in design doc)

**Step 2: Commit banners page**

```bash
git add app/admin/banners/page.tsx components/admin/banners-table.tsx
git commit -m "feat(admin): add banners management page with image previews"
```

---

### Task 36: Create Banner Detail Page

**Files:**
- Create: `app/admin/banners/[id]/page.tsx`

**Step 1: Write banner detail**

Full-size preview, info, approval form, payment history. (Full implementation in design doc)

**Step 2: Commit banner detail**

```bash
git add app/admin/banners/[id]/page.tsx
git commit -m "feat(admin): add banner detail page with full preview"
```

---

### Task 37: Create Approve Banner Form

**Files:**
- Create: `components/admin/approve-banner-form.tsx`

**Step 1: Write approval form**

Form with dates, payment fields for banner approval. (Full implementation in design doc)

**Step 2: Commit approval form**

```bash
git add components/admin/approve-banner-form.tsx
git commit -m "feat(admin): add approve banner form component"
```

---

### Task 38: Create Payments Dashboard

**Files:**
- Create: `app/admin/payments/page.tsx`

**Step 1: Write payments dashboard**

Combined view of all payments (subscriptions + banners), stats, export. (Full implementation in design doc)

**Step 2: Commit payments dashboard**

```bash
git add app/admin/payments/page.tsx
git commit -m "feat(admin): add payments dashboard with revenue stats"
```

---

### Task 39: Create Review Flags Table

**Files:**
- Create: `app/admin/review-flags/page.tsx`
- Create: `components/admin/flagged-reviews-table.tsx`

**Step 1: Write review flags table**

Display flagged reviews with filters, status badges. (Full implementation in design doc)

**Step 2: Commit review flags page**

```bash
git add app/admin/review-flags/page.tsx components/admin/flagged-reviews-table.tsx
git commit -m "feat(admin): add review flags management page"
```

---

### Task 40: Create Review Flag Detail Page

**Files:**
- Create: `app/admin/review-flags/[id]/page.tsx`

**Step 1: Write flag detail**

Show flag, full review context, resolution form. (Full implementation in design doc)

**Step 2: Commit flag detail**

```bash
git add app/admin/review-flags/[id]/page.tsx
git commit -m "feat(admin): add review flag detail page with resolution form"
```

---

### Task 41: Update Admin Layout with Monetization Nav

**Files:**
- Modify: `app/admin/layout.tsx`

**Step 1: Add monetization navigation section**

Add "Monetización" section to sidebar with links to Suscripciones, Banners, Pagos, Reseñas Reportadas.

**Step 2: Commit nav update**

```bash
git add app/admin/layout.tsx
git commit -m "feat(admin): add monetization navigation section to sidebar"
```

---

### Task 42: Update Admin Statistics with Revenue

**Files:**
- Modify: `app/admin/statistics/page.tsx`

**Step 1: Add revenue stats cards**

Fetch and display active subscriptions count, active banners count, monthly revenue.

**Step 2: Commit stats update**

```bash
git add app/admin/statistics/page.tsx
git commit -m "feat(admin): add monetization stats to dashboard"
```

---

## PHASE 8: FRONTEND INTEGRATION

### Task 43: Add Premium Badges to Directory

**Files:**
- Modify: `components/directory/business-card.tsx`

**Step 1: Add premium badge**

Conditionally render premium badge if `business.is_featured === true`.

**Step 2: Sort premium businesses first**

Modify directory sorting to show premium businesses before regular ones.

**Step 3: Commit premium badges**

```bash
git add components/directory/business-card.tsx app/[community]/directory/page.tsx
git commit -m "feat(directory): add premium badges and priority sorting"
```

---

### Task 44: Create Banner Rotator Component

**Files:**
- Create: `components/banners/banner-rotator.tsx`

**Step 1: Write banner rotator**

Client component that fetches active banners, randomly selects one, displays with link. (Full implementation in design doc)

**Step 2: Commit banner rotator**

```bash
git add components/banners/banner-rotator.tsx
git commit -m "feat(ui): add banner rotator with random selection"
```

---

### Task 45: Integrate Banners on Homepage

**Files:**
- Modify: `app/[community]/page.tsx`

**Step 1: Add banner after hero section**

Import and render `<BannerRotator placement="homepage" communityId={community.id} />`.

**Step 2: Test banner displays**

Verify banner appears between hero and quick nav sections.

**Step 3: Commit homepage integration**

```bash
git add app/[community]/page.tsx
git commit -m "feat(homepage): integrate banner rotator below hero"
```

---

### Task 46: Integrate Banners on Directory Page

**Files:**
- Modify: `app/[community]/directory/page.tsx`
- Modify: `app/[community]/directory/[category]/page.tsx`

**Step 1: Add banner above business grid**

Add `<BannerRotator placement="directory" communityId={community.id} />`.

**Step 2: Commit directory integration**

```bash
git add app/[community]/directory/page.tsx app/[community]/directory/[category]/page.tsx
git commit -m "feat(directory): integrate banner rotator above business listings"
```

---

### Task 47: Add Premium Badge to Business Profile

**Files:**
- Modify: `app/[community]/business/[slug]/page.tsx`

**Step 1: Add premium badge**

Render premium badge if `business.is_featured === true` near business name.

**Step 2: Commit profile badge**

```bash
git add app/[community]/business/[slug]/page.tsx
git commit -m "feat(profile): add premium badge to business profile page"
```

---

### Task 48: Integrate Flag Button into Reviews

**Files:**
- Modify: `components/reviews/review-list.tsx` or equivalent

**Step 1: Add flag button**

Conditionally render `<FlagReviewButton>` for each review if current user owns the business.

**Step 2: Commit flag integration**

```bash
git add components/reviews/review-list.tsx
git commit -m "feat(reviews): add flag button for business owners"
```

---

## PHASE 9: AUTOMATION & CRON JOBS

### Task 49: Create Daily Expiration Cron Job

**Files:**
- Create: `app/api/cron/daily-expiration/route.ts`

**Step 1: Write cron job route**

Expire subscriptions and banners past their end dates. (Full implementation in design doc)

**Step 2: Test cron route**

```bash
curl -X GET http://localhost:3000/api/cron/daily-expiration \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Expected: JSON with counts of expired items

**Step 3: Commit cron route**

```bash
git add app/api/cron/daily-expiration/route.ts
git commit -m "feat(cron): add daily expiration job for subscriptions and banners"
```

---

### Task 50: Configure Vercel Cron

**Files:**
- Create/Modify: `vercel.json`

**Step 1: Add cron configuration**

```json
{
  "crons": [{
    "path": "/api/cron/daily-expiration",
    "schedule": "0 0 * * *"
  }]
}
```

**Step 2: Add CRON_SECRET to environment**

In Vercel dashboard or `.env.local`, add `CRON_SECRET=<random-secret>`.

**Step 3: Commit cron config**

```bash
git add vercel.json
git commit -m "chore: configure daily cron job for expiration automation"
```

---

### Task 51: Test Cron Job Locally

**Files:**
- Manual testing

**Step 1: Create test data**

Manually insert expired subscription and banner in database.

**Step 2: Run cron route**

Call cron endpoint with secret, verify records updated.

**Step 3: Document testing**

Add note to `docs/testing/cron-jobs.md` about how to test cron jobs.

---

## PHASE 10: TESTING & POLISH

### Task 52: End-to-End Testing - Analytics Flow

**Test Steps:**
1. Visit business profile page
2. Verify sessionStorage prevents duplicate tracking
3. Check database: `total_profile_views` incremented
4. Check `business_analytics_daily` has today's record
5. Visit merchant dashboard, verify analytics widget shows correct data
6. Click WhatsApp button, verify `total_whatsapp_clicks` incremented

**Document:** Create `docs/testing/manual-test-analytics.md`

---

### Task 53: End-to-End Testing - Subscription Flow

**Test Steps:**
1. Business owner requests premium subscription
2. Verify `business_subscriptions` record created with status='requested'
3. Admin navigates to `/admin/subscriptions`, sees request
4. Admin activates with payment details
5. Verify subscription status='active', payment record created, business `is_featured=true`
6. Verify premium badge appears on directory and profile
7. Business owner cancels subscription
8. Verify status='cancelled', `is_featured=false`, badge removed

**Document:** Create `docs/testing/manual-test-subscriptions.md`

---

### Task 54: End-to-End Testing - Banner Flow

**Test Steps:**
1. Business owner uploads banner image
2. Verify image uploaded to Supabase Storage
3. Verify `banner_ads` record created with status='requested'
4. Admin views `/admin/banners`, sees request with preview
5. Admin approves with payment and dates
6. Verify banner appears on homepage (random rotation)
7. Refresh page multiple times, verify rotation works
8. Admin pauses banner, verify it no longer appears
9. Admin resumes, verify it appears again

**Document:** Create `docs/testing/manual-test-banners.md`

---

### Task 55: End-to-End Testing - Review Flagging Flow

**Test Steps:**
1. Business owner views reviews on their profile
2. Click flag button on a review
3. Select reason, submit flag
4. Verify `review_flags` record created with status='pending'
5. Admin views `/admin/review-flags`, sees flagged review
6. Admin views flag detail, reads full context
7. Admin dismisses flag (review stays visible)
8. Verify flag status='dismissed'
9. Create another flag, admin deletes review this time
10. Verify review removed from database and profile

**Document:** Create `docs/testing/manual-test-review-flags.md`

---

### Task 56: Performance Optimization

**Areas to optimize:**
1. Add indexes to frequently queried columns
2. Optimize N+1 queries (use select with joins)
3. Add caching for active banners API
4. Lazy load analytics charts
5. Optimize image sizes in banner uploads

**Step 1: Run performance audit**

Use browser DevTools, Lighthouse, or similar tools.

**Step 2: Apply optimizations**

Create tickets for each optimization, implement incrementally.

**Step 3: Document**

Add performance metrics to `docs/performance.md`.

---

### Task 57: UI/UX Polish

**Polish items:**
1. Ensure all brutalist design patterns consistent
2. Add loading states for all async operations
3. Add error states with helpful messages
4. Add empty states for tables/lists
5. Verify mobile responsiveness for all new components
6. Add success toasts for all mutations
7. Ensure Spanish translations are correct

**Step 1: Create checklist**

List all components needing polish in `docs/polish-checklist.md`.

**Step 2: Systematic review**

Go through each component, apply polish.

**Step 3: Commit polish changes**

```bash
git add .
git commit -m "polish: improve UX with loading states, error handling, and brutalist consistency"
```

---

### Task 58: Documentation for Admins

**Files:**
- Create: `docs/admin-guides/monetization-management.md`

**Content:**
- How to activate subscriptions
- How to record payments
- How to approve banner ads
- How to moderate review flags
- Payment proof upload guidelines
- Monthly billing workflow

**Commit:**

```bash
git add docs/admin-guides/monetization-management.md
git commit -m "docs: add admin guide for monetization management"
```

---

### Task 59: Documentation for Business Owners

**Files:**
- Create: `docs/user-guides/premium-features.md`

**Content:**
- What is premium/featured status
- How to request premium subscription
- How banner ads work
- Pricing information
- How to view analytics
- How to flag inappropriate reviews

**Commit:**

```bash
git add docs/user-guides/premium-features.md
git commit -m "docs: add user guide for premium features"
```

---

### Task 60: Final Testing & Deployment

**Step 1: Run full test suite**

Test all monetization features end-to-end in staging environment.

**Step 2: Verify cron jobs**

Deploy to Vercel, wait for first cron run, verify it works.

**Step 3: Monitor errors**

Check Vercel logs and Supabase logs for any errors.

**Step 4: Deploy to production**

Merge to main branch, deploy to production.

**Step 5: Create release**

Tag release: `git tag v2.0.0-monetization`

**Step 6: Announce launch**

Notify team and prepare user communications about new features.

---

## Implementation Complete!

**Total Tasks:** 60 tasks across 10 phases

**Estimated Time:** 6 weeks for full implementation

**Key Deliverables:**
- ✅ Database schema with 6 new tables + RLS policies
- ✅ 19 API routes (analytics, subscriptions, banners, flags)
- ✅ 20+ UI components (merchant dashboard + admin panel)
- ✅ Frontend integration (banners, badges, tracking)
- ✅ Automated expiration via cron jobs
- ✅ Complete documentation

**Success Metrics:**
- All analytics tracking fires correctly
- Subscription state transitions work flawlessly
- Banner rotation is fair and random
- Cron jobs run daily without failures
- Zero payment disputes or errors
- Admin can process payments in < 5 minutes

**Next Steps:**
Choose execution method (see below).

---

## Execution Options

Plan complete and saved to `docs/plans/2026-03-19-business-owner-monetization.md`.

**Two execution options:**

### 1. Subagent-Driven (this session)
- I dispatch fresh subagent per task
- Review between tasks
- Fast iteration in current session
- **REQUIRED SUB-SKILL:** superpowers:subagent-driven-development

### 2. Parallel Session (separate)
- Open new session with executing-plans skill
- Batch execution with checkpoints
- Dedicated session in worktree
- **REQUIRED SUB-SKILL:** superpowers:executing-plans in new session

**Which approach would you prefer?**
