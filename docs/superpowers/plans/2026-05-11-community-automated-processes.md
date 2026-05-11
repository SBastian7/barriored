# Community Automated Processes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 8 automated community processes: alert notifications (email + push + WhatsApp), hourly event/job expiration, event reminder pushes (24h and 1h), Spanish keyword spam moderation, and admin flagged-content notifications.

**Architecture:** New hourly cron at `/api/cron/community` handles all scheduled work; trigger-on-action hooks in existing routes handle real-time events (alert creation → notifications, post creation → spam check, flagging → admin alert). Shared orchestration lives in `lib/notifications/community.ts` using the admin Supabase client to stay context-independent.

**Tech Stack:** Next.js App Router route handlers, Supabase (admin client), Resend (email), web-push (push notifications), Twilio (WhatsApp), Jest (unit tests for pure utilities).

**Spec:** `docs/superpowers/specs/2026-05-11-community-automated-processes-design.md`

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Create | `supabase/migrations/20260511000000_community_automation.sql` | `cron_reminder_logs` table, `community_reports` table, `moderation_flag` column |
| Create | `lib/moderation/keywords.ts` | Spanish keyword blocklist + `checkContent()` |
| Create | `lib/twilio.ts` | Twilio client + `sendWhatsAppMessage()` + `normalizeColombianPhone()` |
| Create | `lib/notifications/community.ts` | Shared orchestration: push helper, alert notifications, admin flag notifications |
| Create | `app/api/cron/community/route.ts` | Hourly cron: expire events/jobs, send event reminders |
| Create | `app/api/community/posts/[id]/flag/route.ts` | Community post flagging endpoint |
| Modify | `lib/email/resend.ts` | Add `sendAlertNotificationEmail`, `sendAdminFlaggedContentEmail` |
| Modify | `app/api/community/alerts/route.ts` | Fire alert notifications after insert |
| Modify | `app/api/community/posts/route.ts` | Run spam check before insert |
| Modify | `app/api/reviews/[reviewId]/flag/route.ts` | Fire admin notification after insert |
| Modify | `vercel.json` | Add hourly cron schedule |
| Create | `jest.config.js` | Jest config for utility unit tests |
| Create | `__tests__/lib/moderation/keywords.test.ts` | Unit tests for `checkContent()` |
| Create | `__tests__/lib/twilio.test.ts` | Unit tests for `normalizeColombianPhone()` |

---

## Environment Variables Required

Add to `.env.local` and Vercel project settings:
```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

> `TWILIO_WHATSAPP_FROM` is the Twilio sandbox number during development. For production, use your approved WhatsApp Business number prefixed with `whatsapp:`.

---

## Task 1: Install Dependencies + Test Infrastructure

**Files:**
- Modify: `package.json` (scripts + devDependencies)
- Create: `jest.config.js`

- [ ] **Step 1: Install runtime and dev dependencies**

```bash
npm install twilio
npm install -D jest @types/jest
```

Expected: `package.json` updated, no errors.

- [ ] **Step 2: Create Jest config**

Create `jest.config.js` at repo root:

```js
const nextJest = require('next/jest')
const createJestConfig = nextJest({ dir: './' })
module.exports = createJestConfig({
  testEnvironment: 'node',
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  testMatch: ['**/__tests__/**/*.test.ts'],
})
```

- [ ] **Step 3: Add test script to package.json**

In `package.json`, add to `"scripts"`:
```json
"test": "jest"
```

- [ ] **Step 4: Verify Jest runs**

```bash
npm test -- --passWithNoTests
```

Expected: `Test Suites: 0 passed, 0 total` (no errors).

- [ ] **Step 5: Commit**

```bash
git add jest.config.js package.json package-lock.json
git commit -m "chore: add twilio and jest dependencies"
```

---

## Task 2: Database Migration

**Files:**
- Create: `supabase/migrations/20260511000000_community_automation.sql`

- [ ] **Step 1: Write the migration file**

Create `supabase/migrations/20260511000000_community_automation.sql`:

```sql
-- Track which event posts have already received reminder push notifications
-- UNIQUE(post_id, type) is the deduplication guarantee at DB level
CREATE TABLE cron_reminder_logs (
  id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  type    text NOT NULL CHECK (type IN ('24h', '1h')),
  sent_at timestamptz DEFAULT now(),
  UNIQUE(post_id, type)
);

-- Allow RLS bypass for cron (service role reads/writes this table)
ALTER TABLE cron_reminder_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON cron_reminder_logs
  USING (true) WITH CHECK (true);

-- Community post reports (was referenced in RLS policies but never created)
CREATE TABLE community_reports (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id         uuid NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  reporter_id          uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reported_entity_id   uuid NOT NULL,
  reported_entity_type text NOT NULL CHECK (reported_entity_type IN ('post', 'review', 'business')),
  reason               text NOT NULL,
  status               text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed')),
  created_at           timestamptz DEFAULT now()
);

