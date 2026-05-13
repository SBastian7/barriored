# Marketplace Automation — Design Doc
**Date:** 2026-05-11  
**Status:** Approved

## Problem

Five marketplace automation features need implementation. None are wired yet despite the `classifieds` schema already supporting most of them via `archived_at`, `sold_at`, `flagged_at`, `last_activity_at`.

## Features

| # | Feature | Trigger |
|---|---------|---------|
| 1 | Prohibited items block | At classified creation/update |
| 2 | Duplicate detection | At classified creation |
| 3 | Sold notification (email + push) | When seller or admin marks as sold |
| 4 | Auto-expire after 30 days | Daily cron |
| 5 | 3-day expiry reminder email | Daily cron |

## Approach: Real-time hooks + extend existing daily cron

Features 1–3 fire at the point of action (server actions / API routes). Features 4–5 extend the existing `daily-expiration` cron that already runs at midnight UTC.

No new cron route is needed. No new Vercel cron slots consumed.

## DB Migration

Add one column to `classifieds`:

```sql
ALTER TABLE classifieds ADD COLUMN renewal_reminder_sent_at TIMESTAMPTZ;
```

**Purpose:** deduplication guard for the 3-day reminder — prevents the cron from sending the same reminder email twice per listing cycle.

Reset to `NULL` when a classified is reactivated (`reactivateClassifiedAction`).

## Feature Details

### 1. Prohibited Items (Hard Block)

**File:** `lib/moderation/marketplace-keywords.ts` (new)

Keyword list organized by category (drugs, weapons, stolen goods, explicit content) in Colombian Spanish context.

**Integration:**
- `app/actions/classified-actions.ts` → `createClassifiedAction` and `updateClassifiedAction`
- Check: `title + ' ' + description` lowercased against each keyword
- On match: return `{ success: false, error: 'Contenido no permitido: "${term}"' }`

### 2. Duplicate Detection

**Integration:** `createClassifiedAction` only (updates to existing listing are fine)

After validation, before insert:
```sql
SELECT id FROM classifieds
WHERE user_id = $userId AND status = 'active' AND lower(title) = lower($newTitle)
LIMIT 1
```
On match: return `{ success: false, error: 'Ya tienes un clasificado activo con ese título.' }`

### 3. Sold Notification

**New file:** `lib/notifications/marketplace.ts`

```ts
export async function notifyClassifiedSold(classifiedId: string, sellerId: string)
```

Steps inside:
1. Fetch seller email via `adminClient.auth.admin.getUserById(sellerId)`
2. Fetch classified title for email subject
3. Call `sendClassifiedSoldEmail(email, title, communitySlug)` → Resend
4. Fetch seller push subscriptions → call `sendPushToUsers([sellerId], { ... })`

**New email function:** `sendClassifiedSoldEmail` in `lib/email/resend.ts`

**Integration points:**
- `markAsSoldAction` in `app/actions/classified-actions.ts` — after successful DB update
- Admin PATCH route `app/api/admin/marketplace/[id]/route.ts` — when `status === 'sold'` in update payload

### 4. Auto-Expire (30 days from `last_activity_at`)

**Integration:** Extend `app/api/cron/daily-expiration/route.ts` as Step 5

```sql
UPDATE classifieds
SET status = 'archived', archived_at = now(), updated_at = now()
WHERE status = 'active' AND last_activity_at < now() - interval '30 days'
RETURNING id
```

### 5. 3-Day Expiry Reminder

**Integration:** Extend `app/api/cron/daily-expiration/route.ts` as Step 6

Window: `last_activity_at` between 27 and 28 days ago (one cron-day slot before expiry).  
Guard: `renewal_reminder_sent_at IS NULL`

For each match:
1. Fetch owner email via adminClient
2. Call `sendClassifiedExpiryReminderEmail(email, title, communitySlug)`
3. Set `renewal_reminder_sent_at = now()` on the classified

**New email function:** `sendClassifiedExpiryReminderEmail` in `lib/email/resend.ts`

## Files Changed / Created

| File | Change |
|------|--------|
| `supabase/migrations/20260511001000_marketplace_automation.sql` | Add `renewal_reminder_sent_at` column |
| `lib/moderation/marketplace-keywords.ts` | New — prohibited keyword list + check function |
| `lib/notifications/marketplace.ts` | New — `notifyClassifiedSold` helper |
| `lib/email/resend.ts` | Add `sendClassifiedSoldEmail`, `sendClassifiedExpiryReminderEmail` |
| `app/actions/classified-actions.ts` | Add keyword check, duplicate check, sold notification |
| `app/api/admin/marketplace/[id]/route.ts` | Add sold notification in PATCH |
| `app/api/cron/daily-expiration/route.ts` | Add Steps 5 (auto-expire) and 6 (reminder) |
