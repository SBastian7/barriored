# End-to-End Testing: Analytics Flow

## Overview
This guide tests the complete analytics tracking system for business profile views and WhatsApp clicks.

## Prerequisites
- Local development environment running (`npm run dev`)
- At least one approved business in the database
- Access to Supabase dashboard for database verification

## Test Procedure

### Test 1: Profile View Tracking

#### Step 1: Clear SessionStorage
```javascript
// In browser DevTools console:
sessionStorage.clear()
```

#### Step 2: Visit Business Profile
1. Navigate to any business profile: `http://localhost:3000/parqueindustrial/business/[business-slug]`
2. Page should load successfully
3. No visible tracking indicators (tracking is silent)

#### Step 3: Verify SessionStorage Flag
```javascript
// In browser DevTools console:
sessionStorage.getItem('viewed_[business-id]')
// Expected: "true"
```

#### Step 4: Check Database - Total Views
```sql
SELECT
  id,
  name,
  total_profile_views,
  last_analytics_update
FROM businesses
WHERE slug = '[business-slug]';
```
**Expected:**
- `total_profile_views` incremented by 1
- `last_analytics_update` updated to current timestamp

#### Step 5: Check Database - Daily Snapshot
```sql
SELECT
  date,
  profile_views,
  whatsapp_clicks
FROM business_analytics_daily
WHERE business_id = '[business-id]'
  AND date = CURRENT_DATE;
```
**Expected:**
- Record exists for today's date
- `profile_views` = 1 (or incremented by 1)

#### Step 6: Verify No Duplicate Tracking
1. Refresh the business profile page (F5)
2. Check sessionStorage - flag should still be set
3. Check database - `total_profile_views` should NOT increment
4. Expected behavior: Same session prevents duplicate tracking

#### Step 7: Test New Session Tracking
1. Open a new incognito/private browser window
2. Visit the same business profile
3. Check database - `total_profile_views` should increment by 1
4. Expected: New session creates new tracking event

---

### Test 2: WhatsApp Click Tracking

#### Step 1: Click WhatsApp Button
1. On the business profile page, scroll to the fixed WhatsApp button (bottom right)
2. Click the button
3. WhatsApp should open in new tab/window

#### Step 2: Check Database - WhatsApp Clicks
```sql
SELECT
  id,
  name,
  total_whatsapp_clicks
FROM businesses
WHERE slug = '[business-slug]';
```
**Expected:**
- `total_whatsapp_clicks` incremented by 1

#### Step 3: Check Daily Snapshot
```sql
SELECT
  date,
  profile_views,
  whatsapp_clicks
FROM business_analytics_daily
WHERE business_id = '[business-id]'
  AND date = CURRENT_DATE;
```
**Expected:**
- `whatsapp_clicks` incremented by 1

---

### Test 3: Merchant Dashboard Analytics Widget

#### Step 1: Login as Business Owner
1. Navigate to `/auth/login`
2. Login with the business owner's account
3. Navigate to `/dashboard`

#### Step 2: Verify Analytics Widget Display
**Check for:**
- Widget titled "Análisis" with BarChart3 icon
- Total profile views displayed
- Total WhatsApp clicks displayed
- Last 7 days chart showing daily breakdown
- Data matches database totals

#### Step 3: Verify Chart Data
```sql
SELECT
  date,
  profile_views,
  whatsapp_clicks
FROM business_analytics_daily
WHERE business_id = '[business-id]'
  AND date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY date DESC;
```
**Expected:**
- Chart displays correct data points for last 7 days
- Today's data is included
- Chart shows both profile views and WhatsApp clicks lines

---

### Test 4: Multiple Businesses

#### Step 1: Track Multiple Businesses
1. Visit Business A profile
2. Visit Business B profile
3. Visit Business A again (same session)

#### Step 2: Verify Isolation
**Check:**
- Business A tracked once (sessionStorage prevents duplicate)
- Business B tracked once
- Each business has separate analytics records
- No cross-contamination between businesses

---

## Expected Results Summary

✅ **Profile View Tracking:**
- First visit increments `total_profile_views`
- SessionStorage prevents duplicate tracking in same session
- Daily snapshot created/updated for today's date
- New session allows new tracking event

✅ **WhatsApp Click Tracking:**
- Each click increments `total_whatsapp_clicks`
- Daily snapshot records clicks
- Clicks tracked independently of profile views

✅ **Merchant Dashboard:**
- Analytics widget displays current totals
- Chart shows last 7 days of data
- Data matches database exactly
- Widget only visible to business owners

✅ **Data Integrity:**
- Each business has isolated analytics
- Rolling counters (`total_*`) match sum of daily snapshots
- `last_analytics_update` timestamp accurate

---

## Troubleshooting

**Issue:** Profile views not incrementing
**Check:**
1. `AnalyticsTracker` component rendered on profile page
2. `/api/analytics/track` endpoint returns 200 OK
3. Browser console for JavaScript errors
4. SessionStorage not blocking (clear and retry)

**Issue:** Daily snapshot not created
**Check:**
1. Date comparison in SQL (`CURRENT_DATE`)
2. Upsert logic in API route
3. Database permissions (RLS policies)

**Issue:** Merchant dashboard shows 0
**Check:**
1. Logged in as correct business owner
2. Business ID matches in query
3. Business has `total_profile_views` > 0 in database

---

## Test Data Cleanup

After testing, optionally reset analytics:

```sql
-- Reset totals
UPDATE businesses
SET
  total_profile_views = 0,
  total_whatsapp_clicks = 0,
  last_analytics_update = NULL
WHERE id = '[test-business-id]';

-- Delete daily snapshots
DELETE FROM business_analytics_daily
WHERE business_id = '[test-business-id]';
```

---

## Automation Potential

These tests can be automated using:
- **Playwright/Cypress:** Browser automation for E2E flows
- **Jest:** Unit tests for analytics API route
- **Supabase Test Helpers:** Database state verification

See `docs/testing/automated-tests.md` for automation setup (if exists).