ALTER TABLE community_reports ENABLE ROW LEVEL SECURITY;

-- Authenticated users can create reports
CREATE POLICY "Users can insert reports" ON community_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Users can see their own reports
CREATE POLICY "Users can view own reports" ON community_reports
  FOR SELECT USING (auth.uid() = reporter_id);

-- Admins can view and update reports in their community
CREATE POLICY "Admins can manage community reports" ON community_reports
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND (is_super_admin = true OR (role = 'admin' AND community_id = community_reports.community_id))
    )
  );

CREATE INDEX idx_community_reports_entity ON community_reports(reported_entity_id, reported_entity_type);
CREATE INDEX idx_community_reports_status ON community_reports(status) WHERE status = 'pending';

-- Soft-flag column for posts that hit exactly 1 keyword (admin review queue)
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS moderation_flag boolean DEFAULT false;
CREATE INDEX idx_community_posts_moderation_flag ON community_posts(moderation_flag) WHERE moderation_flag = true;
```

- [ ] **Step 2: Apply migration via Supabase dashboard or CLI**

If using Supabase CLI:
```bash
npx supabase db push
```

If applying manually: paste the SQL into Supabase Dashboard → SQL Editor → Run.

- [ ] **Step 3: Verify tables exist**

In Supabase Dashboard → Table Editor, confirm:
- `cron_reminder_logs` exists with columns `id`, `post_id`, `type`, `sent_at`
- `community_reports` exists with columns listed above
- `community_posts` has a `moderation_flag` boolean column

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260511000000_community_automation.sql
git commit -m "feat(db): add cron_reminder_logs, community_reports, moderation_flag"
```

---

## Task 3: Keyword Moderation (TDD)

**Files:**
- Create: `lib/moderation/keywords.ts`
- Create: `__tests__/lib/moderation/keywords.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/lib/moderation/keywords.test.ts`:

```ts
import { checkContent } from '@/lib/moderation/keywords'

describe('checkContent', () => {
  it('returns clean for normal content', () => {
    const result = checkContent('Vendo bicicleta usada', 'En buen estado, precio negociable')
    expect(result.flagged).toBe(false)
    expect(result.matches).toHaveLength(0)
  })

  it('detects a single profanity term (soft flag)', () => {
    const result = checkContent('Trabajo disponible', 'puta oferta de trabajo')
    expect(result.flagged).toBe(true)
    expect(result.matches).toHaveLength(1)
    expect(result.matches[0]).toBe('puta')
  })

  it('detects multiple terms', () => {
    const result = checkContent('mierda de producto', 'vendedor imbecil')
    expect(result.flagged).toBe(true)
    expect(result.matches.length).toBeGreaterThanOrEqual(2)
  })

  it('normalizes accents before matching', () => {
    const result = checkContent('Título normal', 'esto es una pútá locura')
    expect(result.flagged).toBe(true)
    expect(result.matches).toContain('puta')
  })

  it('normalizes repeated characters before matching', () => {
    const result = checkContent('Título', 'mieeerdaaaa de servicio')
    expect(result.flagged).toBe(true)
    expect(result.matches).toContain('mierda')
  })

  it('does not flag partial word matches', () => {
    // "canal" contains "anal" — should NOT flag if "anal" appears mid-word
    const result = checkContent('Canal de WhatsApp', 'Únete al canal de noticias')
    expect(result.flagged).toBe(false)
  })

  it('detects multi-word spam phrases', () => {
    const result = checkContent('Trabaja desde casa', 'Gana dinero desde tu hogar')
    expect(result.flagged).toBe(true)
  })

  it('does not return duplicate matches', () => {
    const result = checkContent('puta puta puta', 'mierda de servicio')
    const uniqueMatches = new Set(result.matches)
    expect(uniqueMatches.size).toBe(result.matches.length)
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- keywords.test.ts
```

Expected: `Cannot find module '@/lib/moderation/keywords'`

- [ ] **Step 3: Implement the module**

Create `lib/moderation/keywords.ts`:

