# Business Owner Monetization Features - Design Document

**Date:** March 19, 2026
**Phase:** Phase 2 - Monetization
**Status:** Design Approved
**Approach:** Incremental Database-First

## Overview

This document outlines the design for Phase 2 Monetization features that enable business owners to access analytics, upgrade to premium profiles, purchase banner ads, and manage reviews. All features are designed for manual payment processing initially.

## Requirements Summary

### User Decisions
- **Analytics:** Client-side tracking, rolling counters + daily snapshots, simple 7-day overview
- **Subscriptions:** Simple flow (requested → active → cancelled), monthly recurring, immediate downgrade on expiration
- **Premium Features:** Visual distinction only (badge, featured placement), analytics available to ALL businesses
- **Banners:** Homepage + Directory placement, random rotation, single responsive image (1200x400px)
- **Payments:** Admin manual entry with receipt upload
- **Review Flags:** Flag for admin review only, review stays visible

### Core Features
1. **Analytics Dashboard** - Profile views, WhatsApp clicks, 7-day charts (all businesses)
2. **Premium Subscriptions** - Request/manage premium status, admin approval workflow
3. **Banner Ads** - Upload creatives, request placement, admin approval
4. **Review Flagging** - Business owners flag inappropriate reviews for admin moderation
5. **Payment Tracking** - Admin records payments manually, generates simple receipts

---

## Section 1: Database Schema Design

### New Tables

#### 1. `business_analytics_daily`
Stores daily snapshots of analytics data for charting.

```sql
CREATE TABLE business_analytics_daily (
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
```

#### 2. `business_subscriptions`
Tracks premium subscription status and history.

```sql
CREATE TABLE business_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('requested', 'active', 'cancelled')),
  requested_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ, -- For monthly billing
  cancellation_reason TEXT,
  notes TEXT, -- Admin notes
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_business ON business_subscriptions(business_id, status);
CREATE INDEX idx_subscriptions_expires ON business_subscriptions(expires_at) WHERE status = 'active';

COMMENT ON TABLE business_subscriptions IS 'Premium subscription management with monthly billing cycle';
```

#### 3. `subscription_payments`
Admin-entered payment records for subscriptions.

```sql
CREATE TABLE subscription_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES business_subscriptions(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method TEXT, -- 'transfer', 'nequi', 'cash', etc.
  payment_proof_url TEXT, -- Optional receipt/proof image
  recorded_by UUID NOT NULL REFERENCES profiles(id),
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  notes TEXT
);

CREATE INDEX idx_payments_subscription ON subscription_payments(subscription_id, recorded_at DESC);

COMMENT ON TABLE subscription_payments IS 'Manual payment records entered by admins for premium subscriptions';
```

#### 4. `banner_ads`
Banner ad campaigns with placement and scheduling.

```sql
CREATE TABLE banner_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES communities(id),
  title TEXT NOT NULL,
  image_url TEXT NOT NULL, -- 1200x400px recommended
  link_url TEXT, -- Optional external link
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
```

#### 5. `banner_payments`
Payment tracking for banner ads.

```sql
CREATE TABLE banner_payments (
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
```

#### 6. `review_flags`
Business owners can flag inappropriate reviews.

```sql
CREATE TABLE review_flags (
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

  UNIQUE(review_id, flagged_by) -- One flag per user per review
);

CREATE INDEX idx_review_flags_status ON review_flags(status, created_at DESC);
CREATE INDEX idx_review_flags_review ON review_flags(review_id);

COMMENT ON TABLE review_flags IS 'Business owner reports of inappropriate reviews for admin moderation';
```

### Existing Table Modifications

Add analytics counters to `businesses` table:

```sql
ALTER TABLE businesses
  ADD COLUMN total_profile_views INT DEFAULT 0,
  ADD COLUMN total_whatsapp_clicks INT DEFAULT 0,
  ADD COLUMN last_analytics_update TIMESTAMPTZ;

CREATE INDEX idx_businesses_analytics ON businesses(total_profile_views DESC, total_whatsapp_clicks DESC);

COMMENT ON COLUMN businesses.total_profile_views IS 'Running total of profile page views (client-side tracked)';
COMMENT ON COLUMN businesses.total_whatsapp_clicks IS 'Running total of WhatsApp button clicks';
```

### Row Level Security (RLS) Policies

All new tables require RLS policies:

**business_analytics_daily:**
- Business owners can read their own analytics
- Community admins can read all analytics in their community
- Super admins can read all analytics

**business_subscriptions:**
- Business owners can read/create their own subscriptions
- Business owners can cancel their own active subscriptions
- Admins can read/update all subscriptions in their community
- Super admins have full access

**subscription_payments:**
- Business owners can read payments for their subscriptions
- Only admins can create/update payment records
- Super admins have full access

**banner_ads:**
- Business owners can create/read their own banner ads
- Admins can read/update all banner ads in their community
- Super admins have full access

**banner_payments:**
- Business owners can read payments for their banners
- Only admins can create payment records
- Super admins have full access

**review_flags:**
- Business owners can flag reviews on their businesses
- Business owners can read flags they created
- Admins can read/update all flags in their community
- Super admins have full access

---

## Section 2: API Routes Design

### Analytics API Routes

#### POST `/api/analytics/track`
Track profile view or WhatsApp click.

**Request:**
```typescript
{
  businessId: string
  eventType: 'profile_view' | 'whatsapp_click'
}
```

**Response:**
```typescript
{ success: boolean }
```

**Logic:**
1. Validate businessId exists
2. Increment counter on `businesses` table (`total_profile_views` or `total_whatsapp_clicks`)
3. Upsert `business_analytics_daily` record for today's date
4. Update `last_analytics_update` timestamp
5. Rate limiting: Max 1 profile view per session, max 10 WhatsApp clicks per user per day

#### GET `/api/businesses/[id]/analytics`
Get analytics for a business (owner or admin only).

**Response:**
```typescript
{
  totals: {
    profileViews: number
    whatsappClicks: number
    lastUpdated: string
  }
  daily: Array<{
    date: string
    profileViews: number
    whatsappClicks: number
  }>
  chartData: {
    labels: string[] // Last 7 days
    views: number[]
    clicks: number[]
  }
}
```

**Logic:**
1. Verify user owns business or is admin
2. Fetch totals from `businesses` table
3. Fetch last 7 days from `business_analytics_daily`
4. Format data for chart display

### Subscription API Routes

#### POST `/api/subscriptions/request`
Business owner requests premium subscription.

**Request:**
```typescript
{
  businessId: string
}
```

**Response:**
```typescript
{
  subscription: SubscriptionRecord
}
```

**Logic:**
1. Verify user owns business
2. Check if active subscription already exists (prevent duplicates)
3. Create subscription with status='requested', requested_at=NOW
4. Return subscription record

#### GET `/api/businesses/[id]/subscription`
Get active subscription status.

**Response:**
```typescript
{
  subscription: SubscriptionRecord | null
  isPremium: boolean
}
```

**Logic:**
1. Verify user owns business or is admin
2. Fetch active or most recent subscription
3. Return subscription + premium status flag

#### POST `/api/subscriptions/cancel`
Business owner cancels subscription.

**Request:**
```typescript
{
  subscriptionId: string
  reason?: string
}
```

**Response:**
```typescript
{ success: boolean }
```

**Logic:**
1. Verify user owns the business for this subscription
2. Verify subscription is active
3. Update subscription: status='cancelled', cancelled_at=NOW, cancellation_reason
4. Update business: is_featured=false
5. Return success

#### POST `/api/admin/subscriptions/[id]/activate` (Admin only)
Admin activates subscription after payment confirmation.

**Request:**
```typescript
{
  activatedAt: string
  expiresAt: string // 30 days from activation
  paymentAmount: number
  paymentMethod: string
  paymentProofUrl?: string
  notes?: string
}
```

**Response:**
```typescript
{
  subscription: SubscriptionRecord
}
```

