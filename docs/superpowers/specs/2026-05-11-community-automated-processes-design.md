# Design: Community Automated Processes (Phase 3)

**Date:** 2026-05-11
**Status:** Approved

---

## Scope

Implement all remaining automated/system processes for Phase 3 (Red Vecinal). Eight features across two delivery patterns: a new hourly cron and inline trigger-on-action hooks in existing API routes.

### Already implemented (no action needed)
- Manual alert expiration: `POST /api/admin/alerts/check-expired`
- Manual push dispatch: `POST /api/notifications/send`
- Job `is_filled` toggle: `POST /api/community/posts/[id]/toggle-filled`
- Daily subscription/banner cron: `GET /api/cron/daily-expiration`

---

## Architecture

Two delivery patterns:

**Pattern A — Hourly cron** (`GET /api/cron/community`)
All time-sensitive scheduled work in one route, protected by `CRON_SECRET` bearer token.

**Pattern B — Trigger-on-action**
Inline in existing API routes, fire-and-forget after the primary DB operation succeeds. Notification errors never fail the primary request.

---

## Feature 1: Hourly Community Cron

**Route:** `GET /api/cron/community`
**Schedule:** `0 * * * *` — added to `vercel.json` alongside the existing daily cron.

### Step 1 — Expire past events
- Query: `community_posts` where `type = 'event'`, `status = 'approved'`, `(metadata->>'date')::timestamptz < now()`
- Action: `UPDATE status = 'archived'`
- Silent — no notification

### Step 2 — Archive filled jobs
- Query: `community_posts` where `type = 'job'`, `status = 'approved'`, `(metadata->>'is_filled')::boolean = true`
- Action: `UPDATE status = 'archived'`
- Silent — author already marked it filled manually

### Step 3 — 24h event reminders
- Query: approved events where `(metadata->>'date')::timestamptz` falls in `[now() + 23h, now() + 25h]`
- Check `cron_reminder_logs` for existing `(post_id, '24h')` row — skip if found
- Send push to all community members: `"Mañana: {title}"` linking to `/{communitySlug}/community`
- Insert `cron_reminder_logs` row on success

### Step 4 — 1h event reminders
- Same logic, window: `[now() + 0h, now() + 2h]`, log type: `'1h'`
- Push payload: `"En 1 hora: {title}"`

### Response shape
```json
{
  "eventsExpired": 0,
  "jobsArchived": 0,
  "reminders24hSent": 0,
  "reminders1hSent": 0,
  "timestamp": "ISO string"
}
```

### New DB table: `cron_reminder_logs`
```sql
CREATE TABLE cron_reminder_logs (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id  uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  type     text NOT NULL CHECK (type IN ('24h', '1h')),
  sent_at  timestamptz DEFAULT now(),
  UNIQUE(post_id, type)
);
```
The `UNIQUE(post_id, type)` constraint is the duplicate-prevention guarantee at the DB level.

---

## Feature 2: Alert Notifications (Email + Push + WhatsApp)

**Trigger:** After successful insert in `POST /api/community/alerts`
**Audience:** All profiles in the community

### Orchestration — `lib/notifications/community.ts`
```ts
sendCommunityAlertNotifications(communityId: string, alert: {
  title: string
  description: string | null
  type: string
  severity: string
  communitySlug: string
}): void  // fire-and-forget, never throws
```
Fans out to three independent fire-and-forget calls. Each catches its own errors and logs them. One channel failure never blocks the others.

### Email
- Function: `sendAlertNotificationEmail(email, alert)` added to `lib/email/resend.ts`
- Subject: `"⚠️ Alerta en tu comunidad: {title}"`
- HTML: alert type badge, severity color, description, link to community page
- Sent individually per user (not BCC) for deliverability
- Batched in groups of 50 with 100ms delay between batches to respect Resend rate limits
- User emails fetched via `adminClient.auth.admin.listUsers()`

### Push
- Reuses push logic extracted from `POST /api/notifications/send` into a shared helper
- Payload links to `/{communitySlug}/community`
- Invalid subscriptions (410) are cleaned up automatically

### WhatsApp (Twilio)
- Client: `lib/twilio.ts` — singleton Twilio client + `sendWhatsAppMessage(to: string, body: string)`
- Message template:
  ```
  🚨 *Alerta BarrioRed*: {title}
  {description}
  Ver más: barriored.co/{communitySlug}/community
  ```