```ts
const BLOCKED_WORDS: string[] = [
  // Colombian Spanish profanity
  'puta', 'puto', 'mierda', 'hijueputa', 'verga', 'culo', 'pendejo', 'pendeja',
  'marica', 'gonorrea', 'malparido', 'malparida', 'maldito', 'maldita', 'carajo',
  'coño', 'joder', 'cabron', 'cabrona', 'idiota', 'imbecil', 'estupido', 'estupida',
  'animal', 'bestia', 'zorra', 'hp', 'ptm', 'verraco', 'maricada', 'chinga',
  'chingada', 'putada', 'mamarracho', 'huevon', 'huevona', 'capullo', 'gilipollas',
  'polla', 'pajero', 'pajera', 'boludo', 'boluda', 'pelotudo', 'pelotuda',
  'sorete', 'culero', 'culera', 'maricon', 'pinga', 'gonorrhea',
  // Spam phrases (multi-word must come before single-word to avoid double-matching)
  'gana dinero rapido', 'gana dinero', 'trabaja desde casa', 'inversion segura',
  'gratis garantizado', 'ganar dinero', 'ingresos pasivos', 'multinivel',
  'click aqui', 'haz clic aqui', 'oferta limitada',
]

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')  // strip combining diacritic marks
    .replace(/(.)\1{2,}/g, '$1$1')   // collapse 3+ repeated chars (puuuta → puta)
}

export function checkContent(
  title: string,
  content: string
): { flagged: boolean; matches: string[] } {
  const combined = normalize(`${title} ${content}`)
  const matches: string[] = []

  for (const word of BLOCKED_WORDS) {
    if (matches.includes(word)) continue
    const normalizedWord = normalize(word)
    const escaped = normalizedWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

    const matched = normalizedWord.includes(' ')
      ? combined.includes(normalizedWord)                              // multi-word: substring match
      : new RegExp(`\\b${escaped}\\b`).test(combined)                 // single word: whole-word match

    if (matched) matches.push(word)
  }

  return { flagged: matches.length > 0, matches }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- keywords.test.ts
```

Expected: `Tests: 8 passed`

- [ ] **Step 5: Commit**

```bash
git add lib/moderation/keywords.ts __tests__/lib/moderation/keywords.test.ts
git commit -m "feat(moderation): add Spanish keyword blocklist with accent/repeat normalization"
```

---

## Task 4: Twilio WhatsApp Client (TDD)

**Files:**
- Create: `lib/twilio.ts`
- Create: `__tests__/lib/twilio.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/lib/twilio.test.ts`:

```ts
import { normalizeColombianPhone } from '@/lib/twilio'

describe('normalizeColombianPhone', () => {
  it('adds +57 prefix to 10-digit Colombian mobile number', () => {
    expect(normalizeColombianPhone('3001234567')).toBe('+573001234567')
  })

  it('adds + to number already containing 57 country code', () => {
    expect(normalizeColombianPhone('573001234567')).toBe('+573001234567')
  })

  it('returns already-normalized E.164 number unchanged', () => {
    expect(normalizeColombianPhone('+573001234567')).toBe('+573001234567')
  })

  it('strips non-digit chars before normalizing', () => {
    expect(normalizeColombianPhone('(300) 123-4567')).toBe('+573001234567')
  })

  it('handles number stored with spaces', () => {
    expect(normalizeColombianPhone('300 123 4567')).toBe('+573001234567')
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- twilio.test.ts
```

Expected: `Cannot find module '@/lib/twilio'`

- [ ] **Step 3: Implement the module**

Create `lib/twilio.ts`:

```ts
import twilio from 'twilio'

export function normalizeColombianPhone(phone: string): string {
  if (phone.startsWith('+')) {
    return phone.replace(/[^\d+]/g, '')
  }
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('57') && digits.length === 12) return `+${digits}`
  if (digits.length === 10 && digits.startsWith('3')) return `+57${digits}`
  return `+${digits}`
}

function getClient() {
  return twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!)
}

export async function sendWhatsAppMessage(to: string, body: string): Promise<void> {
  await getClient().messages.create({
    from: process.env.TWILIO_WHATSAPP_FROM!,
    to: `whatsapp:${normalizeColombianPhone(to)}`,
    body,
  })
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- twilio.test.ts
```

Expected: `Tests: 5 passed`

- [ ] **Step 5: Commit**

```bash
git add lib/twilio.ts __tests__/lib/twilio.test.ts
git commit -m "feat(twilio): add WhatsApp client with Colombian phone normalization"
```

---

## Task 5: Email Notification Functions

**Files:**
- Modify: `lib/email/resend.ts` (append two new functions)

- [ ] **Step 1: Append `sendAlertNotificationEmail` to `lib/email/resend.ts`**

Add after the last existing function in the file:

```ts
export async function sendAlertNotificationEmail(
  email: string,
  alert: {
    title: string
    description: string | null
    type: string
    severity: string
    communitySlug: string
  }
): Promise<void> {
  const severityColor =
    alert.severity === 'critical' ? '#c0392b'
    : alert.severity === 'warning' ? '#e67e22'
    : '#2980b9'

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `⚠️ Alerta en tu comunidad: ${alert.title}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px;">
          Barrio<span style="color: #c0392b;">Red</span>
        </h1>
        <div style="background: ${severityColor}; color: white; padding: 8px 12px; display: inline-block; font-weight: bold; text-transform: uppercase; margin-bottom: 16px; letter-spacing: 1px;">
          ${alert.type.toUpperCase()} — ${alert.severity.toUpperCase()}
        </div>
        <h2 style="margin: 0 0 12px; font-size: 20px;">${alert.title}</h2>
        ${alert.description ? `<p style="color: #333;">${alert.description}</p>` : ''}
        <p>
          <a href="https://barriored.co/${alert.communitySlug}/community"
             style="background: #c0392b; color: white; padding: 10px 20px; text-decoration: none; font-weight: bold; text-transform: uppercase; display: inline-block; margin-top: 8px;">
            Ver en BarrioRed
          </a>
        </p>
        <p style="color: #666; font-size: 12px; margin-top: 32px;">BarrioRed — Tu comunidad digital</p>
      </div>
    `,
  })
}

export async function sendAdminFlaggedContentEmail(
  adminEmail: string,
  content: {
    type: 'post' | 'review'
    title: string
    reason: string
    adminPanelUrl: string
  }
): Promise<void> {
  const typeLabel = content.type === 'post' ? 'publicación' : 'reseña'

  await resend.emails.send({
    from: FROM,
    to: adminEmail,
    subject: `🚩 Contenido reportado en tu comunidad`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px;">
          Barrio<span style="color: #c0392b;">Red</span>
        </h1>
        <p>Se ha reportado una ${typeLabel} en tu comunidad que requiere revisión:</p>
        <div style="background: #f5f5f5; border-left: 4px solid #c0392b; padding: 12px 16px; margin: 16px 0;">
          <strong style="display: block; margin-bottom: 4px;">${content.title}</strong>
          <span style="color: #666; font-size: 14px;">Motivo del reporte: ${content.reason}</span>
        </div>
        <p>
          <a href="${content.adminPanelUrl}"
             style="background: #c0392b; color: white; padding: 10px 20px; text-decoration: none; font-weight: bold; text-transform: uppercase; display: inline-block;">
            Revisar en Panel Admin
          </a>
        </p>
        <p style="color: #666; font-size: 12px; margin-top: 32px;">BarrioRed — Panel de Administración</p>
      </div>
    `,
  })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/email/resend.ts
git commit -m "feat(email): add alert notification and admin flagged content email functions"
```

---

## Task 6: Community Notification Orchestration Module

**Files:**
- Create: `lib/notifications/community.ts`

This module uses `createAdminClient()` (service role key, no request cookies needed) so it is safe to call from fire-and-forget contexts.

- [ ] **Step 1: Create `lib/notifications/community.ts`**

```ts
import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendAlertNotificationEmail, sendAdminFlaggedContentEmail } from '@/lib/email/resend'
import { sendWhatsAppMessage } from '@/lib/twilio'

if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:support@barriored.co',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

type PushPayload = { title: string; body: string; url: string }

async function getProfilesForCommunity(
  communityId: string
): Promise<{ id: string; phone: string | null }[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('profiles')
    .select('id, phone')
    .eq('community_id', communityId)
  return data ?? []
}

async function getAdminProfilesForCommunity(
  communityId: string
): Promise<{ id: string }[]> {
  const admin = createAdminClient()
  const { data } = await (admin as any)
    .from('profiles')
    .select('id')
    .eq('community_id', communityId)
    .or('role.eq.admin,is_super_admin.eq.true')
  return data ?? []
}

export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  if (userIds.length === 0) return { sent: 0, failed: 0 }

  const admin = createAdminClient()
  const { data: subscriptions } = await (admin as any)
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth, user_id')
    .in('user_id', userIds)

  if (!subscriptions?.length) return { sent: 0, failed: 0 }

  const body = JSON.stringify(payload)
  let sent = 0
  let failed = 0

  await Promise.allSettled(
    subscriptions.map(async (sub: any) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body
        )
        sent++
      } catch (err: any) {
        failed++
        if (err.statusCode === 410) {
          await admin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
        }
      }
    })
  )

  return { sent, failed }
}