**Logic:**
1. Verify user is admin for this community
2. Update subscription: status='active', activated_at, expires_at
3. Create payment record in `subscription_payments`
4. Update business: is_featured=true
5. Return updated subscription

#### POST `/api/admin/subscriptions/[id]/payment` (Admin only)
Admin records a renewal payment.

**Request:**
```typescript
{
  amount: number
  paymentMethod: string
  paymentProofUrl?: string
  periodStart: string
  periodEnd: string
  notes?: string
}
```

**Response:**
```typescript
{
  payment: PaymentRecord
}
```

**Logic:**
1. Verify user is admin
2. Create payment record
3. Extend subscription expires_at by 30 days (or period_end - period_start)
4. Return payment record

### Banner Ads API Routes

#### POST `/api/banners/request`
Business owner requests banner ad.

**Request (FormData):**
```typescript
{
  businessId: string
  title: string
  imageFile: File
  placement: 'homepage' | 'directory'
  linkUrl?: string
}
```

**Response:**
```typescript
{
  banner: BannerRecord
}
```

**Logic:**
1. Verify user owns business
2. Validate image: max 5MB, warn if not 1200x400px
3. Upload image to Supabase Storage (`banners/` bucket)
4. Create banner record with status='requested', image_url=uploaded path
5. Return banner record

#### GET `/api/banners/active`
Get active banners for a placement (public).

**Query:**
```typescript
{
  communityId: string
  placement: 'homepage' | 'directory'
}
```

**Response:**
```typescript
{
  banners: BannerRecord[]
}
```

**Logic:**
1. Query banner_ads WHERE community_id, placement, status='active', starts_at <= NOW, ends_at >= NOW
2. Return array of active banners
3. Client randomly picks one to display

#### POST `/api/admin/banners/[id]/approve` (Admin only)
Approve banner and set schedule.

**Request:**
```typescript
{
  startsAt: string
  endsAt: string
  paymentAmount: number
  paymentMethod: string
  paymentProofUrl?: string
  notes?: string
}
```

**Response:**
```typescript
{
  banner: BannerRecord
}
```

**Logic:**
1. Verify user is admin
2. Update banner: status='active', starts_at, ends_at, approved_at, approved_by
3. Create payment record in `banner_payments`
4. Return updated banner

#### PATCH `/api/admin/banners/[id]` (Admin only)
Update banner status (pause, reactivate, expire).

**Request:**
```typescript
{
  status: 'active' | 'paused' | 'expired'
}
```

**Response:**
```typescript
{
  banner: BannerRecord
}
```

**Logic:**
1. Verify user is admin
2. Update banner status
3. Return updated banner

### Review Flagging API Routes

#### POST `/api/reviews/[reviewId]/flag`
Business owner flags a review.

**Request:**
```typescript
{
  reason: 'spam' | 'offensive' | 'fake' | 'irrelevant' | 'other'
  description?: string
}
```

**Response:**
```typescript
{
  flag: ReviewFlagRecord
}
```

**Logic:**
1. Fetch review and verify user owns the business
2. Check for existing flag by this user (prevent duplicates)
3. Create flag record with status='pending'
4. Review remains visible
5. Return flag record

#### GET `/api/admin/review-flags` (Admin only)
Get all flagged reviews.

**Query:**
```typescript
{
  status?: 'pending' | 'reviewed' | 'dismissed'
  communityId: string
}
```

**Response:**
```typescript
{
  flags: Array<ReviewFlagRecord & { review: ReviewRecord }>
}
```

**Logic:**
1. Verify user is admin
2. Query review_flags with joins to business_reviews
3. Filter by status and community
4. Return flags with review context

#### POST `/api/admin/review-flags/[id]/resolve` (Admin only)
Admin resolves a flag.

**Request:**
```typescript
{
  status: 'reviewed' | 'dismissed'
  resolutionNotes?: string
  deleteReview?: boolean
}
```

**Response:**
```typescript
{
  flag: ReviewFlagRecord
}
```

**Logic:**
1. Verify user is admin
2. Update flag: status, reviewed_by, reviewed_at, resolution_notes
3. If deleteReview=true: Delete review from business_reviews
4. Return updated flag

---

## Section 3: UI Components - Merchant Dashboard

### Dashboard Structure

The merchant dashboard (`/dashboard`) will be enhanced with new tabs/sections:

```
Tabs:
├─ Business (existing)
│  ├─ My Businesses List
│  ├─ NEW: Analytics Widget (below business list)
│  ├─ NEW: Premium Upgrade Widget (if not premium)
│  └─ NEW: Banner Ads Widget
├─ Marketplace (existing)
├─ Favorites (existing)
└─ NEW: Analytics (optional dedicated tab)
```

### New Components

#### 1. `<BusinessAnalytics>` Component
**Location:** `components/business/business-analytics.tsx`

Displays business analytics dashboard with stats and charts.

**Props:**
```typescript
interface BusinessAnalyticsProps {
  businessId: string
}
```

**Features:**
- Stats strip with brutalist cards:
  - Total Profile Views (with eye icon)
  - Total WhatsApp Clicks (with phone icon)
  - Last Updated timestamp
- 7-day line chart showing daily trends (two lines: views and clicks)
- Chart uses primary color for views, accent color for clicks
- Export button (CSV download - future enhancement)

**Design:**
- Black 4px borders on cards
- Hard shadow: `shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`
- Uppercase labels with tracking-widest
- Chart container: black border, white background

#### 2. `<PremiumStatusWidget>` Component
**Location:** `components/subscription/premium-status-widget.tsx`

Shows current subscription status and actions.

**Props:**
```typescript
interface PremiumStatusWidgetProps {
  businessId: string
}
```

**States:**
- **No subscription:** CTA "Solicitar Premium" button + benefits preview
- **Requested:** "Solicitud Pendiente" badge + "Enviado el [date]"
- **Active:** "Premium Activo" badge + "Válido hasta [expires_at]" + "Cancelar" button
- **Cancelled:** "Cancelado" badge + cancellation reason + "Renovar" button

**Design:**
- Primary border for active, secondary border for pending
- Badge: rotated -2deg for playful touch
- Cancel button: destructive variant with confirmation modal

#### 3. `<PremiumBenefitsModal>` Component
**Location:** `components/subscription/premium-benefits-modal.tsx`

Modal displaying premium features and benefits.

**Features:**
- Title: "Hazte Premium"
- Benefits list with checkmarks:
  - ✅ Badge "PREMIUM" destacado en tu perfil
  - ✅ Aparición prioritaria en directorio
  - ✅ Mayor visibilidad en búsquedas
  - ✅ Posición destacada en homepage
- Pricing info (set by admin, shown as text)
- "Solicitar Ahora" button (primary, brutalist style)
- "Cancelar" button

**Design:**
- Brutalist modal with thick borders
- Checkmarks in primary color
- Large, bold uppercase headings

#### 4. `<BannerAdUpload>` Component
**Location:** `components/banners/banner-ad-upload.tsx`

Form to upload banner ad creative and request placement.

**Features:**
- Title input (text field)
- Image upload:
  - Drag-and-drop zone
  - File picker button
  - Preview thumbnail after selection
  - Validation: max 5MB, recommended 1200x400px (warn if different)
- Placement radio buttons: Homepage / Directorio
- Optional link URL input
- Guidelines text: "Tamaño recomendado: 1200x400px"
- Submit button: "Enviar Solicitud"

**Design:**
- Brutalist file drop zone with dashed border
- Preview: full-width with black border
- Form fields: brutalist-input class

#### 5. `<BannerAdCard>` Component
**Location:** `components/banners/banner-ad-card.tsx`

Displays banner ad in dashboard with status and actions.

**Props:**
```typescript
interface BannerAdCardProps {
  banner: BannerAd
}
```

**Features:**
- Image preview (thumbnail, 300px width)
- Title and placement badge
- Status badge: Solicitado / Activo / Pausado / Expirado
- Date range (if active): "Activo: [starts_at] - [ends_at]"
- Actions (if active): Pause button
- Click to view full size