- Phone normalization: `3001234567` → `+573001234567` (Colombian numbers, `+57` prefix)
- Recipient phones come from `profiles.phone` for the community
- Env vars: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` (e.g. `whatsapp:+14155238886`)

---

## Feature 3: Spam/Profanity Moderation

**Trigger:** `POST /api/community/posts` — synchronous check before DB insert

### `lib/moderation/keywords.ts`
- Exports ~80–120 curated Spanish/Colombian slang terms
- Normalization before matching: lowercase, remove accents (`ó → o`), collapse repeated chars (`putttta → puta`)
- Whole-word matching via word-boundary regex to avoid false positives
- Check function:
  ```ts
  checkContent(title: string, content: string): { flagged: boolean; matches: string[] }
  ```

### Three-tier response

| Tier | Condition | Action |
|------|-----------|--------|
| Clean | 0 matches | Insert with `status = 'pending'` (normal flow) |
| Soft flag | 1 match | Insert with `status = 'pending'`, `moderation_flag = true` |
| Hard block | 2+ matches | Return `400`: `"Tu publicación contiene contenido no permitido"` |

### New column: `community_posts.moderation_flag`
```sql
ALTER TABLE community_posts ADD COLUMN moderation_flag boolean DEFAULT false;
CREATE INDEX idx_community_posts_moderation_flag ON community_posts(moderation_flag) WHERE moderation_flag = true;
```
Allows admins to filter soft-flagged posts in the moderation panel without changing the existing approval flow.

---

## Feature 4: Admin Notification on Flagged Content

**Trigger:** Two entry points:
1. New `POST /api/community/posts/[id]/flag` route (community post flagging)
2. Existing `POST /api/reviews/[reviewId]/flag` — add notification call after existing insert

**Admin audience:** Profiles in the affected community with `role = 'admin'` or `is_super_admin = true`

### New route: `POST /api/community/posts/[id]/flag`
- Any authenticated community member can flag
- Request body: `{ reason: string }`
- Inserts into existing `community_reports` table
- Checks existing report count for same `reported_entity_id` — only notifies admins on **first** flag (prevents flooding)
- Fires `sendAdminFlaggedContentNotification` fire-and-forget

### Notification helper — `lib/notifications/community.ts`
```ts
sendAdminFlaggedContentNotification(communityId: string, content: {
  type: 'post' | 'review'
  title: string
  reportedBy: string
  reason: string
  adminPanelUrl: string
}): void  // fire-and-forget
```

### Email
- Function: `sendAdminFlaggedContentEmail(adminEmail, content)` added to `lib/email/resend.ts`
- Subject: `"🚩 Contenido reportado en tu comunidad"`
- Body: content type, title/excerpt, reason, direct link to admin moderation panel

### Push
- Payload: `"Nuevo reporte: {contentTitle}"`
- Links to `/admin/community-posts` (posts) or `/admin/review-flags` (reviews)
- Sent to admin push subscriptions only

---

## New Infrastructure Summary

### Files to create
| File | Purpose |
|------|---------|
| `app/api/cron/community/route.ts` | Hourly cron handler |
| `app/api/community/posts/[id]/flag/route.ts` | Community post flagging endpoint |
| `lib/notifications/community.ts` | Shared notification orchestration |
| `lib/moderation/keywords.ts` | Spanish keyword blocklist + check function |
| `lib/twilio.ts` | Twilio client + WhatsApp helper |
| `supabase/migrations/20260511000000_community_automation.sql` | `cron_reminder_logs` table + `moderation_flag` column |

### Files to modify
| File | Change |
|------|--------|
| `vercel.json` | Add hourly cron entry |
| `app/api/community/alerts/route.ts` | Add `sendCommunityAlertNotifications` call after insert |
| `app/api/community/posts/route.ts` | Add `checkContent` before insert |
| `app/api/reviews/[reviewId]/flag/route.ts` | Add `sendAdminFlaggedContentNotification` after insert |
| `app/api/notifications/send/route.ts` | Extract push logic into shared helper |
| `lib/email/resend.ts` | Add `sendAlertNotificationEmail`, `sendAdminFlaggedContentEmail` |

### Environment variables to add
| Variable | Purpose |
|----------|---------|
| `TWILIO_ACCOUNT_SID` | Twilio authentication |
| `TWILIO_AUTH_TOKEN` | Twilio authentication |
| `TWILIO_WHATSAPP_FROM` | Sender number (e.g. `whatsapp:+14155238886`) |

### Dependencies to install
```bash
npm install twilio
```

---

## Out of Scope
- WhatsApp message template pre-approval with Meta (required for production; sandbox works for testing)
- Email unsubscribe flow for community notifications
- Per-user notification preferences (opt-out per channel)
- Admin UI for viewing cron job history