export function sendCommunityAlertNotifications(
  communityId: string,
  alert: {
    title: string
    description: string | null
    type: string
    severity: string
    communitySlug: string
  }
): void {
  Promise.resolve().then(async () => {
    try {
      const profiles = await getProfilesForCommunity(communityId)
      const userIds = profiles.map(p => p.id)

      // Email — fetch auth emails via admin API (paginated, 1000 per page is enough for MVP)
      const admin = createAdminClient()
      const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
      const communityUserSet = new Set(userIds)
      const emails = users.filter(u => communityUserSet.has(u.id) && u.email).map(u => u.email!)

      const BATCH = 50
      for (let i = 0; i < emails.length; i += BATCH) {
        await Promise.allSettled(
          emails.slice(i, i + BATCH).map(email =>
            sendAlertNotificationEmail(email, alert)
              .catch(err => console.error(`Alert email failed for ${email}:`, err))
          )
        )
        if (i + BATCH < emails.length) await new Promise(r => setTimeout(r, 100))
      }

      // Push
      await sendPushToUsers(userIds, {
        title: `⚠️ Alerta: ${alert.title}`,
        body: alert.description ?? alert.title,
        url: `https://barriored.co/${alert.communitySlug}/community`,
      }).catch(err => console.error('Alert push failed:', err))

      // WhatsApp
      const phonesRaw = profiles.filter(p => p.phone).map(p => p.phone!)
      await Promise.allSettled(
        phonesRaw.map(phone =>
          sendWhatsAppMessage(
            phone,
            `🚨 *Alerta BarrioRed*: ${alert.title}\n${alert.description ?? ''}\nVer más: barriored.co/${alert.communitySlug}/community`
          ).catch(err => console.error(`WhatsApp failed for ${phone}:`, err))
        )
      )
    } catch (err) {
      console.error('[sendCommunityAlertNotifications] Unhandled error:', err)
    }
  })
}

export function sendAdminFlaggedContentNotification(
  communityId: string,
  content: {
    type: 'post' | 'review'
    title: string
    reason: string
    adminPanelUrl: string
  }
): void {
  Promise.resolve().then(async () => {
    try {
      const adminProfiles = await getAdminProfilesForCommunity(communityId)
      const adminIds = adminProfiles.map(p => p.id)
      if (adminIds.length === 0) return

      const admin = createAdminClient()
      const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
      const adminIdSet = new Set(adminIds)
      const adminEmails = users.filter(u => adminIdSet.has(u.id) && u.email).map(u => u.email!)

      await Promise.allSettled(
        adminEmails.map(email =>
          sendAdminFlaggedContentEmail(email, content)
            .catch(err => console.error(`Admin flag email failed for ${email}:`, err))
        )
      )

      await sendPushToUsers(adminIds, {
        title: `🚩 Nuevo reporte`,
        body: `${content.title} — Motivo: ${content.reason}`,
        url: content.adminPanelUrl,
      }).catch(err => console.error('Admin flag push failed:', err))
    } catch (err) {
      console.error('[sendAdminFlaggedContentNotification] Unhandled error:', err)
    }
  })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/notifications/community.ts
git commit -m "feat(notifications): add community notification orchestration module"
```

---

## Task 7: Wire Alert Notifications into Alert Creation

**Files:**
- Modify: `app/api/community/alerts/route.ts`

- [ ] **Step 1: Update the POST handler**

Replace the current `POST` function in `app/api/community/alerts/route.ts` with:

```ts
import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAlertSchema } from '@/lib/validations/community'
import { sendCommunityAlertNotifications } from '@/lib/notifications/community'

export async function GET(request: NextRequest) {
    const supabase = await createClient()
    const communityId = new URL(request.url).searchParams.get('community_id')
    if (!communityId) return NextResponse.json({ error: 'community_id requerido' }, { status: 400 })

    const { data, error } = await supabase
        .from('community_alerts')
        .select('*')
        .eq('community_id', communityId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
}

export async function POST(request: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single() as { data: any }
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const body = await request.json()
    const parsed = createAlertSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })

    const { data, error } = await (supabase as any)
        .from('community_alerts')
        .insert({
            ...parsed.data,
            author_id: user.id,
            severity: parsed.data.severity as 'info' | 'warning' | 'critical',
            type: parsed.data.type as 'water' | 'power' | 'security' | 'construction' | 'general'
        })
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Fire-and-forget: fetch community slug then send notifications
    const { data: community } = await supabase
        .from('communities')
        .select('slug')
        .eq('id', parsed.data.community_id)
        .single() as { data: { slug: string } | null }

    if (community?.slug) {
        sendCommunityAlertNotifications(parsed.data.community_id, {
            title: parsed.data.title,
            description: parsed.data.description ?? null,
            type: parsed.data.type,
            severity: parsed.data.severity,
            communitySlug: community.slug,
        })
    }

    return NextResponse.json(data, { status: 201 })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Manual test — create an alert via admin panel**

Start the dev server (`npm run dev`), log in as admin, create a new community alert. Check:
- Alert is created (appears in community page)
- Server logs show no errors for notification dispatch
- (With real Resend/Twilio credentials) emails and WhatsApp arrive

- [ ] **Step 4: Commit**

```bash
git add app/api/community/alerts/route.ts
git commit -m "feat(alerts): send email + push + WhatsApp notifications on alert creation"
```

---

## Task 8: Wire Spam Check into Post Creation