**Design:**
- Horizontal card layout: image left, info right
- Status badges: color-coded (secondary for pending, primary for active, gray for paused/expired)
- Black borders and hard shadows

#### 6. `<AnalyticsChart>` Component
**Location:** `components/analytics/analytics-chart.tsx`

Renders 7-day line chart for analytics.

**Props:**
```typescript
interface AnalyticsChartProps {
  data: {
    labels: string[] // Date labels
    views: number[]
    clicks: number[]
  }
}
```

**Implementation:**
- Use Recharts library (lightweight, React-friendly)
- Line chart with two lines:
  - Profile Views: primary color
  - WhatsApp Clicks: accent color
- X-axis: dates (abbreviated, e.g., "Mar 12")
- Y-axis: counts
- Grid lines: subtle black, brutalist style
- Legend: top-right, shows totals

**Design:**
- Chart container: black border, white background
- Lines: 3px stroke width
- Dots on data points: 6px radius

#### 7. `<FlagReviewButton>` Component
**Location:** `components/reviews/flag-review-button.tsx`

Button to flag a review (only visible to business owner on their own business).

**Props:**
```typescript
interface FlagReviewButtonProps {
  reviewId: string
  businessId: string
}
```

**Features:**
- Flag icon button (small, outline variant)
- Opens modal on click:
  - Title: "Reportar Reseña"
  - Reason select dropdown: Spam / Ofensivo / Falso / Irrelevante / Otro
  - Description textarea (optional)
  - Submit button: "Enviar Reporte"
  - Cancel button
- Success toast: "Reseña reportada. Un administrador la revisará."

**Design:**
- Small icon button next to review timestamp
- Modal: brutalist with thick borders
- Dropdown and textarea: brutalist-input class

#### 8. `<AnalyticsTracker>` Component
**Location:** `components/analytics/analytics-tracker.tsx`

Client component that tracks page views and WhatsApp clicks.

**Props:**
```typescript
interface AnalyticsTrackerProps {
  businessId: string
  eventType?: 'profile_view' | 'whatsapp_click'
}
```

**Features:**
- For profile views:
  - useEffect on mount, calls `/api/analytics/track` once
  - Uses sessionStorage to prevent duplicate tracking in same session
- For WhatsApp clicks:
  - Attached to WhatsApp button onClick
  - Calls API then opens WhatsApp link
  - Rate limited: max 10 per user per day (checked server-side)

**Implementation:**
```tsx
'use client'
import { useEffect } from 'react'

export function AnalyticsTracker({ businessId, eventType = 'profile_view' }: AnalyticsTrackerProps) {
  useEffect(() => {
    if (eventType === 'profile_view') {
      const tracked = sessionStorage.getItem(`viewed_${businessId}`)
      if (!tracked) {
        fetch('/api/analytics/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessId, eventType })
        })
        sessionStorage.setItem(`viewed_${businessId}`, 'true')
      }
    }
  }, [businessId, eventType])

  return null
}
```

---

## Section 4: UI Components - Admin Panel

### Admin Navigation Structure

Add new sections to admin sidebar (`app/admin/layout.tsx`):

```tsx
// After existing sections (Negocios, Usuarios, etc.)

<div className="mb-6">
  <h3 className="text-xs uppercase tracking-widest font-black mb-2 px-4">
    Monetización
  </h3>
  <NavLink href="/admin/subscriptions" icon={CreditCard}>
    Suscripciones
  </NavLink>
  <NavLink href="/admin/banners" icon={Image}>
    Anuncios Banner
  </NavLink>
  <NavLink href="/admin/payments" icon={DollarSign}>
    Pagos
  </NavLink>
  <NavLink href="/admin/review-flags" icon={Flag}>
    Reseñas Reportadas
  </NavLink>
</div>
```

### New Admin Pages

#### 1. `/admin/subscriptions` - Subscriptions Management Page

**Components:**
- `<SubscriptionsTable>` - Main table component

**Table Columns:**
- Business Name (link to business profile)
- Status (badge: Solicitado / Activo / Cancelado)
- Requested Date
- Activated Date
- Expires Date (for active)
- Actions (View, Activate, Record Payment)

**Filters:**
- Status dropdown: All / Solicitado / Activo / Cancelado
- Search by business name

**Stats Strip (top):**
- Total Active: X
- Total Requested: X
- Expiring Soon (< 7 days): X

**Actions:**
- "View Details" → `/admin/subscriptions/[id]`
- "Activate" (if requested) → Opens activation form modal
- "Record Payment" (if active) → Opens payment form modal

#### 2. `/admin/subscriptions/[id]` - Subscription Detail Page

**Components:**
- `<SubscriptionDetail>` - Main info card
- `<ActivateSubscriptionForm>` - Activation form (if status=requested)
- `<RecordPaymentForm>` - Payment recording form (if status=active)
- `<PaymentHistoryTable>` - List of all payments
- `<CancelSubscriptionForm>` - Cancel with reason (if status=active)

**Subscription Detail Card:**
- Business name (link)
- Status badge
- All dates (requested, activated, expires, cancelled)
- Cancellation reason (if cancelled)
- Admin notes

**Payment History Table Columns:**
- Amount
- Payment Method
- Period (start - end)
- Recorded By (admin name)
- Recorded Date
- Payment Proof (image link)

#### 3. `<ActivateSubscriptionForm>` Component
**Location:** `components/admin/activate-subscription-form.tsx`

**Form Fields:**
- Activation Date (date picker, default: today)
- Expiration Date (date picker, default: +30 days from activation)
- Payment Amount (number input, COP currency)
- Payment Method (select: Transferencia / Nequi / Efectivo / Otro)
- Payment Proof (image upload, optional)
- Notes (textarea, optional)

**Submit Logic:**
- POST to `/api/admin/subscriptions/[id]/activate`
- Creates payment record
- Updates subscription to active
- Sets business.is_featured = true
- Redirects to subscription detail page

**Design:**
- Brutalist form with clear labels
- Submit button: primary color, "Activar Suscripción"
- Cancel button: outline

#### 4. `<RecordPaymentForm>` Component
**Location:** `components/admin/record-payment-form.tsx`

**Form Fields:**
- Payment Amount (number input)
- Payment Method (select)
- Payment Proof (image upload, optional)
- Period Start (date picker, default: current expires_at + 1 day)
- Period End (date picker, default: period start + 30 days)
- Notes (textarea, optional)

**Submit Logic:**
- POST to `/api/admin/subscriptions/[id]/payment`
- Creates payment record
- Extends subscription.expires_at to period_end
- Shows success toast

**Design:**
- Similar to activation form
- Submit button: "Registrar Pago"

#### 5. `/admin/banners` - Banner Ads Management Page

**Components:**
- `<BannersTable>` - Main table with image previews

**Table Columns:**
- Image Preview (thumbnail, 150px width)
- Business Name
- Title
- Placement (badge: Homepage / Directorio)
- Status (badge: Solicitado / Activo / Pausado / Expirado)
- Dates (starts - ends, if active)
- Actions (View, Approve, Pause, Expire)

**Filters:**
- Status dropdown
- Placement dropdown
- Search by business or title

**Stats Strip:**
- Total Active: X (Homepage: X, Directorio: X)
- Total Requested: X
- Total Expired: X

#### 6. `/admin/banners/[id]` - Banner Detail Page

**Components:**
- `<BannerDetail>` - Full-size banner preview + info
- `<ApproveBannerForm>` - Approval form (if status=requested)
- `<RecordBannerPaymentForm>` - Payment form
- `<BannerPaymentHistory>` - Payment records
- `<PauseBannerButton>` - Pause/Resume toggle

**Banner Detail:**
- Full-size image preview (click to open in new tab)
- Business name (link)
- Title
- Placement
- Optional link URL
- Status
- All dates
- Approved by (admin name, if approved)

#### 7. `<ApproveBannerForm>` Component
**Location:** `components/admin/approve-banner-form.tsx`

