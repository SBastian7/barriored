# Design: Subscription Reminder & Expiration Warning Emails

**Date:** 2026-04-14
**Phase:** Phase 2 — Monetization

---

## Scope

Add pre-expiry email notifications to the existing daily cron job. Four of the six requested automated processes are already fully implemented (analytics tracking, view counts, WhatsApp click tracking, chart data). Only two remain:

- Send subscription renewal reminders (7 days before expiry)
- Send subscription expiration warnings (1–3 days before expiry)

---

## Already Implemented (no action needed)

| Feature | Where |
|---|---|
| Calculate business analytics metrics | `increment_business_analytics` RPC + `/api/analytics/track` |
| Update view counts in real-time | `AnalyticsTracker` component on business profile page |
| Track WhatsApp button clicks | `trackWhatsAppClick()` in `WhatsAppButton` |
| Generate analytics charts data | `/api/businesses/[id]/analytics` + `BusinessAnalytics` dashboard widget |

---

## Confirmed Schema

**`business_subscriptions`:** `id`, `business_id`, `status`, `requested_at`, `activated_at`, `cancelled_at`, `expires_at`, `cancellation_reason`, `notes`, `created_at`, `updated_at`

**`businesses`:** includes `owner_id`, `name`, `total_profile_views`, `total_whatsapp_clicks`, `last_analytics_update`

**`profiles`:** no email column — owner emails must be fetched via `supabase.auth.admin.getUserById(owner_id)`

**Existing RPCs:** `increment_business_analytics`, `increment_daily_analytics`

---

## Deduplication Strategy: Date Windows

No new DB columns needed. The cron runs daily; queries use time windows wide enough to tolerate a missed run.

| Email | Window | Query condition |
|---|---|---|
| Renewal reminder | 6–8 days before expiry | `expires_at BETWEEN now() + interval '6 days' AND now() + interval '8 days'` |
| Expiration warning | 1–3 days before expiry | `expires_at BETWEEN now() + interval '1 day' AND now() + interval '3 days'` |

Both target `status = 'active'` only.

Acceptable side effect: if cron runs on consecutive days within the warning window, the warning email may be sent up to 3 times. Acceptable for MVP.

---

## Files to Change

### 1. `lib/email/resend.ts` — add two functions

**`sendSubscriptionRenewalReminderEmail(ownerEmail, businessName, expiresAt, daysLeft)`**
Subject: `Tu suscripción Premium de "{businessName}" vence en {daysLeft} días — BarrioRed`
Body: Inform about upcoming expiry, link to dashboard to arrange renewal.

**`sendSubscriptionExpirationWarningEmail(ownerEmail, businessName, expiresAt)`**
Subject: `⚠️ Tu suscripción Premium de "{businessName}" vence mañana — BarrioRed`
Body: Urgent warning, expiry date, link to dashboard.

### 2. `app/api/cron/daily-expiration/route.ts` — extend handler

Add two steps before the existing expiration logic:

```
Step 1: Query active subs with expires_at in [now+6d, now+8d] → send renewal reminder
Step 2: Query active subs with expires_at in [now+1d, now+3d] → send expiration warning
Step 3: Expire subs past expires_at (existing)
Step 4: Expire banners past ends_at (existing)
```

For each subscription found in steps 1 and 2:
1. Fetch `business_id` → join to `businesses` to get `owner_id` and `name`
2. Call `adminClient.auth.admin.getUserById(owner_id)` to get owner email
3. Send email fire-and-forget (`.catch(console.error)`)

Use `createAdminClient()` (already available in the project) for auth admin calls.

### Response shape (extended)

```json
{
  "success": true,
  "renewalRemindersSent": 2,
  "expirationWarningsSent": 1,
  "expiredSubscriptions": 0,
  "expiredBanners": 0,
  "timestamp": "2026-04-14T..."
}
```

---

## Error Handling

- Email failures are non-blocking — always `.catch(console.error)`
- If `getUserById` fails for a subscription, log and skip (don't abort the full cron run)
- Cron still returns `success: true` even if some emails failed

---

## Out of Scope

- Tracking which emails were sent (no new DB columns for MVP)
- Unsubscribe links
- Email templates beyond plain HTML strings