**Files:**
- Modify: `app/api/community/posts/route.ts`

- [ ] **Step 1: Add import and spam check to the POST handler**

At the top of `app/api/community/posts/route.ts`, add:
```ts
import { checkContent } from '@/lib/moderation/keywords'
```

Inside the `POST` function, after validation passes and before the DB insert (after `const { type, title, content, image_url, community_id, ...rest } = parsed.data`), insert:

```ts
    // Spam/profanity moderation
    const moderation = checkContent(title, content)
    if (moderation.matches.length >= 2) {
        return NextResponse.json(
            { error: 'Tu publicación contiene contenido no permitido. Por favor revisa el texto.' },
            { status: 400 }
        )
    }
    const moderationFlag = moderation.matches.length === 1
```

Then, in the `.insert({...})` call, add `moderation_flag: moderationFlag` to the insert object:

```ts
    const { data, error } = await (supabase as any)
        .from('community_posts')
        .insert({
            type,
            title,
            content,
            image_url: image_url ?? null,
            community_id,
            author_id: user.id,
            metadata,
            status: 'pending',
            moderation_flag: moderationFlag,
        })
        .select()
        .single()
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Manual test — submit a post with blocked content**

```bash
curl -X POST http://localhost:3000/api/community/posts \
  -H "Content-Type: application/json" \
  -H "Cookie: <your-session-cookie>" \
  -d '{"type":"announcement","title":"puta oferta","content":"gran oportunidad","community_id":"<community-uuid>"}'
```

Expected: `400` with `"Tu publicación contiene contenido no permitido"` when 2+ keywords hit; `201` (pending) with `moderation_flag: true` for exactly 1 keyword hit.

- [ ] **Step 4: Commit**

```bash
git add app/api/community/posts/route.ts
git commit -m "feat(moderation): run keyword spam check on community post creation"
```

---

## Task 9: Community Post Flag Endpoint

**Files:**
- Create: `app/api/community/posts/[id]/flag/route.ts`

- [ ] **Step 1: Create the flag route**

Create `app/api/community/posts/[id]/flag/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { sendAdminFlaggedContentNotification } from '@/lib/notifications/community'