**Form Fields:**
- Start Date (date picker, default: today)
- End Date (date picker, default: +30 days or +7 days based on package)
- Payment Amount (number input)
- Payment Method (select)
- Payment Proof (image upload, optional)
- Notes (textarea, optional)

**Submit Logic:**
- POST to `/api/admin/banners/[id]/approve`
- Updates banner to active with dates
- Creates payment record
- Shows success toast
- Banner appears on site immediately

**Design:**
- Brutalist form
- Submit button: "Aprobar Anuncio"
- Preview banner image above form

#### 8. `/admin/payments` - Payments Dashboard Page

**Components:**
- `<PaymentsDashboard>` - Revenue overview and combined payments table

**Revenue Stats:**
- Total Revenue This Month (subscriptions + banners)
- Subscription Revenue
- Banner Revenue
- Payment Methods Breakdown (pie chart or bars)

**Recent Payments Table:**
- Combines subscription_payments and banner_payments
- Columns: Type (Suscripción / Banner) | Business | Amount | Method | Date | Recorded By
- Sortable and filterable
- Date range filter

**Export:**
- "Exportar CSV" button (downloads all payments in range)

#### 9. `/admin/review-flags` - Flagged Reviews Page

**Components:**
- `<FlaggedReviewsTable>` - List of all flagged reviews

**Table Columns:**
- Review Preview (first 100 chars)
- Business Name
- Flagger (business owner name)
- Reason (badge)
- Status (badge: Pendiente / Revisado / Descartado)
- Flagged Date
- Actions (View Context, Resolve)

**Filters:**
- Status dropdown
- Reason dropdown
- Search by business or review content

**Stats:**
- Total Pending: X
- Total Reviewed: X
- Total Dismissed: X

#### 10. `/admin/review-flags/[id]` - Review Flag Detail Page

**Components:**
- `<FlagDetail>` - Flag information
- `<ReviewContext>` - Full review + business context
- `<ResolveFlagForm>` - Resolve with action

**Flag Detail:**
- Flagger name (business owner)
- Reason badge
- Description (if provided)
- Flagged date
- Status

**Review Context:**
- Full review text
- Rating (stars)
- Review author name
- Business name (link to profile)
- Review date

**Resolve Flag Form:**
- Resolution radio buttons:
  - Dismiss Flag (review stays)
  - Delete Review (remove review)
- Resolution Notes (textarea, required)
- Submit button: "Resolver"

**Submit Logic:**
- POST to `/api/admin/review-flags/[id]/resolve`
- Updates flag status
- Deletes review if selected
- Shows confirmation toast

#### 11. `<BannerRotator>` Component
**Location:** `components/banners/banner-rotator.tsx`

Client component for displaying banners on homepage and directory.

**Props:**
```typescript
interface BannerRotatorProps {
  placement: 'homepage' | 'directory'
  communityId: string
}
```

**Implementation:**
```tsx
'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'

export function BannerRotator({ placement, communityId }: BannerRotatorProps) {
  const [banner, setBanner] = useState<BannerAd | null>(null)

  useEffect(() => {
    fetch(`/api/banners/active?communityId=${communityId}&placement=${placement}`)
      .then(res => res.json())
      .then(data => {
        if (data.banners.length > 0) {
          // Random selection
          const randomIndex = Math.floor(Math.random() * data.banners.length)
          setBanner(data.banners[randomIndex])
        }
      })
  }, [communityId, placement])

  if (!banner) return null

  const BannerWrapper = banner.link_url ? 'a' : 'div'

  return (
    <BannerWrapper
      href={banner.link_url}
      target="_blank"
      rel="noopener noreferrer"
      className="block border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all"
    >
      <Image
        src={banner.image_url}
        alt={banner.title}
        width={1200}
        height={400}
        className="w-full h-auto"
      />
    </BannerWrapper>
  )
}
```

**Placement:**
- Homepage: Between hero and quick nav
- Directory: Above business grid

---

## Section 5: Business Logic & Workflows

### Analytics Tracking Workflow

#### Profile View Tracking

**Flow:**
1. User navigates to business profile page: `GET /[community]/business/[slug]`
2. Page renders with `<AnalyticsTracker businessId={business.id} />`
3. Tracker component mounts, checks sessionStorage for `viewed_{businessId}`
4. If not tracked this session:
   - Calls `POST /api/analytics/track` with `{ businessId, eventType: 'profile_view' }`
   - Sets sessionStorage flag
5. API route:
   - Increments `businesses.total_profile_views` by 1
   - Upserts `business_analytics_daily` for today's date:
     - If record exists: increment `profile_views`
     - If not: create with `profile_views = 1`
   - Updates `businesses.last_analytics_update = NOW()`
   - Returns `{ success: true }`
6. Tracker completes (no visual feedback)

**Rate Limiting:**
- SessionStorage prevents multiple tracks in same browsing session
- IP-based rate limiting: max 100 views per IP per day (prevent bots)

#### WhatsApp Click Tracking

**Flow:**
1. User clicks WhatsApp button on business profile
2. Button onClick handler:
   - Calls `POST /api/analytics/track` with `{ businessId, eventType: 'whatsapp_click' }`
   - Opens WhatsApp link: `window.open(whatsappUrl, '_blank')`
3. API route:
   - Increments `businesses.total_whatsapp_clicks` by 1
   - Upserts `business_analytics_daily` for today (increment `whatsapp_clicks`)
   - Updates `businesses.last_analytics_update = NOW()`
   - Returns `{ success: true }`

**Rate Limiting:**
- Max 10 WhatsApp clicks per authenticated user per day
- Prevents spam clicking to inflate metrics

#### Analytics Dashboard Display

**Flow:**
1. Business owner navigates to dashboard or analytics tab
2. Component fetches: `GET /api/businesses/[id]/analytics`
3. API route:
   - Verifies user owns business or is admin
   - Fetches totals from `businesses` table
   - Fetches last 7 days from `business_analytics_daily`:
     ```sql
     SELECT date, profile_views, whatsapp_clicks
     FROM business_analytics_daily
     WHERE business_id = $1
       AND date >= CURRENT_DATE - INTERVAL '7 days'
     ORDER BY date ASC
     ```
   - Formats data for chart:
     - labels: array of dates (e.g., ["Mar 12", "Mar 13", ...])
     - views: array of daily profile_views
     - clicks: array of daily whatsapp_clicks
4. Component renders:
   - Stats cards with totals
   - Line chart with Recharts library
   - Last updated timestamp

### Subscription Lifecycle Workflow

#### 1. Business Owner Requests Premium

**Flow:**
1. Business owner clicks "Solicitar Premium" button in dashboard
2. Opens `<PremiumBenefitsModal>` showing:
   - Premium features list
   - Pricing information (set by admin, hardcoded or from config)
   - "Solicitar Ahora" button
3. User confirms → `POST /api/subscriptions/request` with `{ businessId }`
4. API route:
   - Verifies user owns business
   - Checks for existing subscription:
     - If status='active': Return error "Ya tienes suscripción activa"
     - If status='requested': Return error "Ya tienes solicitud pendiente"
   - Creates new subscription:
     ```sql
     INSERT INTO business_subscriptions (
       business_id, status, requested_at
     ) VALUES (
       $1, 'requested', NOW()
     )
     ```
5. Returns subscription record
6. Dashboard updates to show "Solicitud Pendiente" badge
7. Admin notification (future: email or push)

#### 2. Admin Activates Subscription

**Flow:**
1. Admin navigates to `/admin/subscriptions`
2. Sees table with requested subscriptions (status='requested')
3. Clicks "Activate" on a subscription → Opens `<ActivateSubscriptionForm>` modal
4. Admin fills form:
   - Activation date (default: today)
   - Expiration date (default: activation + 30 days)
   - Payment amount (e.g., 50000 COP)
   - Payment method (e.g., "Transferencia")
   - Payment proof image (optional receipt)
   - Notes (e.g., "Pago recibido via Bancolombia")
