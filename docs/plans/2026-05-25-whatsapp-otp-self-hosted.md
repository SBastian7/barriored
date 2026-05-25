# WhatsApp OTP Self-Hosted Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace Twilio Verify (error 68008) with self-hosted OTP: codes stored in Supabase `whatsapp_otps` table, delivered via existing `sendWhatsAppMessage()`.

**Architecture:** New `lib/whatsapp-otp.ts` exports `sendOTP(phone)` and `verifyOTP(phone, code)`. A new migration adds the `whatsapp_otps` table. The three OTP API routes swap their Twilio Verify calls for the new helpers. No frontend changes.

**Tech Stack:** Next.js App Router API routes, Supabase service-role client, Twilio WhatsApp messaging (existing), Zod validation (existing).

---

### Task 1: Supabase migration — `whatsapp_otps` table

**Files:**
- Create: `supabase/migrations/20260525000000_add_whatsapp_otps_table.sql`

**Step 1: Create the migration file**

```sql
CREATE TABLE whatsapp_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX ON whatsapp_otps (phone, expires_at);
```

**Step 2: Apply via Supabase MCP**

Use `mcp__plugin_supabase_supabase__apply_migration` with the SQL above.

Expected: migration listed in `list_migrations`, table visible in `list_tables`.

**Step 3: Commit**

```bash
git add supabase/migrations/20260525000000_add_whatsapp_otps_table.sql
git commit -m "feat: add whatsapp_otps table for self-hosted OTP"
```

---

### Task 2: `lib/whatsapp-otp.ts` — OTP helpers

**Files:**
- Create: `lib/whatsapp-otp.ts`

**Step 1: Write the file**

```typescript
import { createClient } from '@supabase/supabase-js'
import { sendWhatsAppMessage, normalizeColombianPhone } from './twilio'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function sendOTP(phone: string): Promise<void> {
  const supabase = adminClient()
  const e164 = normalizeColombianPhone(phone)

  // Rate limit: max 3 active OTPs in 10 minutes
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
  const { count } = await supabase
    .from('whatsapp_otps')
    .select('*', { count: 'exact', head: true })
    .eq('phone', e164)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .gt('created_at', tenMinutesAgo)

  if ((count ?? 0) >= 3) {
    const err = new Error('Demasiados intentos. Espera antes de pedir otro codigo.') as any
    err.status = 429
    throw err
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString()
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()

  const { error } = await supabase.from('whatsapp_otps').insert({
    phone: e164,
    code,
    expires_at: expiresAt,
  })
  if (error) throw new Error('Error guardando OTP')

  await sendWhatsAppMessage(
    phone,
    `Tu código de verificación BarrioRed es: *${code}*. Válido por 5 minutos.`
  )
}

export async function verifyOTP(phone: string, code: string): Promise<boolean> {
  const supabase = adminClient()
  const e164 = normalizeColombianPhone(phone)

  const { data: row } = await supabase
    .from('whatsapp_otps')
    .select('id, code')
    .eq('phone', e164)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!row || row.code !== code) return false

  await supabase
    .from('whatsapp_otps')
    .update({ used_at: new Date().toISOString() })
    .eq('id', row.id)

  return true
}
```

**Step 2: Commit**

```bash
git add lib/whatsapp-otp.ts
git commit -m "feat: add self-hosted OTP helpers (sendOTP, verifyOTP)"
```

---

### Task 3: Update `send` route

**Files:**
- Modify: `app/api/auth/whatsapp-otp/send/route.ts`

**Step 1: Replace file contents**

```typescript
import { NextResponse } from 'next/server'
import { whatsappOtpSendSchema } from '@/lib/validations/auth'
import { sendOTP } from '@/lib/whatsapp-otp'

export async function POST(request: Request) {
  const body = await request.json()
  const parsed = whatsappOtpSendSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Numero invalido' }, { status: 400 })
  }

  try {
    await sendOTP(parsed.data.phone)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    if (err?.status === 429) {
      return NextResponse.json({ error: err.message }, { status: 429 })
    }
    console.error('[whatsapp-otp/send]', err)
    return NextResponse.json({ error: 'Error enviando OTP' }, { status: 500 })
  }
}
```

**Step 2: Commit**

```bash
git add app/api/auth/whatsapp-otp/send/route.ts
git commit -m "feat: send route uses self-hosted OTP"
```

---

### Task 4: Update `verify` route

**Files:**
- Modify: `app/api/auth/whatsapp-otp/verify/route.ts`

**Step 1: Replace the Twilio Verify import and check**

Change line 4 from:
```typescript
import { checkWhatsAppOTP } from '@/lib/twilio'
```
to:
```typescript
import { verifyOTP } from '@/lib/whatsapp-otp'
```

Change line 15 from:
```typescript
const valid = await checkWhatsAppOTP(phone, otp)
```
to:
```typescript
const valid = await verifyOTP(phone, otp)
```

**Step 2: Commit**

```bash
git add app/api/auth/whatsapp-otp/verify/route.ts
git commit -m "feat: verify route uses self-hosted OTP"
```

---

### Task 5: Update `link` route

**Files:**
- Modify: `app/api/auth/whatsapp-otp/link/route.ts`

**Step 1: Replace the Twilio Verify import and check**

Change line 6 from:
```typescript
import { checkWhatsAppOTP } from '@/lib/twilio'
```
to:
```typescript
import { verifyOTP } from '@/lib/whatsapp-otp'
```

Change line 30 from:
```typescript
const valid = await checkWhatsAppOTP(phone, otp)
```
to:
```typescript
const valid = await verifyOTP(phone, otp)
```

**Step 2: Commit**

```bash
git add app/api/auth/whatsapp-otp/link/route.ts
git commit -m "feat: link route uses self-hosted OTP"
```

---

### Task 6: Remove Twilio Verify from `lib/twilio.ts`

**Files:**
- Modify: `lib/twilio.ts`

**Step 1: Delete the two Verify functions**

Remove `sendWhatsAppOTP` (lines 25-30) and `checkWhatsAppOTP` (lines 32-42) entirely.

The file after cleanup should contain only:
- `normalizeColombianPhone`
- `getClient` (private)
- `sendWhatsAppMessage`

**Step 2: Verify no remaining imports**

```bash
grep -r "sendWhatsAppOTP\|checkWhatsAppOTP\|TWILIO_VERIFY" . --include="*.ts" --include="*.tsx" -l
```

Expected: no output (zero matches).

**Step 3: Commit**

```bash
git add lib/twilio.ts
git commit -m "chore: remove Twilio Verify functions from twilio.ts"
```

---

### Task 7: Final verification

**Step 1: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

**Step 2: Push**

```bash
git push origin master
```

---

## Environment Notes

- `TWILIO_VERIFY_SERVICE_SID` env var is now unused — can be removed from `.env.local` and Vercel, but not required.
- No frontend changes needed — API surface is identical.
- The `whatsapp_otps` table is accessed only via service role; no RLS needed.
