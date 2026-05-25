# WhatsApp OTP Self-Hosted Design

**Date:** 2026-05-25  
**Replaces:** Twilio Verify (error 68008 — requires paid upgrade)  
**Approach:** Self-hosted OTP — codes stored in Supabase, delivered via existing `sendWhatsAppMessage()`

---

## Context

The Twilio Verify WhatsApp channel requires a paid Twilio upgrade (error 68008). The project already has a working Twilio WhatsApp sender (`sendWhatsAppMessage` in `lib/twilio.ts`). Self-hosting OTP codes in Supabase removes the Twilio Verify dependency entirely, is free at any scale, and requires no new third-party accounts.

---

## Database

New table `whatsapp_otps`:

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

- Accessed only via service role — no RLS required
- Expired rows are inert (queries filter by `expires_at > now()`) — no cleanup cron needed
- Rate limiting enforced in application: max 3 unused OTPs per phone in 10 minutes

---

## OTP Helpers (`lib/whatsapp-otp.ts`)

Three functions extracted for reuse across all three routes:

```typescript
sendOTP(phone: string): Promise<void>
// Rate-check → generate code → insert row → sendWhatsAppMessage

verifyOTP(phone: string, code: string): Promise<boolean>
// Query latest unused non-expired row → mark used → return valid/invalid
```

---

## OTP Lifecycle

### Send
1. Validate phone (existing Zod schema — no change)
2. Rate limit: count active (unused + not expired) OTPs for phone in last 10 min → 429 if ≥ 3
3. Generate 6-digit code: `Math.floor(100000 + Math.random() * 900000).toString()`
4. Insert to `whatsapp_otps` with `expires_at = now() + interval '5 minutes'`
5. `sendWhatsAppMessage(phone, "Tu código de verificación BarrioRed es: *${code}*. Válido por 5 minutos.")`
6. Return `{ success: true }` — no `request_id`

### Verify
1. Validate `{ phone, otp }` (no `request_id` — looks up by phone)
2. Query: `SELECT * FROM whatsapp_otps WHERE phone = $1 AND used_at IS NULL AND expires_at > now() ORDER BY created_at DESC LIMIT 1`
3. Check `row.code === otp` — if mismatch or no row → 400
4. `UPDATE whatsapp_otps SET used_at = now() WHERE id = $row.id`
5. Continue with find/create Supabase user → session

### Link (authenticated users)
- Same verify logic as above, then update `profiles.phone`

---

## Files Changed

| File | Type | Change |
|---|---|---|
| `supabase/migrations/20260525000000_add_whatsapp_otps_table.sql` | New | Table + index |
| `lib/whatsapp-otp.ts` | New | `sendOTP`, `verifyOTP` helpers |
| `lib/twilio.ts` | Modify | Remove `sendWhatsAppOTP`, `checkWhatsAppOTP` (Twilio Verify) |
| `app/api/auth/whatsapp-otp/send/route.ts` | Modify | Use `sendOTP` from helpers |
| `app/api/auth/whatsapp-otp/verify/route.ts` | Modify | Use `verifyOTP` from helpers |
| `app/api/auth/whatsapp-otp/link/route.ts` | Modify | Use `verifyOTP` from helpers |

**No frontend changes** — API surface is identical from the browser's perspective.

---

## Error Handling

| Case | Response |
|---|---|
| Rate limit exceeded (≥3 OTPs in 10 min) | 429 — "Demasiados intentos..." |
| Invalid/expired/already-used code | 400 — "Código inválido o expirado" |
| `sendWhatsAppMessage` fails | 500 — "Error enviando OTP" |
| Phone not found in profiles (login) | Creates new user (existing logic) |