5. Submits → `POST /api/admin/subscriptions/[id]/activate`
6. API route (transaction):
   - Updates subscription:
     ```sql
     UPDATE business_subscriptions
     SET status = 'active',
         activated_at = $1,
         expires_at = $2,
         updated_at = NOW()
     WHERE id = $3
     ```
   - Creates payment record:
     ```sql
     INSERT INTO subscription_payments (
       subscription_id, amount, payment_method,
       payment_proof_url, recorded_by, period_start, period_end
     ) VALUES (...)
     ```
   - Updates business:
     ```sql
     UPDATE businesses
     SET is_featured = true
     WHERE id = $business_id
     ```
7. Returns updated subscription
8. Modal closes, table refreshes
9. Business owner sees "Premium Activo" in dashboard
10. Business appears with premium badge in directory

#### 3. Subscription Renewal (Manual)

**Flow:**
1. Business owner pays for renewal (external: WhatsApp, bank transfer, etc.)
2. Admin navigates to `/admin/subscriptions/[id]`
3. Views subscription detail, sees expires_at date
4. Clicks "Registrar Pago" → Opens `<RecordPaymentForm>` modal
5. Admin fills form:
   - Amount (e.g., 50000 COP)
   - Payment method
   - Payment proof (optional)
   - Period start (default: current expires_at + 1 day)
   - Period end (default: period start + 30 days)
   - Notes
6. Submits → `POST /api/admin/subscriptions/[id]/payment`
7. API route:
   - Creates payment record
   - Extends subscription:
     ```sql
     UPDATE business_subscriptions
     SET expires_at = $period_end,
         updated_at = NOW()
     WHERE id = $1
     ```
   - Status remains 'active'
8. Returns payment record
9. Subscription detail page refreshes
10. New expiration date displayed

#### 4. Subscription Expiration (Automated)

**Cron Job (Daily at 00:00):**
```sql
-- Find expired subscriptions
SELECT id, business_id
FROM business_subscriptions
WHERE status = 'active'
  AND expires_at < NOW()
```

For each expired subscription:
```sql
-- Update subscription
UPDATE business_subscriptions
SET status = 'cancelled',
    cancelled_at = NOW(),
    cancellation_reason = 'Expirado por falta de pago'
WHERE id = $1;

-- Remove premium status
UPDATE businesses
SET is_featured = false
WHERE id = $business_id;
```

Optional: Send notification to business owner
- Email: "Tu suscripción premium ha expirado. Renueva para seguir destacado."
- Push notification (if implemented)

**Implementation:**
- Vercel Cron Job (vercel.json)
- OR Supabase Edge Function triggered daily
- OR API route `/api/cron/expire-subscriptions` called by external service

#### 5. Business Owner Cancels Subscription

**Flow:**
1. Business owner views dashboard, sees "Premium Activo" widget
2. Clicks "Cancelar Suscripción" → Opens confirmation modal
3. Modal:
   - Warning: "Perderás acceso a funciones premium inmediatamente"
   - Optional reason textarea
   - "Confirmar Cancelación" button
4. Submits → `POST /api/subscriptions/cancel` with `{ subscriptionId, reason? }`
5. API route:
   - Verifies user owns business
   - Verifies subscription is active
   - Updates subscription:
     ```sql
     UPDATE business_subscriptions
     SET status = 'cancelled',
         cancelled_at = NOW(),
         cancellation_reason = $1
     WHERE id = $2
     ```
   - Updates business:
     ```sql
     UPDATE businesses
     SET is_featured = false
     WHERE id = $business_id
     ```
6. Returns success
7. Dashboard updates to show "Cancelado" badge
8. Premium features removed immediately

### Banner Ad Lifecycle Workflow

#### 1. Business Owner Requests Banner Ad

**Flow:**
1. Business owner navigates to dashboard → "Anuncios de Banner" section
2. Clicks "Crear Nuevo Anuncio" → Opens `<BannerAdUpload>` form
3. Fills form:
   - Title (e.g., "¡Gran Oferta de Marzo!")
   - Image upload (drag-drop or file picker)
     - Validation: max 5MB
     - Recommendation shown: "1200x400px para mejor calidad"
     - If dimensions don't match: Show warning (not blocking)
   - Placement selection: Homepage OR Directorio
   - Optional link URL (e.g., "https://instagram.com/mibusiness")
4. Submits → `POST /api/banners/request` (FormData)
5. API route:
   - Verifies user owns business
   - Validates image file (size, type)
   - Uploads to Supabase Storage:
     ```typescript
     const { data } = await supabase.storage
       .from('banners')
       .upload(`${businessId}/${Date.now()}.jpg`, imageFile)
     ```
   - Creates banner record:
     ```sql
     INSERT INTO banner_ads (
       business_id, community_id, title, image_url,
       placement, status, requested_at
     ) VALUES (
       $1, $2, $3, $4, $5, 'requested', NOW()
     )
     ```
6. Returns banner record
7. Form closes, shows success toast: "Solicitud enviada. Un admin la revisará."
8. Dashboard shows banner card with status "Solicitado"

#### 2. Admin Approves Banner Ad

**Flow:**
1. Admin navigates to `/admin/banners`
2. Sees table with requested banners (includes image thumbnails)
3. Clicks on a banner → `/admin/banners/[id]` detail page
4. Views full-size banner preview, business info, placement
5. Clicks "Aprobar" → Opens `<ApproveBannerForm>` modal
6. Admin fills form:
   - Start date (default: today)
   - End date (default: +30 days for monthly, +7 days for weekly package)
   - Payment amount (e.g., 100000 COP for homepage, 50000 for directory)
   - Payment method
   - Payment proof (optional receipt)
   - Notes
7. Submits → `POST /api/admin/banners/[id]/approve`
8. API route (transaction):
   - Updates banner:
     ```sql
     UPDATE banner_ads
     SET status = 'active',
         starts_at = $1,
         ends_at = $2,
         approved_at = NOW(),
         approved_by = $admin_id,
         updated_at = NOW()
     WHERE id = $3
     ```
   - Creates payment record:
     ```sql
     INSERT INTO banner_payments (
       banner_id, amount, payment_method,
       payment_proof_url, recorded_by
     ) VALUES (...)
     ```
9. Returns updated banner
10. Modal closes, table refreshes
11. Banner now appears on selected placement (homepage or directory)
12. Business owner sees "Activo" status in dashboard

#### 3. Banner Display (Random Rotation)

**Flow:**
1. User visits homepage or directory page
2. Page includes `<BannerRotator placement="homepage" communityId="..." />`
3. Component mounts, fetches active banners:
   ```typescript
   GET /api/banners/active?communityId=X&placement=homepage
   ```
4. API route queries:
   ```sql
   SELECT * FROM banner_ads
   WHERE community_id = $1
     AND placement = $2
     AND status = 'active'
     AND starts_at <= NOW()
     AND ends_at >= NOW()
   ```
5. Returns array of active banners (e.g., 3 banners)
6. Component randomly picks one:
   ```typescript
   const randomIndex = Math.floor(Math.random() * banners.length)
   const selectedBanner = banners[randomIndex]
   ```
7. Renders banner image (with link if provided)
8. On each page load/refresh, different banner may appear

**Note:** True impression tracking (how many times each banner was shown) is a future enhancement. For now, rotation is fair but not tracked.

#### 4. Admin Pauses/Resumes Banner

**Flow:**
1. Admin navigates to `/admin/banners/[id]`
2. Sees "Pausar Anuncio" button (if status='active')
3. Clicks pause → Confirmation modal
4. Confirms → `PATCH /api/admin/banners/[id]` with `{ status: 'paused' }`
5. API route:
   ```sql
   UPDATE banner_ads
   SET status = 'paused', updated_at = NOW()
   WHERE id = $1
   ```
6. Banner no longer appears in rotation
7. Button changes to "Reactivar"
8. To resume: same flow with `{ status: 'active' }`

#### 5. Banner Expiration (Automated)

**Cron Job (Daily at 00:00):**
```sql
-- Find expired banners
SELECT id
FROM banner_ads
WHERE status = 'active'
  AND ends_at < NOW()
```

