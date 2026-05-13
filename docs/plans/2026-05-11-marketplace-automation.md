# Marketplace Automation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire 5 marketplace automation features — prohibited keyword block, duplicate detection, sold notification (email + push), auto-expire (30 days), and 3-day expiry reminder.

**Architecture:** Real-time features (prohibited items, duplicates, sold notification) fire inside existing server actions and API routes. Time-based features (auto-expire, reminder) are added as Steps 5–6 in the existing `daily-expiration` cron (`app/api/cron/daily-expiration/route.ts`). One DB migration adds a `renewal_reminder_sent_at` dedup column to `classifieds`.

**Tech Stack:** Next.js server actions, Supabase admin client (`lib/supabase/admin`), Resend email (`lib/email/resend.ts`), Web Push (`lib/notifications/community.ts` → `sendPushToUsers`).

---

### Task 1: DB Migration — add `renewal_reminder_sent_at`

**Files:**
- Create: `supabase/migrations/20260511001000_marketplace_automation.sql`

**Step 1: Create the migration file**

```sql
-- Migration: Marketplace automation support
-- Adds renewal_reminder_sent_at to classifieds for 3-day expiry reminder dedup

ALTER TABLE classifieds
  ADD COLUMN IF NOT EXISTS renewal_reminder_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN classifieds.renewal_reminder_sent_at IS
  'Set when the 3-day expiry reminder email is sent. NULL = not sent yet (or reset on reactivation).';
```

**Step 2: Update TypeScript types in `lib/types/supabase.ts`**

In the `classifieds` block (around line 597), add `renewal_reminder_sent_at` to all three shapes:

In `Row` (after `price: string | null` ~line 613):
```ts
renewal_reminder_sent_at: string | null
```

In `Insert` (after `price?: string | null` ~line 634):
```ts
renewal_reminder_sent_at?: string | null
```

In `Update` (after `price?: string | null` ~line 656):
```ts
renewal_reminder_sent_at?: string | null
```

**Step 3: Apply migration (if Supabase CLI is configured)**

```bash
npx supabase db push
```

If not using CLI, apply via the Supabase dashboard SQL editor.

**Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors related to `renewal_reminder_sent_at`.

**Step 5: Commit**

```bash
git add supabase/migrations/20260511001000_marketplace_automation.sql lib/types/supabase.ts
git commit -m "feat(marketplace): add renewal_reminder_sent_at column + types"
```

---

### Task 2: Prohibited Keywords Module

**Files:**
- Create: `lib/moderation/marketplace-keywords.ts`

**Step 1: Create the module**

```ts
// lib/moderation/marketplace-keywords.ts

export const PROHIBITED_KEYWORDS = [
  // Drogas
  'cocaína', 'cocaine', 'heroína', 'heroin', 'marihuana', 'cannabis',
  'éxtasis', 'mdma', 'bazuco', 'pasta base', 'pepas', 'perico',
  // Armas
  'arma de fuego', 'pistola', 'revólver', 'revolver', 'granada',
  'explosivo', 'munición', 'municion', 'cargador', 'fusil', 'silenciador',
  // Bienes robados
  'robado', 'hurtado', 'sin papeles', 'raspado', 'recuperado',
  // Contenido explícito
  'prepago', 'acompañante sexual', 'escort', 'webcam adultos',
]

export function checkProhibitedKeywords(text: string): string | null {
  const lower = text.toLowerCase()
  for (const keyword of PROHIBITED_KEYWORDS) {
    if (lower.includes(keyword)) return keyword
  }
  return null
}
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

**Step 3: Commit**

```bash
git add lib/moderation/marketplace-keywords.ts
git commit -m "feat(marketplace): add prohibited keyword list"
```

---

### Task 3: Wire Keyword Check + Duplicate Detection into Server Actions

**Files:**
- Modify: `app/actions/classified-actions.ts`

**Step 1: Add the import at the top of the file**

After the existing imports, add:

```ts
import { checkProhibitedKeywords } from '@/lib/moderation/marketplace-keywords'
```

**Step 2: Wire keyword check into `createClassifiedAction`**

In `createClassifiedAction`, after the rate limiting check (after the `if (count && count >= 5)` block, around line 98), add:

```ts
// Prohibited keyword check
const prohibitedMatch = checkProhibitedKeywords(`${title} ${description}`)
if (prohibitedMatch) {
  return {
    success: false,
    error: `Contenido no permitido: "${prohibitedMatch}". Este tipo de artículo no puede publicarse en el marketplace.`
  }
}

