import type { Database } from './supabase'

// Re-export Database type for backward compatibility
export type { Database }

// ============================================================================
// Helper Types
// ============================================================================

// Marketplace (Classifieds)
export type ClassifiedWithRelations = Database['public']['Tables']['classifieds']['Row'] & {
  profiles: {
    full_name: string | null
    avatar_url: string | null
  } | null
  marketplace_categories: {
    name: string
    slug: string
    icon: string
  } | null
  communities: {
    name: string
    slug: string
  } | null
}

// Reviews & Ratings
export type Review = Database['public']['Tables']['business_reviews']['Row']
export type ReviewInsert = Database['public']['Tables']['business_reviews']['Insert']
export type ReviewUpdate = Database['public']['Tables']['business_reviews']['Update']

export type ReviewResponse = Database['public']['Tables']['business_review_responses']['Row']

export type ReviewWithRelations = Review & {
  user: {
    id: string
    full_name: string | null
    avatar_url: string | null
  } | null
  response: ReviewResponse | null
}

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