For each expired banner:
```sql
UPDATE banner_ads
SET status = 'expired', updated_at = NOW()
WHERE id = $1
```

**Implementation:**
- Same cron system as subscription expiration
- Can be combined into single daily job

### Review Flagging Workflow

#### 1. Business Owner Flags Review

**Flow:**
1. Business owner views their business profile page
2. Sees list of reviews (component: `<ReviewList>`)
3. Each review card includes `<FlagReviewButton>` (only if user owns business)
4. Clicks flag button → Opens modal
5. Modal:
   - Title: "Reportar Reseña Inapropiada"
   - Reason dropdown:
     - Spam
     - Contenido Ofensivo
     - Reseña Falsa
     - Irrelevante al Negocio
     - Otro
   - Description textarea (optional, required if "Otro")
   - Submit button: "Enviar Reporte"
6. Submits → `POST /api/reviews/[reviewId]/flag`
7. API route:
   - Fetches review to verify business ownership:
     ```sql
     SELECT business_id FROM business_reviews WHERE id = $1
     ```
   - Verifies user owns business
   - Checks for existing flag by this user (prevent duplicates):
     ```sql
     SELECT id FROM review_flags
     WHERE review_id = $1 AND flagged_by = $2
     ```
   - If exists: Return error "Ya reportaste esta reseña"
   - Creates flag:
     ```sql
     INSERT INTO review_flags (
       review_id, flagged_by, reason, description, status
     ) VALUES (
       $1, $2, $3, $4, 'pending'
     )
     ```
8. Returns flag record
9. Modal closes, shows toast: "Reseña reportada. Un administrador la revisará."
10. Review remains visible on profile (no visual change)
11. Admin gets notification (dashboard badge shows pending count)

#### 2. Admin Views Flagged Reviews

**Flow:**
1. Admin navigates to `/admin/review-flags`
2. Sees table of all flagged reviews with filters:
   - Status: Pendiente / Revisado / Descartado
   - Reason: All / Spam / Ofensivo / etc.
3. Table shows:
   - Review preview (first 100 chars)
   - Business name
   - Flagger (business owner who flagged it)
   - Reason badge
   - Status badge
   - Flagged date
4. Clicks on a flag → `/admin/review-flags/[id]` detail page

#### 3. Admin Resolves Flag

**Flow:**
1. Admin views flag detail page
2. Sees:
   - Flag info (reason, description, flagger)
   - Full review context (review text, rating, author, business)
   - Resolution form
3. Admin reads review and decides:
   - **Option A: Dismiss Flag** - Review is legitimate, business owner overreacting
   - **Option B: Delete Review** - Review violates policy (spam, offensive, fake)
4. Fills resolution form:
   - Radio buttons: Descartar / Eliminar Reseña
   - Resolution notes textarea (required, e.g., "Reseña válida" or "Spam confirmado")
5. Submits → `POST /api/admin/review-flags/[id]/resolve`
6. API route (transaction):
   - Updates flag:
     ```sql
     UPDATE review_flags
     SET status = CASE
           WHEN $deleteReview THEN 'reviewed'
           ELSE 'dismissed'
         END,
         reviewed_by = $admin_id,
         reviewed_at = NOW(),
         resolution_notes = $notes
     WHERE id = $1
     ```
   - If deleteReview=true:
     ```sql
     DELETE FROM business_reviews WHERE id = $review_id
     ```
     - Note: Cascade deletes review_responses if any
7. Returns updated flag
8. Redirects back to `/admin/review-flags`
9. If review deleted: Business owner sees review removed from profile
10. If flag dismissed: Review remains visible, no change for users

---

## Section 6: Integration Points

### Where Features Connect to Existing Code

#### 1. Business Profile Page
**File:** `app/[community]/business/[slug]/page.tsx`

**Changes:**
```tsx
// Add analytics tracking
import { AnalyticsTracker } from '@/components/analytics/analytics-tracker'

// In component:
<AnalyticsTracker businessId={business.id} />

// Update WhatsApp button
<WhatsAppButton
  number={business.whatsapp}
  businessId={business.id} // Pass ID for tracking
/>

// Display premium badge
{business.is_featured && (
  <Badge className="absolute top-2 right-2 bg-secondary text-black rotate-[-2deg] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
    PREMIUM
  </Badge>
)}
```

**Review List Component:**
```tsx
// Add flag button to review cards (only for business owner)
{isOwner && (
  <FlagReviewButton reviewId={review.id} businessId={business.id} />
)}
```

#### 2. Directory Listings
**Files:**
- `app/[community]/directory/page.tsx`
- `app/[community]/directory/[category]/page.tsx`
- `components/directory/business-card.tsx`

**Changes:**
```tsx
// Sort businesses: premium first
const sortedBusinesses = businesses.sort((a, b) => {
  if (a.is_featured && !b.is_featured) return -1
  if (!a.is_featured && b.is_featured) return 1
  return a.name.localeCompare(b.name)
})

// Display premium badge on cards
{business.is_featured && (
  <Badge className="absolute top-2 right-2 bg-secondary text-black">
    PREMIUM
  </Badge>
)}

// Add banner above business grid
<BannerRotator placement="directory" communityId={community.id} />
```

#### 3. Community Homepage
**File:** `app/[community]/page.tsx`

**Changes:**
```tsx
import { BannerRotator } from '@/components/banners/banner-rotator'

// In component (after HeroBanner, before QuickNav):
<HeroBanner community={community} />

<BannerRotator placement="homepage" communityId={community.id} />

<QuickNav />
```

**Note:** Featured businesses section already uses `is_featured` field, no changes needed.

#### 4. Merchant Dashboard
**File:** `app/dashboard/page.tsx`

**Changes to BusinessTabContent component:**
```tsx
// After business list, before community posts:
{businesses && businesses.length > 0 && (
  <>
    {/* Analytics Widget */}
    <BusinessAnalytics businessId={businesses[0].id} />

    {/* Premium Status Widget */}
    <PremiumStatusWidget businessId={businesses[0].id} />

    {/* Banner Ads Section */}
    <BannerAdsManager businessId={businesses[0].id} />
  </>
)}
```

**Optional: Add Analytics Tab:**
```tsx
// In DashboardTabsClient:
tabs = [
  { label: 'Negocios', value: 'business' },
  { label: 'Marketplace', value: 'marketplace', count: classifiedsCount },
  { label: 'Favoritos', value: 'favorites', count: favoritesCount },
  { label: 'Analíticas', value: 'analytics' }, // NEW
]
```

#### 5. Admin Panel Layout
**File:** `app/admin/layout.tsx`

**Changes to sidebar:**
```tsx
{/* After existing sections (Negocios, Usuarios, Comunidad, etc.) */}

<div className="mb-6">
  <h3 className="text-xs uppercase tracking-widest font-black mb-2 px-4 text-black/60">
    Monetización
  </h3>
  <NavLink href="/admin/subscriptions" icon={CreditCard}>
    Suscripciones
  </NavLink>
  <NavLink href="/admin/banners" icon={Image}>
    Anuncios Banner
  </NavLink>
  <NavLink href="/admin/payments" icon={DollarSign}>
    Pagos
  </NavLink>
  <NavLink href="/admin/review-flags" icon={Flag}>
    Reseñas Reportadas
  </NavLink>
</div>
```

#### 6. Admin Statistics Page
**File:** `app/admin/statistics/page.tsx`

**Add monetization stats cards:**
```tsx
// Fetch stats
const { count: activeSubscriptions } = await supabase
  .from('business_subscriptions')
  .select('id', { count: 'exact', head: true })
  .eq('status', 'active')

const { count: activeBanners } = await supabase
  .from('banner_ads')
  .select('id', { count: 'exact', head: true })
  .eq('status', 'active')

// Calculate monthly revenue
const { data: monthlyPayments } = await supabase
  .from('subscription_payments')
  .select('amount')
  .gte('recorded_at', startOfMonth)

// Render stats cards
<StatsCard
  title="Suscripciones Activas"
  value={activeSubscriptions}
  icon={CreditCard}
/>
<StatsCard
  title="Anuncios Activos"
  value={activeBanners}
  icon={Image}
/>
<StatsCard
  title="Ingresos Mensuales"
  value={formatCurrency(totalRevenue)}
  icon={DollarSign}
/>
```