// Duplicate detection
const { data: duplicate } = await supabase
  .from('classifieds')
  .select('id')
  .eq('user_id', user.id)
  .eq('status', 'active')
  .ilike('title', title)
  .maybeSingle()

if (duplicate) {
  return {
    success: false,
    error: 'Ya tienes un clasificado activo con ese título. Edita el existente o elige un título diferente.'
  }
}
```

**Step 3: Wire keyword check into `updateClassifiedAction`**

In `updateClassifiedAction`, after the validation block (after the `images.length > 5` check, around line 176), add:

```ts
// Prohibited keyword check
const prohibitedMatch = checkProhibitedKeywords(`${title} ${description}`)
if (prohibitedMatch) {
  return {
    success: false,
    error: `Contenido no permitido: "${prohibitedMatch}". Actualiza el texto y vuelve a intentarlo.`
  }
}
```

**Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add app/actions/classified-actions.ts
git commit -m "feat(marketplace): keyword block + duplicate detection at creation/update"
```

---

### Task 4: Email Functions for Sold + Expiry Reminder

**Files:**
- Modify: `lib/email/resend.ts`

**Step 1: Add `sendClassifiedSoldEmail` at the end of `lib/email/resend.ts`**

```ts
export async function sendClassifiedSoldEmail(
  ownerEmail: string,
  classifiedTitle: string,
  communitySlug: string
) {
  await resend.emails.send({
    from: FROM,
    to: ownerEmail,
    subject: `¡Vendido! "${classifiedTitle}" — BarrioRed`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px;">
          Barrio<span style="color: #c0392b;">Red</span>
        </h1>
        <p>¡Felicitaciones!</p>
        <p>Tu clasificado <strong>"${classifiedTitle}"</strong> fue marcado como vendido.</p>
        <p>Si tienes más artículos, publica otro clasificado en el marketplace.</p>
        <p>
          <a href="https://barriored.co/${communitySlug}/marketplace"
             style="background: #c0392b; color: white; padding: 10px 20px; text-decoration: none; font-weight: bold; text-transform: uppercase; display: inline-block;">
            Ver Marketplace
          </a>
        </p>
        <p style="color: #666; font-size: 12px; margin-top: 32px;">BarrioRed — Tu comunidad digital</p>
      </div>
    `,
  })
}
```

**Step 2: Add `sendClassifiedExpiryReminderEmail` at the end of `lib/email/resend.ts`**

```ts
export async function sendClassifiedExpiryReminderEmail(
  ownerEmail: string,
  classifiedTitle: string,
  communitySlug: string
) {
  await resend.emails.send({
    from: FROM,
    to: ownerEmail,
    subject: `Tu clasificado "${classifiedTitle}" vence en 3 días — BarrioRed`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px;">
          Barrio<span style="color: #c0392b;">Red</span>
        </h1>
        <p>Tu clasificado <strong>"${classifiedTitle}"</strong> vence en <strong>3 días</strong>.</p>
        <p>Si aún no lo has vendido, actualiza tu publicación para renovar los 30 días automáticamente.</p>
        <p>
          <a href="https://barriored.co/dashboard?tab=marketplace"
             style="background: #c0392b; color: white; padding: 10px 20px; text-decoration: none; font-weight: bold; text-transform: uppercase; display: inline-block;">
            Actualizar Clasificado
          </a>
        </p>
        <p style="color: #666; font-size: 12px; margin-top: 32px;">BarrioRed — Tu comunidad digital</p>
      </div>
    `,
  })
}
```

**Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add lib/email/resend.ts
git commit -m "feat(marketplace): add sold + expiry reminder email templates"
```

---

### Task 5: `notifyClassifiedSold` Helper

**Files:**
- Create: `lib/notifications/marketplace.ts`

**Step 1: Create the file**

```ts
import { createAdminClient } from '@/lib/supabase/admin'
import { sendClassifiedSoldEmail } from '@/lib/email/resend'
import { sendPushToUsers } from '@/lib/notifications/community'

export async function notifyClassifiedSold(
  classifiedId: string,
  sellerId: string
): Promise<void> {
  const admin = createAdminClient()

  // Fetch classified title + community slug
  const { data: classified } = await (admin as any)
    .from('classifieds')
    .select('title, communities!inner(slug)')
    .eq('id', classifiedId)
    .single()

  if (!classified) return

  const title = classified.title as string
  const slug = (classified.communities as any).slug as string

  // Send email
  try {
    const { data: userData } = await admin.auth.admin.getUserById(sellerId)
    const email = userData?.user?.email
    if (email) {
      await sendClassifiedSoldEmail(email, title, slug)
    }
  } catch (err) {
    console.error(`[marketplace] sold email failed for ${classifiedId}:`, err)
  }

  // Send push notification
  try {
    await sendPushToUsers([sellerId], {
      title: `¡Vendido! ${title}`,
      body: 'Tu clasificado fue marcado como vendido. ¡Felicitaciones!',
      url: `https://barriored.co/${slug}/marketplace`,
    })
  } catch (err) {
    console.error(`[marketplace] sold push failed for ${classifiedId}:`, err)
  }
}
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add lib/notifications/marketplace.ts
git commit -m "feat(marketplace): add notifyClassifiedSold helper"
```

---

### Task 6: Wire Sold Notification into Server Action + Admin Route

**Files:**
- Modify: `app/actions/classified-actions.ts`
- Modify: `app/api/admin/marketplace/[id]/route.ts`

**Step 1: Add import to `app/actions/classified-actions.ts`**

After the existing imports at the top of the file, add:

```ts
import { notifyClassifiedSold } from '@/lib/notifications/marketplace'
```

**Step 2: Wire into `markAsSoldAction`**

In `markAsSoldAction` (around line 241), after the successful `supabase.from('classifieds').update(...)` call and before the `revalidatePath` calls, add:

```ts
// Fire-and-forget: notify seller
notifyClassifiedSold(id, user.id).catch(err =>
  console.error('[markAsSoldAction] notification failed:', err)
)
```

**Step 3: Wire into admin PATCH route**

In `app/api/admin/marketplace/[id]/route.ts`, add the import after the existing imports at the top:

```ts
import { notifyClassifiedSold } from '@/lib/notifications/marketplace'
```

In the PATCH handler, after the `const { data: updated, error } = await supabase...` block and the `if (error)` check (around line 145), add before the audit log insert:

```ts
// Notify seller when admin marks as sold
if (status === 'sold' && updated) {
  notifyClassifiedSold(id, updated.user_id).catch(err =>
    console.error('[admin PATCH] sold notification failed:', err)
  )
}
```

**Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add app/actions/classified-actions.ts app/api/admin/marketplace/[id]/route.ts
git commit -m "feat(marketplace): send sold notification from owner action + admin PATCH"
```

---

### Task 7: Auto-Expire + 3-Day Reminder in Daily Cron

**Files:**
- Modify: `app/api/cron/daily-expiration/route.ts`

**Step 1: Add email import at the top of the file**

After the existing imports, add:

```ts
import {
  sendClassifiedExpiryReminderEmail,
} from '@/lib/email/resend'
```

**Step 2: Add Steps 5 and 6 before the `return NextResponse.json(...)` call**

Find the `return NextResponse.json({` near the end of the route handler and insert the following before it:

```ts
// ── Step 5: Auto-expire classifieds (30 days from last_activity_at) ──────────
const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

const { data: expiredClassifieds } = await (adminClient as any)
  .from('classifieds')
  .update({
    status: 'archived',
    archived_at: now.toISOString(),
    updated_at: now.toISOString(),
  })
  .eq('status', 'active')
  .lt('last_activity_at', thirtyDaysAgo.toISOString())
  .select('id')

// ── Step 6: 3-day expiry reminder ────────────────────────────────────────────
// Window: last_activity_at is between 27 and 28 days ago (fires once per day)
const reminderWindowOlder = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000)
const reminderWindowNewer = new Date(now.getTime() - 27 * 24 * 60 * 60 * 1000)

const { data: reminderCandidates } = await (adminClient as any)
  .from('classifieds')
  .select('id, title, user_id, communities!inner(slug)')
  .eq('status', 'active')
  .is('renewal_reminder_sent_at', null)
  .gte('last_activity_at', reminderWindowOlder.toISOString())
  .lte('last_activity_at', reminderWindowNewer.toISOString())

let classifiedRemindersSent = 0

for (const classified of reminderCandidates ?? []) {
  try {
    const slug = (classified.communities as any).slug as string
    const { data: userData } = await adminClient.auth.admin.getUserById(classified.user_id)
    const email = userData?.user?.email

    if (email) {
      await sendClassifiedExpiryReminderEmail(email, classified.title, slug)
    }

    await (adminClient as any)
      .from('classifieds')
      .update({ renewal_reminder_sent_at: now.toISOString() })
      .eq('id', classified.id)

    classifiedRemindersSent++
  } catch (err) {
    console.error(`[cron] classified reminder failed for ${classified.id}:`, err)
  }
}
```

**Step 3: Add the new fields to the existing return payload**

Update the final `return NextResponse.json({...})` to include:

```ts
classifiedsExpired: expiredClassifieds?.length ?? 0,
classifiedRemindersSent,
```

**Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add app/api/cron/daily-expiration/route.ts
git commit -m "feat(marketplace): auto-expire classifieds + 3-day reminder in daily cron"
```

---

### Task 8: Reset `renewal_reminder_sent_at` on Reactivation

**Files:**
- Modify: `app/actions/classified-actions.ts`

**Step 1: Add the reset field to `reactivateClassifiedAction`**

In `reactivateClassifiedAction` (around line 269), find the `.update({...})` call and add `renewal_reminder_sent_at: null` alongside the existing reset fields:

```ts
const { error } = await supabase
  .from('classifieds')
  .update({
    status: 'active',
    last_activity_at: new Date().toISOString(),
    sold_at: null,
    archived_at: null,
    renewal_reminder_sent_at: null,   // ← add this line
  })
  .eq('id', id)
  .eq('user_id', user.id)
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add app/actions/classified-actions.ts
git commit -m "feat(marketplace): reset renewal reminder flag on classified reactivation"
```

---

## Manual Verification Checklist

After all tasks are complete:

1. **Prohibited keywords:** Try creating a classified with "pistola" in the title → should get an error, classified not created.
2. **Duplicate detection:** Create a classified, then try to create another with the exact same title → should be blocked.
3. **Sold notification:** Mark a classified as sold from the dashboard → check seller's email inbox for congratulation email. Check browser push notifications if seller has them enabled.
4. **Admin sold notification:** From the admin panel, change a classified status to "sold" → same notification should fire.
5. **Auto-expire (cron):** Test by temporarily setting a classified's `last_activity_at` to 31 days ago in Supabase dashboard, then hitting `/api/cron/daily-expiration` with `Authorization: Bearer <CRON_SECRET>`. Verify the classified becomes `archived`.
6. **3-day reminder (cron):** Set a classified's `last_activity_at` to 27.5 days ago and `renewal_reminder_sent_at` to NULL, then trigger the cron. Verify the reminder email arrives and `renewal_reminder_sent_at` is set.
7. **Reactivation reset:** Reactivate an archived classified, verify `renewal_reminder_sent_at` is NULL in Supabase dashboard.
