# Subscription Reminder & Expiration Warning Emails Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extend the daily cron job to send renewal reminder emails (6–8 days before expiry) and expiration warning emails (1–3 days before expiry) to premium subscribers.

**Architecture:** Two tasks. Task 1 adds two email functions to the existing `lib/email/resend.ts`. Task 2 extends the existing cron handler at `app/api/cron/daily-expiration/route.ts` with two new query steps using date windows for deduplication — no DB migrations needed. Owner emails are fetched via `auth.admin.getUserById()` using the existing `createAdminClient()`.

**Tech Stack:** Next.js App Router route handlers, Supabase admin client, Resend (already installed and configured)

---

## Task 1: Add Email Functions to Resend Utility

**Files:**
- Modify: `lib/email/resend.ts`

The file already has `sendBusinessSubmittedEmail`, `sendBusinessApprovedEmail`, `sendBusinessRejectedEmail`. Append two new exported functions.

**Step 1: Add the renewal reminder function**

Open `lib/email/resend.ts` and append after the last function:

```ts
export async function sendSubscriptionRenewalReminderEmail(
  ownerEmail: string,
  businessName: string,
  expiresAt: string,
  daysLeft: number
) {
  const expiryDate = new Date(expiresAt).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  await resend.emails.send({
    from: FROM,
    to: ownerEmail,
    subject: `Tu suscripción Premium de "${businessName}" vence en ${daysLeft} días — BarrioRed`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px;">
          Barrio<span style="color: #c0392b;">Red</span>
        </h1>
        <p>Hola,</p>
        <p>Tu suscripción Premium para <strong>${businessName}</strong> vence el <strong>${expiryDate}</strong> (en ${daysLeft} días).</p>
        <p>Para continuar apareciendo como negocio destacado, contacta a tu administrador de comunidad para renovar tu suscripción.</p>
        <p>
          <a href="https://barriored.co/dashboard" style="background: #c0392b; color: white; padding: 10px 20px; text-decoration: none; font-weight: bold; text-transform: uppercase; display: inline-block;">
            Ver mi Panel
          </a>
        </p>
        <p style="color: #666; font-size: 12px; margin-top: 32px;">BarrioRed — Comunidad Parque Industrial, Pereira</p>
      </div>
    `,
  })
}
```

**Step 2: Add the expiration warning function**

Append after the renewal reminder function:

```ts
export async function sendSubscriptionExpirationWarningEmail(
  ownerEmail: string,
  businessName: string,
  expiresAt: string
) {
  const expiryDate = new Date(expiresAt).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  await resend.emails.send({
    from: FROM,
    to: ownerEmail,
    subject: `⚠️ Tu suscripción Premium de "${businessName}" vence mañana — BarrioRed`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px;">
          Barrio<span style="color: #c0392b;">Red</span>
        </h1>
        <p>Hola,</p>
        <p>⚠️ Tu suscripción Premium para <strong>${businessName}</strong> vence el <strong>${expiryDate}</strong>.</p>
        <p>Si no se renueva antes de esa fecha, tu negocio dejará de aparecer como destacado en el directorio.</p>
        <p>Contacta a tu administrador de comunidad para renovar tu suscripción a la brevedad.</p>
        <p>
          <a href="https://barriored.co/dashboard" style="background: #c0392b; color: white; padding: 10px 20px; text-decoration: none; font-weight: bold; text-transform: uppercase; display: inline-block;">
            Ver mi Panel
          </a>
        </p>
        <p style="color: #666; font-size: 12px; margin-top: 32px;">BarrioRed — Comunidad Parque Industrial, Pereira</p>
      </div>
    `,
  })
}
```

**Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors related to `lib/email/resend.ts`

**Step 4: Commit**

```bash
git add lib/email/resend.ts
git commit -m "feat(email): add subscription renewal reminder and expiration warning email functions"
```

---

## Task 2: Extend Daily Cron with Reminder Steps

**Files:**
- Modify: `app/api/cron/daily-expiration/route.ts`

The current file imports `createClient` from `@/lib/supabase/server` and uses a regular server client. We need the admin client to call `auth.admin.getUserById()`.

**Step 1: Add imports**

At the top of `app/api/cron/daily-expiration/route.ts`, add:

```ts
import { createAdminClient } from '@/lib/supabase/admin'
import {
  sendSubscriptionRenewalReminderEmail,
  sendSubscriptionExpirationWarningEmail
} from '@/lib/email/resend'
```

The existing import of `createClient` from `@/lib/supabase/server` stays as-is.

**Step 2: Replace the full handler body**

Replace everything inside the `try` block with the version below. The existing expiration/banner logic is preserved unchanged — only the two new steps are added before it.

```ts
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const adminClient = createAdminClient()

  try {
    // ── Step 1: Renewal reminders (6–8 days before expiry) ──────────────────
    const reminderFrom = new Date()
    reminderFrom.setDate(reminderFrom.getDate() + 6)
    const reminderTo = new Date()
    reminderTo.setDate(reminderTo.getDate() + 8)

    const { data: reminderSubs } = await supabase
      .from('business_subscriptions')
      .select('id, business_id, expires_at, businesses(name, owner_id)')
      .eq('status', 'active')
      .gte('expires_at', reminderFrom.toISOString())
      .lte('expires_at', reminderTo.toISOString())

    let renewalRemindersSent = 0

    for (const sub of reminderSubs || []) {
      try {
        const business = sub.businesses as { name: string; owner_id: string } | null
        if (!business) continue

        const { data: userData } = await adminClient.auth.admin.getUserById(business.owner_id)
        const ownerEmail = userData?.user?.email
        if (!ownerEmail) continue

        const expiresAt = sub.expires_at!
        const daysLeft = Math.ceil(
          (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )

        sendSubscriptionRenewalReminderEmail(ownerEmail, business.name, expiresAt, daysLeft)
          .catch(err => console.error(`Renewal reminder failed for sub ${sub.id}:`, err))

        renewalRemindersSent++
      } catch (err) {
        console.error(`Error processing renewal reminder for sub ${sub.id}:`, err)
      }
    }

    // ── Step 2: Expiration warnings (1–3 days before expiry) ────────────────
    const warningFrom = new Date()
    warningFrom.setDate(warningFrom.getDate() + 1)
    const warningTo = new Date()
    warningTo.setDate(warningTo.getDate() + 3)

    const { data: warningSubs } = await supabase
      .from('business_subscriptions')
      .select('id, business_id, expires_at, businesses(name, owner_id)')
      .eq('status', 'active')
      .gte('expires_at', warningFrom.toISOString())
      .lte('expires_at', warningTo.toISOString())

    let expirationWarningsSent = 0

    for (const sub of warningSubs || []) {
      try {
        const business = sub.businesses as { name: string; owner_id: string } | null
        if (!business) continue

        const { data: userData } = await adminClient.auth.admin.getUserById(business.owner_id)
        const ownerEmail = userData?.user?.email
        if (!ownerEmail) continue

        sendSubscriptionExpirationWarningEmail(ownerEmail, business.name, sub.expires_at!)
          .catch(err => console.error(`Expiration warning failed for sub ${sub.id}:`, err))

        expirationWarningsSent++
      } catch (err) {
        console.error(`Error processing expiration warning for sub ${sub.id}:`, err)
      }
    }

    // ── Step 3: Expire subscriptions (existing logic) ────────────────────────
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

    // ── Step 4: Expire banners (existing logic) ──────────────────────────────
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
      success: true,
      renewalRemindersSent,
      expirationWarningsSent,
      expiredSubscriptions: expiredSubs?.length || 0,
      expiredBanners: expiredBanners?.length || 0,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
```

**Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors. If you see a type error on `sub.businesses`, the cast `as { name: string; owner_id: string } | null` handles it.

**Step 4: Manual verification**

To test without waiting for a real subscription to near expiry:

1. In Supabase dashboard, temporarily set an active subscription's `expires_at` to `now() + 7 days`
2. Hit the cron endpoint directly:
   ```bash
   curl -H "Authorization: Bearer <CRON_SECRET>" http://localhost:3000/api/cron/daily-expiration
   ```
3. Confirm response includes `"renewalRemindersSent": 1`
4. Check the business owner's inbox for the reminder email
5. Reset `expires_at` back to its original value

**Step 5: Commit**

```bash
git add app/api/cron/daily-expiration/route.ts
git commit -m "feat(cron): send subscription renewal reminders and expiration warnings before expiry"
```

---

## Summary

| Task | Files | Status |
|---|---|---|
| Email functions | `lib/email/resend.ts` | Task 1 |
| Extend cron job | `app/api/cron/daily-expiration/route.ts` | Task 2 |