#### 7. Database Type Definitions
**File:** `lib/types/database.ts`

**Add helper types at the end:**
```typescript
// Analytics
export type BusinessAnalyticsDaily = Database['public']['Tables']['business_analytics_daily']['Row']
export type AnalyticsSummary = {
  totals: {
    profileViews: number
    whatsappClicks: number
    lastUpdated: string
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
}

// Banners
export type BannerAd = Database['public']['Tables']['banner_ads']['Row']
export type BannerPayment = Database['public']['Tables']['banner_payments']['Row']
export type BannerWithPayments = BannerAd & {
  payments: BannerPayment[]
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
}
```

#### 8. WhatsApp Button Component
**File:** `components/shared/whatsapp-button.tsx`

**Add analytics tracking:**
```tsx
'use client'
import { trackWhatsAppClick } from '@/lib/analytics'

interface WhatsAppButtonProps {
  number: string
  businessId?: string // NEW
  businessName: string
}

export function WhatsAppButton({ number, businessId, businessName }: WhatsAppButtonProps) {
  const handleClick = async () => {
    // Track click if businessId provided
    if (businessId) {
      await fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          eventType: 'whatsapp_click'
        })
      })
    }

    // Open WhatsApp
    const message = encodeURIComponent(`Hola ${businessName}, vi tu perfil en BarrioRed y me interesa...`)
    window.open(`https://wa.me/${number}?text=${message}`, '_blank')
  }

  return (
    <button onClick={handleClick} className="brutalist-button">
      <MessageCircle className="h-5 w-5 mr-2" />
      Contactar por WhatsApp
    </button>
  )
}
```

#### 9. Automated Jobs (Cron)
**File:** `app/api/cron/daily-expiration/route.ts` (NEW)

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  // Verify cron secret (security)
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  // Expire subscriptions
  const { data: expiredSubs } = await supabase
    .from('business_subscriptions')
    .select('id, business_id')
    .eq('status', 'active')
    .lt('expires_at', new Date().toISOString())

  for (const sub of expiredSubs || []) {
    await supabase
      .from('business_subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: 'Expirado por falta de pago'
      })
      .eq('id', sub.id)

    await supabase
      .from('businesses')
      .update({ is_featured: false })
      .eq('id', sub.business_id)
  }

  // Expire banners
  const { data: expiredBanners } = await supabase
    .from('banner_ads')
    .select('id')
    .eq('status', 'active')
    .lt('ends_at', new Date().toISOString())

  for (const banner of expiredBanners || []) {
    await supabase
      .from('banner_ads')
      .update({ status: 'expired' })
      .eq('id', banner.id)
  }

  return NextResponse.json({
    expiredSubscriptions: expiredSubs?.length || 0,
    expiredBanners: expiredBanners?.length || 0
  })
}
```

**Vercel cron configuration (vercel.json):**
```json
{
  "crons": [{
    "path": "/api/cron/daily-expiration",
    "schedule": "0 0 * * *"
  }]
}
```

### Complete File Structure

```
app/
├── api/
│   ├── analytics/
│   │   └── track/
│   │       └── route.ts (NEW)
│   ├── banners/
│   │   ├── request/
│   │   │   └── route.ts (NEW)
│   │   └── active/
│   │       └── route.ts (NEW)
│   ├── subscriptions/
│   │   ├── request/
│   │   │   └── route.ts (NEW)
│   │   └── cancel/
│   │       └── route.ts (NEW)
│   ├── businesses/
│   │   └── [id]/
│   │       ├── analytics/
│   │       │   └── route.ts (NEW)
│   │       └── subscription/
│   │           └── route.ts (NEW)
│   ├── reviews/
│   │   └── [reviewId]/
│   │       └── flag/
│   │           └── route.ts (NEW)
│   ├── admin/
│   │   ├── subscriptions/
│   │   │   └── [id]/
│   │   │       ├── activate/
│   │   │       │   └── route.ts (NEW)
│   │   │       └── payment/
│   │   │           └── route.ts (NEW)
│   │   ├── banners/
│   │   │   └── [id]/
│   │   │       ├── approve/
│   │   │       │   └── route.ts (NEW)
│   │   │       └── route.ts (NEW - PATCH for pause/resume)
│   │   └── review-flags/
│   │       ├── route.ts (NEW - GET list)
│   │       └── [id]/
│   │           └── resolve/
│   │               └── route.ts (NEW)
│   └── cron/
│       └── daily-expiration/
│           └── route.ts (NEW)
├── [community]/
│   ├── business/
│   │   └── [slug]/
│   │       └── page.tsx (MODIFY - add analytics tracker, premium badge, flag button)
│   ├── directory/
│   │   ├── page.tsx (MODIFY - add banner, premium sorting)
│   │   └── [category]/
│   │       └── page.tsx (MODIFY - same as above)
│   └── page.tsx (MODIFY - add banner rotator)
├── dashboard/
│   └── page.tsx (MODIFY - add analytics, premium, banner widgets)
└── admin/
    ├── layout.tsx (MODIFY - add monetization nav section)
    ├── statistics/
    │   └── page.tsx (MODIFY - add revenue stats)
    ├── subscriptions/
    │   ├── page.tsx (NEW)
    │   └── [id]/
    │       └── page.tsx (NEW)
    ├── banners/
    │   ├── page.tsx (NEW)
    │   └── [id]/
    │       └── page.tsx (NEW)
    ├── payments/
    │   └── page.tsx (NEW)
    └── review-flags/
        ├── page.tsx (NEW)
        └── [id]/
            └── page.tsx (NEW)

components/
├── analytics/
│   ├── analytics-chart.tsx (NEW)
│   ├── analytics-tracker.tsx (NEW - client)
│   └── business-analytics.tsx (NEW)
├── subscription/
│   ├── premium-status-widget.tsx (NEW)
│   ├── premium-benefits-modal.tsx (NEW)
│   └── cancel-subscription-button.tsx (NEW)
├── banners/
│   ├── banner-rotator.tsx (NEW - client)
│   ├── banner-ad-upload.tsx (NEW)
│   └── banner-ad-card.tsx (NEW)
├── admin/
│   ├── activate-subscription-form.tsx (NEW)
│   ├── record-payment-form.tsx (NEW)
│   ├── approve-banner-form.tsx (NEW)
│   ├── subscriptions-table.tsx (NEW)
│   ├── banners-table.tsx (NEW)
│   └── flagged-reviews-table.tsx (NEW)
├── reviews/
│   └── flag-review-button.tsx (NEW)
└── shared/
    └── whatsapp-button.tsx (MODIFY - add tracking)

lib/
├── types/
│   └── database.ts (MODIFY - add helper types)
└── utils.ts (add formatCurrency, formatDate helpers if needed)

supabase/
└── migrations/
    └── YYYYMMDDHHMMSS_add_monetization_tables.sql (NEW)

vercel.json (MODIFY - add cron job)
```

---

## Implementation Phases

Following the **Incremental Database-First** approach:

### Phase 1: Database Foundation (Week 1)
- [ ] Create migration file with all 6 new tables
- [ ] Add columns to businesses table
- [ ] Write RLS policies for all tables
- [ ] Deploy migration to Supabase
- [ ] Generate TypeScript types with `supabase gen types`
- [ ] Update `lib/types/database.ts` with helper types

### Phase 2: Analytics API & Tracking (Week 1-2)
- [ ] Build `POST /api/analytics/track` endpoint
- [ ] Build `GET /api/businesses/[id]/analytics` endpoint
- [ ] Create `<AnalyticsTracker>` client component
- [ ] Integrate tracker into business profile page
- [ ] Update WhatsApp button with click tracking
- [ ] Test tracking and data aggregation

