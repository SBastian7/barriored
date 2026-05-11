# Design: System / Automated Processes (Phase 2)

**Date:** 2026-05-11
**Approach:** Approach A — Native Next.js + extend existing crons. No new infra.

---

## Already Implemented (no work needed)

- Sitemap.xml — `app/sitemap.ts`
- WebP image generation — `lib/image/process.ts` + Sharp in upload routes
- Error logging — `lib/logger.ts` + `components/shared/error-boundary.tsx` wired in `app/layout.tsx`
- Service worker (PWA) — Serwist-based `public/sw.js` + `ServiceWorkerRegister`
- Vercel crons — `daily-expiration` (midnight daily) + `community` (hourly)
- Transactional emails — `lib/email/resend.ts`
- Rate limiting — deferred (skipped by choice)

---

## Section 1: Automation (Cron Extensions)

### 1a. Weekly Digest Email (new cron)

**New file:** `app/api/cron/weekly-digest/route.ts`

**Schedule:** Every Monday 14:00 UTC (9am Colombia) — add to `vercel.json`:
```json
{ "path": "/api/cron/weekly-digest", "schedule": "0 14 * * 1" }
```

**Logic per community:**
- New approved businesses last 7 days (`businesses` where `status='approved'` and `created_at > 7 days ago`)
- New community posts last 7 days (`community_posts` where `status='approved'` and `created_at > 7 days ago`)
- New user registrations last 7 days (`profiles` where `created_at > 7 days ago` and `community_id = X`)
- Active classifieds count (`classifieds` where `status='active'`)
- Error count last 7 days (`error_logs` where `created_at > 7 days ago` and `community_id = X`)

**Recipients:** All super admins + community admins for each community.

**New email function:** `sendWeeklyDigestEmail(email, communityName, data)` in `lib/email/resend.ts`

---

### 1b. Error Alert (extend daily cron)

**Modified file:** `app/api/cron/daily-expiration/route.ts`

After existing expiry steps, add a new step:
- Count `error_logs` rows from last 24 hours where `created_at > now - 24h`
- If count > 20: send alert email to all super admins
- **New email function:** `sendErrorAlertEmail(email, count, topErrors[])` in `lib/email/resend.ts`
- `topErrors` = top 5 most frequent `error_message` values from last 24h

---

### 1c. Data Cleanup (extend daily cron)

**Modified file:** `app/api/cron/daily-expiration/route.ts`

Add two cleanup steps after all expiry logic:
1. Hard-delete `error_logs` rows where `created_at < now - 90 days`
2. Hard-delete `cron_reminder_logs` rows where `created_at < now - 60 days`

Both use `adminClient` (bypasses RLS). Both fire-and-forget with `console.error` on failure.

---

## Section 2: Frontend

### 2a. PWA Install Prompt

**New file:** `components/pwa/install-prompt.tsx`

- `'use client'`
- Listens for `beforeinstallprompt` event on mount, stores the deferred prompt
- After 10 seconds, shows a bottom-fixed dismissable banner if:
  - `localStorage.getItem('pwa-install-dismissed')` is not set
  - The deferred prompt is available
- Banner text: **"Instala BarrioRed en tu pantalla de inicio"**
- Two buttons: **Instalar** (calls `deferredPrompt.prompt()`) + **Ahora no** (sets localStorage flag)
- Neo-brutalist style: black border, hard shadow, white background

**Modified file:** `app/layout.tsx` — add `<InstallPrompt />` inside `<body>`

---

### 2b. Offline Connectivity Indicator

**New file:** `hooks/use-online-status.ts`
- Returns `{ isOnline: boolean }`
- Uses `navigator.onLine` initial value + `window.addEventListener('online'/'offline')`

**New file:** `components/shared/offline-banner.tsx`
- `'use client'`, uses `useOnlineStatus()`
- When offline: renders a sticky top banner (z-50) with message **"Sin conexión — algunas funciones no estarán disponibles"**
- When transitioning back online: fires `toast.success('Conexión restaurada')` via sonner
- No banner when online

**Modified file:** `app/layout.tsx` — add `<OfflineBanner />` inside `<body>`

---

### 2c. Vercel Analytics

**Package:** `npm install @vercel/analytics`

**Modified file:** `app/layout.tsx` — add `<Analytics />` from `@vercel/analytics/next`

Zero config, no env vars. Tracks Core Web Vitals + page views on Vercel free tier.

---

## Section 3: Infrastructure / CDN

### 3a. Health Check Endpoint

**New file:** `app/api/health/route.ts`
- Public GET, no auth
- Runs `SELECT 1` via Supabase admin client as a connectivity check
- Returns `{ status: 'ok' | 'degraded', db: boolean, timestamp: string }`
- `degraded` if DB ping fails or takes > 2000ms
- Status 200 always (so UptimeRobot can parse JSON body for content check)

**External setup (documented, not code):** Configure UptimeRobot to monitor `https://barriored.co/api/health` every 5 minutes.

---

### 3b. CDN Cache-Control Headers

**Modified file:** `next.config.ts` — add response headers for public GET API routes:

```ts
{ source: '/api/businesses', headers: [{ key: 'Cache-Control', value: 'public, s-maxage=60, stale-while-revalidate=300' }] },
{ source: '/api/communities', headers: [{ key: 'Cache-Control', value: 'public, s-maxage=300, stale-while-revalidate=600' }] },
```

Also add `compress: true` to `nextConfig` (no-op on Vercel, useful for self-hosted fallback).

---

### 3c. Data Caching (`unstable_cache`)

Wrap the heaviest server-side data fetches using `unstable_cache` from `next/cache`.

**Target pages:**
- `app/[community]/page.tsx` — featured businesses fetch, categories fetch, community info
- `app/[community]/directory/[[...category]]/page.tsx` — business list fetch

**Tag pattern:** `businesses-{communitySlug}`, `categories`, `community-{communitySlug}`

**Cache TTL:** 1 hour (`revalidate: 3600`). Mutations invalidate via `revalidateTag()`:
- `app/api/businesses/[id]/approve/route.ts` → `revalidateTag('businesses-{communitySlug}')`
- `app/api/businesses/[id]/reject/route.ts` → `revalidateTag('businesses-{communitySlug}')`
- `app/api/businesses/route.ts` (POST) → `revalidateTag('businesses-{communitySlug}')`

---

### 3d. Security Audit Script

**Modified file:** `package.json` — add to `scripts`:
```json
"audit:check": "npm audit --audit-level=moderate"
```

Run manually before each production deploy. No CI wiring in scope.

---

## Out of Scope

- Rate limiting (deferred)
- Background sync for offline form queuing (replaced by connectivity indicator)
- GitHub Actions CI pipeline
- Sentry / external error monitoring
- Algolia / search index updates
