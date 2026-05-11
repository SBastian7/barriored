# System / Automated Processes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add weekly digest emails, error alerting, data cleanup, PWA install prompt, offline indicator, Vercel Analytics, health check endpoint, CDN cache headers, and data caching.

**Architecture:** 10 independent tasks. No new infrastructure — everything runs on Vercel crons, Next.js native caching, and Resend (already installed). Tasks can be done in any order except Task 2 (depends on Task 1) and Task 10 (depends on Task 9).

**Tech Stack:** Next.js 16 App Router, Supabase (server + admin clients), Resend (already installed), `@vercel/analytics` (new package), `unstable_cache` from `next/cache`

---

## Prerequisites

Install Vercel Analytics:
```bash
npm install @vercel/analytics
```

---

## Task 1: Email Functions for Digest + Error Alert

**Files:**
- Modify: `lib/email/resend.ts`

### Step 1: Add two email functions at the bottom of `lib/email/resend.ts`

```ts
export type WeeklyDigestData = {
  communityName: string
  newBusinesses: number
  newPosts: number
  newUsers: number
  activeClassifieds: number
  errorCount: number
  weekStart: string
}

export async function sendWeeklyDigestEmail(
  adminEmail: string,
  data: WeeklyDigestData
) {
  const errorBadge = data.errorCount > 20
    ? `<span style="background:#c0392b;color:white;padding:2px 8px;font-size:11px;font-weight:bold;">⚠️ ${data.errorCount} errores</span>`
    : `<span style="color:#666;font-size:12px;">${data.errorCount} errores</span>`

  await resend.emails.send({
    from: FROM,
    to: adminEmail,
    subject: `📊 Resumen semanal — ${data.communityName} — BarrioRed`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px;">
          Barrio<span style="color: #c0392b;">Red</span>
        </h1>
        <p style="color:#666;font-size:13px;">Semana del ${data.weekStart}</p>
        <h2 style="font-size:18px;margin:24px 0 12px;">${data.communityName}</h2>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:12px;border:2px solid black;font-weight:bold;">Negocios nuevos</td>
            <td style="padding:12px;border:2px solid black;font-size:20px;font-weight:900;">${data.newBusinesses}</td>
          </tr>
          <tr>
            <td style="padding:12px;border:2px solid black;font-weight:bold;">Publicaciones nuevas</td>
            <td style="padding:12px;border:2px solid black;font-size:20px;font-weight:900;">${data.newPosts}</td>
          </tr>
          <tr>
            <td style="padding:12px;border:2px solid black;font-weight:bold;">Nuevos vecinos</td>
            <td style="padding:12px;border:2px solid black;font-size:20px;font-weight:900;">${data.newUsers}</td>
          </tr>
          <tr>
            <td style="padding:12px;border:2px solid black;font-weight:bold;">Clasificados activos</td>
            <td style="padding:12px;border:2px solid black;font-size:20px;font-weight:900;">${data.activeClassifieds}</td>
          </tr>
          <tr>
            <td style="padding:12px;border:2px solid black;font-weight:bold;">Errores (7 días)</td>
            <td style="padding:12px;border:2px solid black;">${errorBadge}</td>
          </tr>
        </table>
        <p>
          <a href="https://barriored.co/admin"
             style="background:#c0392b;color:white;padding:10px 20px;text-decoration:none;font-weight:bold;text-transform:uppercase;display:inline-block;margin-top:20px;">
            Ver Panel Admin
          </a>
        </p>
        <p style="color:#666;font-size:12px;margin-top:32px;">BarrioRed — Resumen automático semanal</p>
      </div>
    `,
  })
}