### Phase 3: Subscription API (Week 2)
- [ ] Build `POST /api/subscriptions/request` endpoint
- [ ] Build `GET /api/businesses/[id]/subscription` endpoint
- [ ] Build `POST /api/subscriptions/cancel` endpoint
- [ ] Build `POST /api/admin/subscriptions/[id]/activate` endpoint
- [ ] Build `POST /api/admin/subscriptions/[id]/payment` endpoint
- [ ] Test all subscription workflows

### Phase 4: Banner Ads API (Week 2-3)
- [ ] Create Supabase Storage bucket for banners
- [ ] Build `POST /api/banners/request` endpoint (with file upload)
- [ ] Build `GET /api/banners/active` endpoint
- [ ] Build `POST /api/admin/banners/[id]/approve` endpoint
- [ ] Build `PATCH /api/admin/banners/[id]` endpoint
- [ ] Test banner upload and approval

### Phase 5: Review Flagging API (Week 3)
- [ ] Build `POST /api/reviews/[reviewId]/flag` endpoint
- [ ] Build `GET /api/admin/review-flags` endpoint
- [ ] Build `POST /api/admin/review-flags/[id]/resolve` endpoint
- [ ] Test flagging workflow

### Phase 6: Merchant Dashboard UI (Week 3-4)
- [ ] Build `<BusinessAnalytics>` component
- [ ] Build `<AnalyticsChart>` component (with Recharts)
- [ ] Build `<PremiumStatusWidget>` component
- [ ] Build `<PremiumBenefitsModal>` component
- [ ] Build `<BannerAdUpload>` component
- [ ] Build `<BannerAdCard>` component
- [ ] Build `<FlagReviewButton>` component
- [ ] Integrate all components into dashboard
- [ ] Test merchant experience end-to-end

### Phase 7: Admin Panel UI (Week 4-5)
- [ ] Update admin layout with monetization nav
- [ ] Build `/admin/subscriptions` page + `<SubscriptionsTable>`
- [ ] Build `/admin/subscriptions/[id]` page
- [ ] Build `<ActivateSubscriptionForm>` component
- [ ] Build `<RecordPaymentForm>` component
- [ ] Build `/admin/banners` page + `<BannersTable>`
- [ ] Build `/admin/banners/[id]` page
- [ ] Build `<ApproveBannerForm>` component
- [ ] Build `/admin/payments` page + `<PaymentsDashboard>`
- [ ] Build `/admin/review-flags` page + `<FlaggedReviewsTable>`
- [ ] Build `/admin/review-flags/[id]` page
- [ ] Test admin workflows

### Phase 8: Frontend Integration (Week 5)
- [ ] Add premium badges to business cards in directory
- [ ] Sort directory by premium status
- [ ] Add premium badge to business profile page
- [ ] Build `<BannerRotator>` component
- [ ] Integrate banner on homepage
- [ ] Integrate banner on directory page
- [ ] Update admin statistics page with revenue stats
- [ ] Test all integrations

### Phase 9: Automation & Cron Jobs (Week 5-6)
- [ ] Build `/api/cron/daily-expiration` route
- [ ] Configure Vercel cron in vercel.json
- [ ] Test subscription expiration automation
- [ ] Test banner expiration automation
- [ ] Set up monitoring/alerts for cron failures
- [ ] Document manual intervention procedures

### Phase 10: Testing & Polish (Week 6)
- [ ] End-to-end testing of all monetization features
- [ ] Test with multiple concurrent users
- [ ] Test edge cases (expired cards, missing payments, etc.)
- [ ] UI/UX polish and brutalist design consistency
- [ ] Performance optimization (N+1 queries, caching)
- [ ] Documentation for admins (payment workflows)
- [ ] Documentation for business owners (how to upgrade)

---

## Success Metrics

### Technical Metrics
- [ ] All analytics tracking fires correctly (no missed events)
- [ ] Subscription state transitions work flawlessly (no orphaned states)
- [ ] Banner rotation shows each banner fairly (random distribution)
- [ ] Cron jobs run daily without failures (monitor logs)
- [ ] Zero N+1 query issues (optimized joins)
- [ ] Page load time < 2s with banners and analytics

### Business Metrics (Phase 2 Goals)
- [ ] 10+ businesses request premium in first month
- [ ] 5+ premium subscriptions activated
- [ ] 3+ banner ads running simultaneously
- [ ] Analytics data helps businesses improve (anecdotal feedback)
- [ ] Zero payment disputes or errors
- [ ] Admin can process payment in < 5 minutes

---

## Security Considerations

### RLS Policies
- All tables have proper RLS policies preventing unauthorized access
- Business owners can only see their own data
- Community admins can only access data in their community
- Super admins have full access across communities

### Payment Data
- Payment proof images stored in private Supabase bucket (admin-only access)
- No credit card or sensitive payment info stored (manual processing)
- Audit trail: all payment records include `recorded_by` admin ID

### Analytics Tracking
- Rate limiting prevents spam (sessionStorage + server-side limits)
- No PII collected in analytics (only counts)
- Anonymous tracking (no user identification)

### File Uploads
- Banner images validated: max 5MB, only image MIME types allowed
- Stored in Supabase Storage with proper permissions
- Served via CDN (no direct filesystem access)

---

## Future Enhancements (Post-Phase 2)

### Payment Gateway Integration
- Wompi or MercadoPago integration for automated payments
- Subscription auto-renewal with payment failures handling
- Online payment confirmation (no manual admin entry)

### Advanced Analytics
- Hourly breakdown (not just daily)
- Geographic data (where visitors come from)
- Referral sources (Google, Facebook, direct)
- Conversion tracking (views → WhatsApp clicks → sales)
- Export to CSV/PDF

### Banner Ad Improvements
- Impression tracking (how many times each banner shown)
- Click tracking on banner images
- A/B testing for banner creatives
- Weighted rotation (pay more, get more impressions)
- Video banner support

### Notification System
- Email notifications when subscription requested/activated/expires
- WhatsApp notifications via Twilio
- Push notifications for payment reminders

### Self-Service Premium
- Business owners can pay online directly (no admin approval needed)
- Instant activation after successful payment
- Digital invoices emailed automatically

---

## Appendix: Database Diagram

```
┌─────────────────┐
│   businesses    │
│─────────────────│
│ is_featured     │◄────┐
│ total_views     │     │
│ total_clicks    │     │
└─────────────────┘     │
                        │
┌─────────────────────┐ │
│business_analytics   │ │
│  _daily             │─┘
│─────────────────────│
│ business_id (FK)    │
│ date                │
│ profile_views       │
│ whatsapp_clicks     │
└─────────────────────┘

┌─────────────────────┐     ┌────────────────────┐
│business_subscriptions│◄────┤subscription_payments│
│─────────────────────│     │────────────────────│
│ business_id (FK)    │     │ subscription_id(FK)│
│ status              │     │ amount             │
│ expires_at          │     │ payment_method     │
└─────────────────────┘     │ recorded_by (FK)   │
                            └────────────────────┘

┌─────────────────┐     ┌──────────────────┐
│   banner_ads    │◄────┤ banner_payments  │
│─────────────────│     │──────────────────│
│ business_id(FK) │     │ banner_id (FK)   │
│ placement       │     │ amount           │
│ status          │     │ recorded_by (FK) │
│ starts_at       │     └──────────────────┘
│ ends_at         │
└─────────────────┘

┌──────────────────┐     ┌──────────────────┐
│business_reviews  │◄────┤  review_flags    │
│──────────────────│     │──────────────────│
│ business_id (FK) │     │ review_id (FK)   │
│ user_id (FK)     │     │ flagged_by (FK)  │
│ rating           │     │ reason           │
│ review_text      │     │ status           │
└──────────────────┘     └──────────────────┘
```

---

## Document Status

**Approved By:** User
**Approval Date:** March 19, 2026
**Ready for Implementation:** ✅ Yes

**Next Step:** Invoke `writing-plans` skill to create detailed implementation plan.
