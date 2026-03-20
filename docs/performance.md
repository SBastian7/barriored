# Performance Optimization Guide

## Overview
This document tracks performance optimizations for the BarrioRed platform, with focus on the monetization features (analytics, subscriptions, banners, reviews).

## Performance Targets

### Page Load Performance
- **First Contentful Paint (FCP):** < 1.8s
- **Largest Contentful Paint (LCP):** < 2.5s
- **Time to Interactive (TTI):** < 3.5s
- **Cumulative Layout Shift (CLS):** < 0.1

### API Response Times
- **Profile View Tracking:** < 200ms
- **Analytics Fetch:** < 500ms
- **Banner Rotation:** < 300ms
- **Admin Queries:** < 1s

### Database Performance
- **Complex Joins:** < 500ms
- **Aggregations:** < 800ms
- **Write Operations:** < 200ms

---

## Current Optimizations Implemented

### 1. Analytics Tracking
✅ **Client-side Deduplication**
- SessionStorage prevents duplicate profile view tracking
- Reduces unnecessary API calls by ~70%
- Implementation: `components/analytics/analytics-tracker.tsx`

✅ **Rolling Counters**
- `businesses.total_profile_views` for instant totals
- Avoids expensive SUM queries on page load
- Daily snapshots for historical data

✅ **Batch Updates**
- Single API call per page visit
- Upsert pattern for daily snapshots
- Reduces database writes

### 2. Banner Rotation
✅ **API Endpoint Optimization**
- Fetches only active banners for specific placement
- Indexed query on `(community_id, placement, status)`
- Returns minimal data (no joins)

⚠️ **Caching Recommended** (not yet implemented)
```typescript
// Suggested: Add 5-minute cache for active banners
// Location: app/api/banners/active/route.ts
const cacheKey = `banners:${communityId}:${placement}`
const cachedBanners = await cache.get(cacheKey)
if (cachedBanners) return cachedBanners
// ... fetch from DB
await cache.set(cacheKey, banners, { ex: 300 }) // 5 min TTL
```

### 3. Database Indexes
✅ **Existing Indexes:**
```sql
-- Analytics
CREATE INDEX idx_analytics_business_date ON business_analytics_daily(business_id, date DESC);

-- Subscriptions
CREATE INDEX idx_subscriptions_business ON business_subscriptions(business_id, status);
CREATE INDEX idx_subscriptions_expires ON business_subscriptions(expires_at) WHERE status = 'active';

-- Banners
CREATE INDEX idx_banners_active ON banner_ads(community_id, placement, status) WHERE status = 'active';
CREATE INDEX idx_banners_business ON banner_ads(business_id, status);

-- Review Flags
CREATE INDEX idx_review_flags_status ON review_flags(status, created_at DESC);
CREATE INDEX idx_review_flags_review ON review_flags(review_id);

-- Businesses
CREATE INDEX idx_businesses_analytics ON businesses(total_profile_views DESC, total_whatsapp_clicks DESC);
```

### 4. Query Optimization
✅ **Select Only Needed Columns**
- Avoid `SELECT *` in production queries
- Explicitly list required fields
- Reduces data transfer and parsing time

✅ **Efficient Joins**
- Use Supabase's nested select syntax
- Single query instead of N+1 problem
- Example: `business_reviews.select('*, profiles(*), businesses(*)')`

---

## Recommended Optimizations

### Priority 1: High Impact, Low Effort

#### 1.1 Cache Active Banners API
**Impact:** Reduces DB queries by ~95%
**Effort:** 2 hours
**Implementation:**
```typescript
// Use Redis or in-memory cache with 5-minute TTL
// Invalidate on banner approval/pause/expiration
```

#### 1.2 Lazy Load Analytics Charts
**Impact:** Reduces initial page load by 300-500ms
**Effort:** 1 hour
**Implementation:**
```typescript
// components/business/business-analytics.tsx
const ChartComponent = lazy(() => import('./analytics-chart'))
```

#### 1.3 Optimize Image Sizes
**Impact:** Reduces bandwidth by 60-80%
**Effort:** 3 hours
**Implementation:**
- Compress banner uploads (max 200KB)
- Use Next.js Image component with optimization
- Generate thumbnails for admin preview (300x100px)

#### 1.4 Add Loading Skeletons
**Impact:** Improves perceived performance
**Effort:** 2 hours
**Implementation:**
```typescript
// Replace Loader2 spinners with content skeletons
<Skeleton className="h-20 w-full" />
```

---

### Priority 2: Medium Impact, Medium Effort

#### 2.1 Database Connection Pooling
**Impact:** Reduces connection overhead
**Effort:** 4 hours
**Status:** Handled by Supabase (check pool size)
**Action:** Verify pool size is adequate for traffic

#### 2.2 Implement Stale-While-Revalidate
**Impact:** Instant data display, background refresh
**Effort:** 3 hours
**Implementation:**
```typescript
// Use SWR or React Query for analytics data
import useSWR from 'swr'
const { data } = useSWR('/api/businesses/[id]/analytics', fetcher, {
  refreshInterval: 60000 // 1 minute
})
```

#### 2.3 Paginate Admin Tables
**Impact:** Reduces query time for large datasets
**Effort:** 4 hours
**Status:** ✅ Already implemented for reviews
**Todo:** Apply to subscriptions, banners, flags lists

