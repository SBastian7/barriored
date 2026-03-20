# Cron Job Testing Guide

## Daily Expiration Cron Job

The daily expiration job automatically expires subscriptions and banners that have passed their expiration dates.

### Local Testing

#### Prerequisites
1. Set `CRON_SECRET` in `.env.local`
2. Ensure local development server is running: `npm run dev`

#### Step 1: Create Test Data

Insert expired test data into the database using Supabase SQL Editor or your preferred method:

**Expired Subscription:**
```sql
-- Create a test subscription that expired yesterday
INSERT INTO business_subscriptions (
  business_id,
  status,
  requested_at,
  activated_at,
  expires_at
) VALUES (
  '<your-test-business-id>',
  'active',
  NOW() - INTERVAL '30 days',
  NOW() - INTERVAL '30 days',
  NOW() - INTERVAL '1 day'
);

-- Ensure the business is marked as featured
UPDATE businesses
SET is_featured = true
WHERE id = '<your-test-business-id>';
```

**Expired Banner:**
```sql
-- Create a test banner that expired yesterday
INSERT INTO banner_ads (
  business_id,
  community_id,
  title,
  image_url,
  placement,
  status,
  starts_at,
  ends_at,
  requested_at
) VALUES (
  '<your-test-business-id>',
  '<your-community-id>',
  'Test Banner - Expired',
  'https://placehold.co/1200x400',
  'homepage',
  'active',
  NOW() - INTERVAL '7 days',
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '7 days'
);
```

#### Step 2: Run the Cron Job

Execute the cron endpoint manually with your CRON_SECRET:

```bash
curl -X GET http://localhost:3000/api/cron/daily-expiration \
  -H "Authorization: Bearer your_secure_random_cron_secret_here_change_in_production"
```

**Expected Response:**
```json
{
  "success": true,
  "expiredSubscriptions": 1,
  "expiredBanners": 1,
  "timestamp": "2026-03-20T12:00:00.000Z"
}
```

#### Step 3: Verify Changes

1. **Check Subscription Status:**
```sql
SELECT
  id,
  status,
  cancelled_at,
  cancellation_reason
FROM business_subscriptions
WHERE business_id = '<your-test-business-id>';
```

Expected: `status = 'cancelled'`, `cancellation_reason = 'Expirado por falta de pago'`

2. **Check Business Featured Status:**
```sql
SELECT id, name, is_featured
FROM businesses
WHERE id = '<your-test-business-id>';
```

Expected: `is_featured = false`

3. **Check Banner Status:**
```sql
SELECT id, title, status
FROM banner_ads
WHERE business_id = '<your-test-business-id>';
```

Expected: `status = 'expired'`

### Production Testing

In production, Vercel Cron will automatically call the endpoint daily at 00:00 UTC.

**Monitor Vercel Logs:**
- Go to your Vercel project dashboard
- Navigate to "Cron Jobs" or "Logs"
- Check for daily execution logs at 00:00 UTC

**Manual Trigger in Production:**
```bash
curl -X GET https://your-domain.com/api/cron/daily-expiration \
  -H "Authorization: Bearer YOUR_PRODUCTION_CRON_SECRET"
```

⚠️ **Important:** Only use this for testing/debugging. The cron job runs automatically.

### Security Notes

- **NEVER** commit `CRON_SECRET` to git
- Use different secrets for local development and production
- Set production `CRON_SECRET` in Vercel environment variables
- The endpoint returns 401 Unauthorized if the secret is invalid

### Troubleshooting

**Issue:** 401 Unauthorized
**Solution:** Verify `CRON_SECRET` matches in `.env.local` and your curl command

**Issue:** No records expired
**Solution:** Ensure test data has `expires_at` or `ends_at` in the past and `status = 'active'`

**Issue:** Cron not running in production
**Solution:** Check Vercel Cron Jobs dashboard, verify `vercel.json` is deployed

### Cron Schedule

Current schedule: `0 0 * * *` (Daily at 00:00 UTC / Midnight)

To change, update `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/daily-expiration",
    "schedule": "0 0 * * *"  // cron expression
  }]
}
```

**Common Schedules:**
- `0 0 * * *` - Daily at midnight
- `0 */6 * * *` - Every 6 hours
- `0 0 * * 0` - Weekly on Sunday at midnight
- `0 0 1 * *` - Monthly on the 1st at midnight