const FlagSchema = z.object({
  reason: z.string().min(3, 'El motivo debe tener al menos 3 caracteres').max(200),
})

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: 'ID inválido.' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })

    const body = await request.json()
    const parsed = FlagSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    // Get the post and its community
    const { data: post, error: postError } = await (supabase as any)
      .from('community_posts')
      .select('id, title, community_id, author_id, communities!inner(slug)')
      .eq('id', id)
      .eq('status', 'approved')
      .single()

    if (postError || !post) {
      return NextResponse.json({ error: 'Publicación no encontrada.' }, { status: 404 })
    }

    // Users cannot flag their own posts
    if (post.author_id === user.id) {
      return NextResponse.json({ error: 'No puedes reportar tu propia publicación.' }, { status: 400 })
    }

    // Check for duplicate report by this user
    const { data: existing } = await (supabase as any)
      .from('community_reports')
      .select('id')
      .eq('reported_entity_id', id)
      .eq('reporter_id', user.id)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Ya reportaste esta publicación.' }, { status: 400 })
    }

    // Count existing reports to decide if admin notification is needed
    const { count: existingCount } = await (supabase as any)
      .from('community_reports')
      .select('*', { count: 'exact', head: true })
      .eq('reported_entity_id', id)
      .eq('reported_entity_type', 'post')

    // Insert the report
    const { error: insertError } = await (supabase as any)
      .from('community_reports')
      .insert({
        community_id: post.community_id,
        reporter_id: user.id,
        reported_entity_id: id,
        reported_entity_type: 'post',
        reason: parsed.data.reason,
        status: 'pending',
      })

    if (insertError) {
      console.error('Error inserting community report:', insertError)
      return NextResponse.json({ error: 'Error al reportar.' }, { status: 500 })
    }

    // Notify admins only on first report (avoids flooding)
    if ((existingCount ?? 0) === 0) {
      const communitySlug = (post.communities as any).slug as string
      sendAdminFlaggedContentNotification(post.community_id, {
        type: 'post',
        title: post.title,
        reason: parsed.data.reason,
        adminPanelUrl: `https://barriored.co/admin/community-posts`,
      })
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (err) {
    console.error('Error in POST /api/community/posts/[id]/flag:', err)
    return NextResponse.json({ error: 'Error al reportar.' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Manual test**

```bash
curl -X POST http://localhost:3000/api/community/posts/<post-uuid>/flag \
  -H "Content-Type: application/json" \
  -H "Cookie: <your-session-cookie>" \
  -d '{"reason":"Contenido ofensivo"}'
```

Expected: `201 { "success": true }`. Check Supabase `community_reports` table for the new row. Admin should receive email + push (first flag only).

- [ ] **Step 4: Commit**

```bash
git add app/api/community/posts/[id]/flag/route.ts
git commit -m "feat(community): add post flag endpoint with admin notification on first report"
```

---

## Task 10: Wire Admin Notification into Review Flagging

**Files:**
- Modify: `app/api/reviews/[reviewId]/flag/route.ts`

- [ ] **Step 1: Verify the review text column name**

Check `supabase/migrations/20260313000001_create_reviews_tables.sql` or the `business_reviews` table in Supabase Dashboard. The text column is either `content` or `comment`. Update the code below if it differs.

- [ ] **Step 2: Add imports to the flag route**

At the top of `app/api/reviews/[reviewId]/flag/route.ts`, add:
```ts
import { sendAdminFlaggedContentNotification } from '@/lib/notifications/community'
```

Also update the import of `review` type to include `business community_id`. Find the `ReviewWithBusiness` type and update it:
```ts
type ReviewWithBusiness = {
  id: string
  business_id: string
  content: string
  businesses: {
    owner_id: string
    community_id: string
  }
}
```

Update the `select` call for the review to include `community_id`:
```ts
    const { data: review, error: reviewError } = await supabase
      .from('business_reviews')
      .select('id, business_id, content, businesses!inner(owner_id, community_id)')
      .eq('id', reviewId)
      .single()
```

- [ ] **Step 3: Add admin notification after flag insert succeeds**

After the existing `if (insertError)` block (after the flag is successfully created), add:

```ts
    // Notify admins on first flag only
    const { count: existingFlagCount } = await supabase
      .from('review_flags')
      .select('*', { count: 'exact', head: true })
      .eq('review_id', reviewId)

    if ((existingFlagCount ?? 0) <= 1) {
      const communityId = (review as ReviewWithBusiness).businesses.community_id
      // Use whichever column holds the review text in your business_reviews table
      const excerpt = ((review as any).content ?? (review as any).comment ?? '').toString().slice(0, 80)
      sendAdminFlaggedContentNotification(communityId, {
        type: 'review',
        title: excerpt || 'Reseña reportada',
        reason,
        adminPanelUrl: `https://barriored.co/admin/review-flags`,
      })
    }
```

Place this block immediately before the final `return NextResponse.json({ flag }, { status: 201 })` line.

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add app/api/reviews/[reviewId]/flag/route.ts
git commit -m "feat(reviews): notify community admins when a review is flagged"
```

---

## Task 11: Hourly Community Cron

**Files:**
- Create: `app/api/cron/community/route.ts`

- [ ] **Step 1: Create the cron route**

Create `app/api/cron/community/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUsers } from '@/lib/notifications/community'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date()

  // ── Step 1: Expire past events ──────────────────────────────────────────────
  const { data: expiredEvents, error: expiredEventsError } = await (admin as any)
    .from('community_posts')
    .update({ status: 'archived', updated_at: now.toISOString() })
    .eq('type', 'event')
    .eq('status', 'approved')
    .lt('metadata->>date', now.toISOString())
    .select('id')

  if (expiredEventsError) {
    console.error('Error expiring events:', expiredEventsError)
  }

  // ── Step 2: Archive filled jobs ─────────────────────────────────────────────
  const { data: archivedJobs, error: archivedJobsError } = await (admin as any)
    .from('community_posts')
    .update({ status: 'archived', updated_at: now.toISOString() })
    .eq('type', 'job')
    .eq('status', 'approved')
    .eq('metadata->>is_filled', 'true')
    .select('id')

  if (archivedJobsError) {
    console.error('Error archiving filled jobs:', archivedJobsError)
  }

  // ── Step 3: 24h event reminders ─────────────────────────────────────────────
  const from24h = new Date(now.getTime() + 23 * 60 * 60 * 1000)
  const to24h   = new Date(now.getTime() + 25 * 60 * 60 * 1000)

  const { data: candidates24h } = await (admin as any)
    .from('community_posts')
    .select('id, title, community_id, metadata, communities!inner(slug)')
    .eq('type', 'event')
    .eq('status', 'approved')
    .gte('metadata->>date', from24h.toISOString())
    .lte('metadata->>date', to24h.toISOString())

  let reminders24hSent = 0
  if (candidates24h?.length) {
    const candidateIds = candidates24h.map((p: any) => p.id)
    const { data: alreadySent24h } = await (admin as any)
      .from('cron_reminder_logs')
      .select('post_id')
      .in('post_id', candidateIds)
      .eq('type', '24h')

    const sentIds24h = new Set((alreadySent24h ?? []).map((r: any) => r.post_id))
    const toRemind24h = candidates24h.filter((p: any) => !sentIds24h.has(p.id))

    for (const post of toRemind24h) {
      try {
        const communityId = post.community_id
        const slug = (post.communities as any).slug as string

        const { data: profiles } = await (admin as any)
          .from('profiles')
          .select('id')
          .eq('community_id', communityId)

        const userIds = (profiles ?? []).map((p: any) => p.id)
        await sendPushToUsers(userIds, {
          title: `📅 Mañana: ${post.title}`,
          body: 'Recuerda que tienes un evento mañana en tu comunidad.',
          url: `https://barriored.co/${slug}/community`,
        })

        await (admin as any)
          .from('cron_reminder_logs')
          .insert({ post_id: post.id, type: '24h' })
          .throwOnError()

        reminders24hSent++
      } catch (err) {
        console.error(`24h reminder failed for post ${post.id}:`, err)
      }
    }
  }

  // ── Step 4: 1h event reminders ──────────────────────────────────────────────
  const from1h = new Date(now.getTime() + 0)
  const to1h   = new Date(now.getTime() + 2 * 60 * 60 * 1000)

  const { data: candidates1h } = await (admin as any)
    .from('community_posts')
    .select('id, title, community_id, metadata, communities!inner(slug)')
    .eq('type', 'event')
    .eq('status', 'approved')
    .gte('metadata->>date', from1h.toISOString())
    .lte('metadata->>date', to1h.toISOString())

  let reminders1hSent = 0
  if (candidates1h?.length) {
    const candidateIds = candidates1h.map((p: any) => p.id)
    const { data: alreadySent1h } = await (admin as any)
      .from('cron_reminder_logs')
      .select('post_id')
      .in('post_id', candidateIds)
      .eq('type', '1h')

    const sentIds1h = new Set((alreadySent1h ?? []).map((r: any) => r.post_id))
    const toRemind1h = candidates1h.filter((p: any) => !sentIds1h.has(p.id))

    for (const post of toRemind1h) {
      try {
        const communityId = post.community_id
        const slug = (post.communities as any).slug as string

        const { data: profiles } = await (admin as any)
          .from('profiles')
          .select('id')
          .eq('community_id', communityId)

        const userIds = (profiles ?? []).map((p: any) => p.id)
        await sendPushToUsers(userIds, {
          title: `⏰ En 1 hora: ${post.title}`,
          body: 'El evento comienza en aproximadamente 1 hora.',
          url: `https://barriored.co/${slug}/community`,
        })

        await (admin as any)
          .from('cron_reminder_logs')
          .insert({ post_id: post.id, type: '1h' })
          .throwOnError()

        reminders1hSent++
      } catch (err) {
        console.error(`1h reminder failed for post ${post.id}:`, err)
      }
    }
  }

  return NextResponse.json({
    success: true,
    eventsExpired: expiredEvents?.length ?? 0,
    jobsArchived: archivedJobs?.length ?? 0,
    reminders24hSent,
    reminders1hSent,
    timestamp: now.toISOString(),
  })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Manual test — invoke cron endpoint directly**