export async function sendErrorAlertEmail(
  adminEmail: string,
  count: number,
  topErrors: string[]
) {
  const errorList = topErrors
    .map(e => `<li style="margin-bottom:4px;font-size:13px;">${e}</li>`)
    .join('')

  await resend.emails.send({
    from: FROM,
    to: adminEmail,
    subject: `🚨 ${count} errores en las últimas 24h — BarrioRed`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px;">
          Barrio<span style="color: #c0392b;">Red</span>
        </h1>
        <div style="background:#c0392b;color:white;padding:12px 16px;margin:16px 0;">
          <strong style="font-size:18px;">⚠️ ${count} errores registrados en las últimas 24 horas</strong>
        </div>
        <p><strong>Errores más frecuentes:</strong></p>
        <ul>${errorList}</ul>
        <p>
          <a href="https://barriored.co/admin"
             style="background:#c0392b;color:white;padding:10px 20px;text-decoration:none;font-weight:bold;text-transform:uppercase;display:inline-block;">
            Ver Logs de Errores
          </a>
        </p>
        <p style="color:#666;font-size:12px;margin-top:32px;">BarrioRed — Alertas automáticas</p>
      </div>
    `,
  })
}
```

### Step 2: Verify TypeScript compiles

```bash
npx tsc --noEmit
```

Expected: no errors in `lib/email/resend.ts`

### Step 3: Commit

```bash
git add lib/email/resend.ts
git commit -m "feat(email): add weekly digest + error alert email functions"
```

---

## Task 2: Extend Daily Cron (Error Alerting + Data Cleanup)

**Files:**
- Modify: `app/api/cron/daily-expiration/route.ts`

Read the full file first to understand the existing structure. The file has a try/catch block with Steps 1–6. Add three new steps inside the same try block, before the final `return NextResponse.json(...)`.

### Step 1: Add imports at top of file

```ts
import {
  sendSubscriptionRenewalReminderEmail,
  sendSubscriptionExpirationWarningEmail,
  sendClassifiedExpiryReminderEmail,
  sendErrorAlertEmail,  // ADD THIS
} from '@/lib/email/resend'
```

### Step 2: Add Step 7 (error alert) and Step 8 (data cleanup) before the final return

Insert after the `classifiedRemindersSent` block and before `return NextResponse.json({...})`:

```ts
// ── Step 7: Error spike alert ─────────────────────────────────────────────
let errorAlertSent = false
try {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { count: errorCount } = await (adminClient as any)
    .from('error_logs')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', since24h)

  if ((errorCount ?? 0) > 20) {
    const { data: topErrorRows } = await (adminClient as any)
      .from('error_logs')
      .select('error_message')
      .gte('created_at', since24h)
      .order('created_at', { ascending: false })
      .limit(20)

    // Count by message and take top 5
    const freq: Record<string, number> = {}
    for (const row of topErrorRows ?? []) {
      const msg = row.error_message ?? 'Unknown'
      freq[msg] = (freq[msg] ?? 0) + 1
    }
    const topErrors = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([msg, cnt]) => `${msg} (×${cnt})`)

    const { data: superAdmins } = await (adminClient as any)
      .from('profiles')
      .select('id')
      .eq('is_super_admin', true)

    for (const admin of superAdmins ?? []) {
      try {
        const { data: userData } = await adminClient.auth.admin.getUserById(admin.id)
        const email = userData?.user?.email
        if (email) {
          await sendErrorAlertEmail(email, errorCount!, topErrors)
            .catch(err => console.error('[cron] error alert email failed:', err))
          errorAlertSent = true
        }
      } catch (err) {
        console.error('[cron] failed to send error alert to admin:', err)
      }
    }
  }
} catch (err) {
  console.error('[cron] error spike check failed:', err)
}

// ── Step 8: Data cleanup ──────────────────────────────────────────────────
let errorLogsDeleted = 0
let reminderLogsDeleted = 0
try {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  const { data: deletedErrors } = await (adminClient as any)
    .from('error_logs')
    .delete()
    .lt('created_at', ninetyDaysAgo)
    .select('id')
  errorLogsDeleted = deletedErrors?.length ?? 0
} catch (err) {
  console.error('[cron] error_logs cleanup failed:', err)
}

try {
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
  const { data: deletedReminders } = await (adminClient as any)
    .from('cron_reminder_logs')
    .delete()
    .lt('created_at', sixtyDaysAgo)
    .select('id')
  reminderLogsDeleted = deletedReminders?.length ?? 0
} catch (err) {
  console.error('[cron] cron_reminder_logs cleanup failed:', err)
}
```

### Step 3: Add new fields to the final return object

Find the `return NextResponse.json({` call and add:
```ts
errorAlertSent,
errorLogsDeleted,
reminderLogsDeleted,
```

### Step 4: Verify TypeScript compiles

```bash
npx tsc --noEmit
```

### Step 5: Manual verification

Call the cron endpoint locally with the CRON_SECRET header:
```bash
curl -H "Authorization: Bearer <CRON_SECRET>" http://localhost:3000/api/cron/daily-expiration
```
Expected: JSON response with `errorAlertSent`, `errorLogsDeleted`, `reminderLogsDeleted` fields.

### Step 6: Commit

```bash
git add app/api/cron/daily-expiration/route.ts
git commit -m "feat(cron): add error spike alerting + data cleanup to daily cron"
```

---

## Task 3: Weekly Digest Cron

**Files:**
- Create: `app/api/cron/weekly-digest/route.ts`
- Modify: `vercel.json`

### Step 1: Create the weekly digest cron route

```ts
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWeeklyDigestEmail } from '@/lib/email/resend'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const weekStart = new Date(sevenDaysAgo).toLocaleDateString('es-CO', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  let digestsSent = 0

  try {
    // Get all active communities
    const { data: communities } = await (admin as any)
      .from('communities')
      .select('id, name, slug')
      .eq('is_active', true)

    for (const community of communities ?? []) {
      try {
        // Gather stats for this community
        const [
          { count: newBusinesses },
          { count: newPosts },
          { count: newUsers },
          { count: activeClassifieds },
          { count: errorCount },
        ] = await Promise.all([
          (admin as any).from('businesses')
            .select('id', { count: 'exact', head: true })
            .eq('community_id', community.id)
            .eq('status', 'approved')
            .gte('created_at', sevenDaysAgo),

          (admin as any).from('community_posts')
            .select('id', { count: 'exact', head: true })
            .eq('community_id', community.id)
            .eq('status', 'approved')
            .gte('created_at', sevenDaysAgo),

          (admin as any).from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('community_id', community.id)
            .gte('created_at', sevenDaysAgo),

          (admin as any).from('classifieds')
            .select('id', { count: 'exact', head: true })
            .eq('community_id', community.id)
            .eq('status', 'active'),

          (admin as any).from('error_logs')
            .select('id', { count: 'exact', head: true })
            .eq('community_id', community.id)
            .gte('created_at', sevenDaysAgo),
        ])

        const digestData = {
          communityName: community.name,
          newBusinesses: newBusinesses ?? 0,
          newPosts: newPosts ?? 0,
          newUsers: newUsers ?? 0,
          activeClassifieds: activeClassifieds ?? 0,
          errorCount: errorCount ?? 0,
          weekStart,
        }

        // Get community admins
        const { data: adminProfiles } = await (admin as any)
          .from('profiles')
          .select('id')
          .eq('community_id', community.id)
          .eq('role', 'admin')

        for (const profile of adminProfiles ?? []) {
          try {
            const { data: userData } = await admin.auth.admin.getUserById(profile.id)
            const email = userData?.user?.email
            if (email) {
              await sendWeeklyDigestEmail(email, digestData)
                .catch(err => console.error(`[weekly-digest] email failed for ${profile.id}:`, err))
              digestsSent++
            }
          } catch (err) {
            console.error(`[weekly-digest] failed for admin ${profile.id}:`, err)
          }
        }
      } catch (err) {
        console.error(`[weekly-digest] failed for community ${community.id}:`, err)
      }
    }

    // Send consolidated digest to super admins (all-community totals)
    const { data: superAdmins } = await (admin as any)
      .from('profiles')
      .select('id')
      .eq('is_super_admin', true)

    if ((superAdmins?.length ?? 0) > 0) {
      const [
        { count: totalBusinesses },
        { count: totalPosts },
        { count: totalUsers },
        { count: totalClassifieds },
        { count: totalErrors },
      ] = await Promise.all([
        (admin as any).from('businesses').select('id', { count: 'exact', head: true }).eq('status', 'approved').gte('created_at', sevenDaysAgo),
        (admin as any).from('community_posts').select('id', { count: 'exact', head: true }).eq('status', 'approved').gte('created_at', sevenDaysAgo),
        (admin as any).from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
        (admin as any).from('classifieds').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        (admin as any).from('error_logs').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
      ])

      const superDigest = {
        communityName: 'Todas las comunidades',
        newBusinesses: totalBusinesses ?? 0,
        newPosts: totalPosts ?? 0,
        newUsers: totalUsers ?? 0,
        activeClassifieds: totalClassifieds ?? 0,
        errorCount: totalErrors ?? 0,
        weekStart,
      }

      for (const profile of superAdmins ?? []) {
        try {
          const { data: userData } = await admin.auth.admin.getUserById(profile.id)
          const email = userData?.user?.email
          if (email) {
            await sendWeeklyDigestEmail(email, superDigest)
              .catch(err => console.error(`[weekly-digest] super admin email failed:`, err))
            digestsSent++
          }
        } catch (err) {
          console.error(`[weekly-digest] super admin ${profile.id} failed:`, err)
        }
      }
    }

    return NextResponse.json({
      success: true,
      digestsSent,
      timestamp: now.toISOString(),
    })
  } catch (error) {
    console.error('[weekly-digest] cron failed:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    )
  }
}
```

### Step 2: Add cron schedule to `vercel.json`

Current `vercel.json`:
```json
{
  "crons": [
    { "path": "/api/cron/daily-expiration", "schedule": "0 0 * * *" },
    { "path": "/api/cron/community", "schedule": "0 * * * *" }
  ]
}
```

Add the weekly digest entry:
```json
{
  "crons": [
    { "path": "/api/cron/daily-expiration", "schedule": "0 0 * * *" },
    { "path": "/api/cron/community", "schedule": "0 * * * *" },
    { "path": "/api/cron/weekly-digest", "schedule": "0 14 * * 1" }
  ]
}
```

### Step 3: Verify TypeScript compiles

```bash
npx tsc --noEmit
```

### Step 4: Manual test

```bash
curl -H "Authorization: Bearer <CRON_SECRET>" http://localhost:3000/api/cron/weekly-digest
```

Expected: `{ "success": true, "digestsSent": N, "timestamp": "..." }`

### Step 5: Commit

```bash
git add app/api/cron/weekly-digest/route.ts vercel.json
git commit -m "feat(cron): add weekly digest email cron (Mondays 14:00 UTC)"
```

---

## Task 4: Health Check Endpoint

**Files:**
- Create: `app/api/health/route.ts`

### Step 1: Create the health check route

```ts
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const start = Date.now()
  let dbOk = false

  try {
    const admin = createAdminClient()
    const { error } = await (admin as any).from('communities').select('id').limit(1)
    dbOk = !error
  } catch {
    dbOk = false
  }

  const latency = Date.now() - start
  const status = dbOk && latency < 2000 ? 'ok' : 'degraded'

  return NextResponse.json(
    { status, db: dbOk, latencyMs: latency, timestamp: new Date().toISOString() },
    {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    }
  )
}
```

### Step 2: Manual verification

```bash
curl http://localhost:3000/api/health
```

Expected: `{ "status": "ok", "db": true, "latencyMs": <N>, "timestamp": "..." }`

### Step 3: Commit

```bash
git add app/api/health/route.ts
git commit -m "feat(health): add /api/health endpoint for uptime monitoring"
```

---

## Task 5: CDN Cache-Control Headers

**Files:**
- Modify: `next.config.ts`

### Step 1: Add headers and compress to `next.config.ts`

Replace the full file content:

```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  compress: true,
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Service-Worker-Allowed', value: '/' },
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
        ],
      },
      {
        source: '/api/businesses',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=60, stale-while-revalidate=300' },
        ],
      },
      {
        source: '/api/communities',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=300, stale-while-revalidate=600' },
        ],
      },
    ]
  },
}

export default nextConfig
```

### Step 2: Build and verify no errors

```bash
npm run build
```

Expected: build completes without errors.

### Step 3: Commit

```bash
git add next.config.ts
git commit -m "feat(cdn): add Cache-Control headers for public API routes"
```

---

## Task 6: Vercel Analytics

**Files:**
- Modify: `app/layout.tsx`

### Step 1: Install package (if not done yet)

```bash
npm install @vercel/analytics
```

### Step 2: Add `<Analytics />` to `app/layout.tsx`

Add the import after the existing imports:
```ts
import { Analytics } from '@vercel/analytics/next'
```

Add `<Analytics />` right before the closing `</body>` tag. The final `<body>` section should look like:

```tsx
<body className="font-sans antialiased">
  <ErrorBoundary>
    {children}
  </ErrorBoundary>
  <Toaster />
  <ServiceWorkerRegister />
  <Analytics />
</body>
```

### Step 3: Verify TypeScript compiles

```bash
npx tsc --noEmit
```

### Step 4: Commit

```bash
git add app/layout.tsx package.json package-lock.json
git commit -m "feat(analytics): add Vercel Analytics to root layout"
```

---

## Task 7: Offline Connectivity Indicator

**Files:**
- Create: `hooks/use-online-status.ts`
- Create: `components/shared/offline-banner.tsx`
- Modify: `app/layout.tsx`

### Step 1: Create the hook

Create `hooks/use-online-status.ts`:

```ts
'use client'

import { useEffect, useState } from 'react'

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    setIsOnline(navigator.onLine)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return { isOnline }
}
```

### Step 2: Create the banner component

Create `components/shared/offline-banner.tsx`:

```tsx
'use client'

import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { WifiOff } from 'lucide-react'
import { useOnlineStatus } from '@/hooks/use-online-status'

export function OfflineBanner() {
  const { isOnline } = useOnlineStatus()
  const wasOffline = useRef(false)

  useEffect(() => {
    if (!isOnline) {
      wasOffline.current = true
    } else if (wasOffline.current) {
      wasOffline.current = false
      toast.success('Conexión restaurada')
    }
  }, [isOnline])

  if (isOnline) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 bg-foreground text-white px-4 py-2 text-sm font-bold uppercase tracking-widest">
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>Sin conexión — algunas funciones no estarán disponibles</span>
    </div>
  )
}
```

### Step 3: Add to `app/layout.tsx`

Add import:
```ts
import { OfflineBanner } from '@/components/shared/offline-banner'
```

Add `<OfflineBanner />` as the first child inside `<body>`:
```tsx
<body className="font-sans antialiased">
  <OfflineBanner />
  <ErrorBoundary>
    {children}
  </ErrorBoundary>
  <Toaster />
  <ServiceWorkerRegister />
  <Analytics />
</body>
```

### Step 4: Manual verification

Open the app in browser. In DevTools → Network tab, toggle "Offline" mode. Expected: dark banner appears at top. Toggle back online. Expected: banner disappears + "Conexión restaurada" toast.

### Step 5: Commit

```bash
git add hooks/use-online-status.ts components/shared/offline-banner.tsx app/layout.tsx
git commit -m "feat(pwa): add offline connectivity indicator banner"
```

---

## Task 8: PWA Install Prompt

**Files:**
- Create: `components/pwa/install-prompt.tsx`
- Modify: `app/layout.tsx`

### Step 1: Create the install prompt component

Create `components/pwa/install-prompt.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISSED_KEY = 'pwa-install-dismissed'

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY)) return

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      // Show after 10 seconds
      setTimeout(() => setVisible(true), 10_000)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleInstall() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setVisible(false)
    }
  }

  function handleDismiss() {
    localStorage.setItem(DISMISSED_KEY, '1')
    setVisible(false)
  }

  if (!visible || !deferredPrompt) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:w-80 z-40 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="font-heading font-black text-sm uppercase tracking-tighter italic">
            Instala BarrioRed
          </p>
          <p className="text-xs text-black/60 mt-1">
            Accede más rápido desde tu pantalla de inicio.
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-black/40 hover:text-black mt-0.5"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={handleInstall}
          className="flex-1 brutalist-button text-xs py-2 flex items-center justify-center gap-1"
        >
          <Download className="h-3 w-3" />
          Instalar
        </button>
        <button
          onClick={handleDismiss}
          className="flex-1 text-xs py-2 border-2 border-black font-bold uppercase hover:bg-black/5"
        >
          Ahora no
        </button>
      </div>
    </div>
  )
}
```

### Step 2: Add to `app/layout.tsx`

Add import:
```ts
import { InstallPrompt } from '@/components/pwa/install-prompt'
```

Add `<InstallPrompt />` before the closing `</body>` tag:
```tsx
<body className="font-sans antialiased">
  <OfflineBanner />
  <ErrorBoundary>
    {children}
  </ErrorBoundary>
  <Toaster />
  <ServiceWorkerRegister />
  <Analytics />
  <InstallPrompt />
</body>
```

### Step 3: Verify TypeScript compiles

```bash
npx tsc --noEmit
```

### Step 4: Manual verification

The `beforeinstallprompt` only fires on mobile Chrome / Edge on Android when PWA install criteria are met. To test:
1. Open site on Android Chrome (or use DevTools → Application → Manifest → "Add to home screen" simulation)
2. Wait 10 seconds — banner should appear at bottom
3. Click "Instalar" — native install prompt should appear
4. Click "Ahora no" — banner disappears and never shows again

### Step 5: Commit

```bash
git add components/pwa/install-prompt.tsx app/layout.tsx
git commit -m "feat(pwa): add install prompt banner with localStorage dismiss"
```

---

## Task 9: Data Caching with `unstable_cache`

**Files:**
- Modify: `app/[community]/page.tsx`
- Modify: `app/[community]/directory/page.tsx`

The goal is to wrap public data fetches in `unstable_cache` using the admin client (which has no cookie dependency, avoiding Next.js dynamic API errors in cached functions).

### Step 1: Update community homepage (`app/[community]/page.tsx`)

Read the full file first. Then replace the top of the component with a cached data fetch function.

Add at the top of the file (after existing imports):
```ts
import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
```

Add a cached function above the component:
```ts
const getCommunityHomepageData = unstable_cache(
  async (slug: string) => {
    const admin = createAdminClient()

    const { data: community } = await (admin as any)
      .from('communities')
      .select('*')
      .eq('slug', slug)
      .single()

    if (!community) return null

    const [businessCountRes, featuredRes, recentRes] = await Promise.all([
      (admin as any).from('businesses').select('id', { count: 'exact', head: true })
        .eq('community_id', community.id).eq('status', 'approved'),

      (admin as any).from('businesses')
        .select('id, name, slug, description, photos, whatsapp, address, is_featured, categories(name, slug)')
        .eq('community_id', community.id)
        .eq('status', 'approved')
        .eq('is_featured', true)
        .order('featured_order', { ascending: true, nullsFirst: false })
        .limit(3),

      (admin as any).from('businesses')
        .select('id, name, slug, description, photos, whatsapp, address, is_featured, categories(name, slug)')
        .eq('community_id', community.id)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(10),
    ])

    const featuredIds = (featuredRes.data ?? []).map((b: any) => b.id)
    const recentBusinesses = (recentRes.data ?? []).filter((b: any) => !featuredIds.includes(b.id)).slice(0, 3)

    return {
      community,
      businessCount: businessCountRes.count ?? 0,
      featuredBusinesses: featuredRes.data ?? [],
      recentBusinesses,
    }
  },
  ['community-homepage'],
  { revalidate: 3600 }
)
```

In the component function, replace the Supabase calls with:
```ts
const data = await getCommunityHomepageData(slug)
if (!data) return null
const { community, businessCount, featuredBusinesses, recentBusinesses } = data
```

Remove the now-unused `import { createClient }` line if no other queries in the page use it. Check if `BannerRotator` or other components need `supabase` — they fetch their own data, so it's safe to remove if unused.

### Step 2: Update directory page (`app/[community]/directory/page.tsx`)

Read the full file first. Cache only the static parts (community info + categories + full business list). The search path (`q` param) remains dynamic — just skip caching when `q` is present.

Add imports:
```ts
import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
```

Add cached function above the component:
```ts
const getDirectoryData = unstable_cache(
  async (slug: string) => {
    const admin = createAdminClient()

    const { data: community } = await (admin as any)
      .from('communities')
      .select('id, name')
      .eq('slug', slug)
      .single()

    if (!community) return null

    const { data: categories } = await (admin as any)
      .from('categories')
      .select('id, name, slug')
      .order('sort_order')

    const { data: businesses } = await (admin as any)
      .from('businesses')
      .select('id, name, slug, description, photos, whatsapp, address, location, created_at, is_featured, categories(name, slug)')
      .eq('community_id', community.id)
      .eq('status', 'approved')
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false })

    return { community, categories: categories ?? [], businesses: businesses ?? [] }
  },
  ['directory-data'],
  { revalidate: 3600 }
)
```

In the component: when `q` is present, fall back to the existing Supabase search logic. When `q` is absent, use `getDirectoryData(slug)`.

```ts
// When no search query, use cached data
if (!q) {
  const cached = await getDirectoryData(slug)
  if (!cached) return null
  // use cached.community, cached.categories, cached.businesses
}
// When q is present: keep existing RPC search logic as-is (uses createClient())
```

### Step 3: Verify TypeScript compiles

```bash
npx tsc --noEmit
```

### Step 4: Verify the pages load correctly

```bash
npm run dev
```

Navigate to `http://localhost:3000/parqueindustrial` and `http://localhost:3000/parqueindustrial/directory`. Both should load normally.

### Step 5: Commit

```bash
git add "app/[community]/page.tsx" "app/[community]/directory/page.tsx"
git commit -m "feat(cache): add unstable_cache to homepage + directory (1h TTL)"
```

---

## Task 10: npm Audit Script

**Files:**
- Modify: `package.json`

### Step 1: Add audit script

In `package.json`, add to the `"scripts"` section:
```json
"audit:check": "npm audit --audit-level=moderate"
```

Final scripts section:
```json
"scripts": {
  "dev": "next dev",
  "build:sw": "node scripts/build-sw.js",
  "build": "npm run build:sw && next build",
  "start": "next start",
  "lint": "eslint",
  "test": "jest",
  "audit:check": "npm audit --audit-level=moderate"
}
```

### Step 2: Run it once to verify

```bash
npm run audit:check
```

Expected: either clean output or a list of moderate+ vulnerabilities to review. Fix any `high` or `critical` ones with `npm audit fix`.

### Step 3: Commit

```bash
git add package.json
git commit -m "chore: add npm audit:check script for security scanning"
```

---

## Summary

| Task | Feature | Files |
|------|---------|-------|
| 1 | Email functions (digest + alert) | `lib/email/resend.ts` |
| 2 | Extend daily cron (alert + cleanup) | `app/api/cron/daily-expiration/route.ts` |
| 3 | Weekly digest cron | `app/api/cron/weekly-digest/route.ts`, `vercel.json` |
| 4 | Health check endpoint | `app/api/health/route.ts` |
| 5 | CDN Cache-Control headers | `next.config.ts` |
| 6 | Vercel Analytics | `app/layout.tsx` |
| 7 | Offline connectivity banner | `hooks/use-online-status.ts`, `components/shared/offline-banner.tsx`, `app/layout.tsx` |
| 8 | PWA install prompt | `components/pwa/install-prompt.tsx`, `app/layout.tsx` |
| 9 | Data caching (unstable_cache) | `app/[community]/page.tsx`, `app/[community]/directory/page.tsx` |
| 10 | npm audit script | `package.json` |