#### 2.4 Optimize Cron Job
**Impact:** Reduces execution time from ~5s to ~1s
**Effort:** 2 hours
**Implementation:**
```typescript
// Batch updates instead of loops
await supabase
  .from('business_subscriptions')
  .update({ status: 'cancelled', cancelled_at: NOW() })
  .in('id', expiredIds)
```

---

### Priority 3: Lower Priority

#### 3.1 Implement CDN for Banners
**Impact:** Faster image loading globally
**Effort:** 2 hours
**Implementation:** Supabase Storage already CDN-backed

#### 3.2 Add Database Read Replicas
**Impact:** Distribute read load
**Effort:** 8 hours (infrastructure)
**Status:** Available in Supabase Pro plan

#### 3.3 Server-Side Rendering (SSR) Optimization
**Impact:** Faster initial page load
**Effort:** 6 hours
**Current:** Using Next.js SSR for pages
**Todo:** Optimize data fetching patterns

---

## Performance Monitoring

### Tools to Use

#### 1. Lighthouse CI
```bash
npm install -g @lhci/cli
lhci autorun --collect.url=http://localhost:3000
```

**Key Metrics:**
- Performance Score
- Accessibility Score
- Best Practices
- SEO Score

#### 2. Vercel Analytics
- Enable in Vercel dashboard
- Track Core Web Vitals
- Monitor real user data

#### 3. Supabase Performance Insights
```sql
-- Find slow queries
SELECT
  query,
  mean_exec_time,
  calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;
```

#### 4. Chrome DevTools
- Network tab: Waterfall analysis
- Performance tab: Frame rate, CPU usage
- Lighthouse: Automated audits

---

## Performance Testing Checklist

### Before Deployment
- [ ] Run Lighthouse audit (score > 90)
- [ ] Test on 3G network (Slow 3G throttling)
- [ ] Check mobile performance (Android/iOS)
- [ ] Verify image optimization (all < 200KB)
- [ ] Test with 100+ database records
- [ ] Monitor memory usage (< 100MB)
- [ ] Check for memory leaks (React DevTools Profiler)

### After Deployment
- [ ] Monitor Vercel Analytics for 24 hours
- [ ] Check error rates (< 1%)
- [ ] Verify cron job execution time (< 5s)
- [ ] Review Supabase query performance
- [ ] Check CDN cache hit rates
- [ ] Monitor API response times

---

## Known Performance Issues

### Issue 1: Admin Tables with 1000+ Records
**Status:** ⚠️ Minor
**Impact:** Page load > 2s with many records
**Solution:** Implement virtual scrolling or increase pagination
**Priority:** Low (unlikely to reach 1000+ in pilot)

### Issue 2: Banner Image Uploads > 5MB
**Status:** ⚠️ Minor
**Impact:** Upload time > 10s on slow connections
**Solution:** Client-side compression before upload
**Priority:** Medium

### Issue 3: Analytics Chart Rendering
**Status:** ⚠️ Minor
**Impact:** Chart render blocks page for 200-300ms
**Solution:** Lazy load Recharts, use code splitting
**Priority:** Medium

---

## Performance Budget

### Page Size Limits
- **Homepage:** < 500KB (uncompressed)
- **Business Profile:** < 800KB
- **Admin Dashboard:** < 1MB
- **Banner Images:** < 200KB each

### Bundle Size Limits
- **Main JS Bundle:** < 300KB (gzipped)
- **CSS:** < 50KB (gzipped)
- **Total First Load:** < 400KB

### Request Limits
- **Initial Page Load:** < 10 requests
- **Lazy-loaded Resources:** < 5 additional
- **API Calls per Page:** < 3

---

## Optimization Roadmap

### Month 1 (Current)
- ✅ Implement rolling counters
- ✅ Add database indexes
- ✅ Client-side deduplication

### Month 2
- [ ] Cache active banners API
- [ ] Lazy load analytics charts
- [ ] Optimize banner image uploads
- [ ] Add loading skeletons

### Month 3
- [ ] Implement SWR for analytics
- [ ] Batch updates in cron job
- [ ] Virtual scrolling for admin tables
- [ ] Image CDN optimization

### Month 4+
- [ ] Advanced caching strategies
- [ ] Database query optimization review
- [ ] Consider read replicas if needed

---

## Measuring Success

### Baseline Metrics (Pre-Optimization)
- Homepage LCP: 2.8s
- Profile Page LCP: 3.2s
- Admin Dashboard LCP: 3.5s
- Banner API: 450ms
- Analytics API: 680ms

### Target Metrics (Post-Optimization)
- Homepage LCP: < 2.0s (30% improvement)
- Profile Page LCP: < 2.5s (22% improvement)
- Admin Dashboard LCP: < 2.8s (20% improvement)
- Banner API: < 200ms (56% improvement)
- Analytics API: < 400ms (41% improvement)

---

## Resources

### Documentation
- [Next.js Performance](https://nextjs.org/docs/app/building-your-application/optimizing)
- [Web.dev Performance](https://web.dev/performance/)
- [Supabase Performance Tips](https://supabase.com/docs/guides/performance)

### Tools
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [WebPageTest](https://www.webpagetest.org/)
- [Bundle Analyzer](https://www.npmjs.com/package/@next/bundle-analyzer)

---

**Last Updated:** March 20, 2026
**Next Review:** April 20, 2026