```bash
curl -H "Authorization: Bearer <your-CRON_SECRET-value>" \
  http://localhost:3000/api/cron/community
```

Expected:
```json
{ "success": true, "eventsExpired": 0, "jobsArchived": 0, "reminders24hSent": 0, "reminders1hSent": 0, "timestamp": "..." }
```

Without the auth header, expected: `401 { "error": "Unauthorized" }`.

- [ ] **Step 4: Commit**

```bash
git add app/api/cron/community/route.ts
git commit -m "feat(cron): add hourly community cron for event/job expiration and event reminders"
```

---

## Task 12: Configure Vercel Cron Schedule

**Files:**
- Modify: `vercel.json`

- [ ] **Step 1: Add hourly cron entry to `vercel.json`**

Replace the current content of `vercel.json` with:

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-expiration",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/community",
      "schedule": "0 * * * *"
    }
  ]
}
```

- [ ] **Step 2: Verify Vercel cron limit**

Vercel Hobby plan allows 2 cron jobs. Vercel Pro allows unlimited. With 2 total crons we are within the Hobby limit.

- [ ] **Step 3: Commit and deploy**

```bash
git add vercel.json
git commit -m "feat(cron): schedule hourly community automation cron on Vercel"
```

After deploying to Vercel, confirm both crons appear in the Vercel Dashboard → Project → Cron Jobs tab.

> **WhatsApp production note:** Twilio WhatsApp sandbox works for numbers you manually add. For sending to all community members in production, you must submit a message template to Meta for approval via the Twilio Console. Template format: `🚨 *Alerta BarrioRed*: {{1}}\n{{2}}\nVer más: barriored.co/{{3}}/community`

---

## All Tests

```bash
npm test
```

Expected: `Test Suites: 2 passed, Tests: 13 passed`
