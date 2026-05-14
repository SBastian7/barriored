# WhatsApp OTP Authentication — Design

**Date:** 2026-05-14  
**Approach:** A — Minimal wire-up (swap GetOTP.co → Twilio Verify, fix existing code)

---

## Context

The WhatsApp OTP auth system is already ~80% implemented but has two blockers:
1. `GETOTP_API_KEY` is a placeholder — the OTP provider was never configured.
2. After successful OTP verification the client never calls `supabase.auth.setSession()`, so users cannot actually log in.

Switching to Twilio Verify (WhatsApp channel) aligns with the existing `lib/twilio.ts` and removes the dependency on a third-party OTP service that isn't set up.

---

## Scope

| Feature | Status |
|---|---|
| Login with phone + WhatsApp OTP | Fix (session bug + provider swap) |
| Sign up with phone only (no email) | New tab in signup form |
| Resend OTP (60s cooldown) | New |
| Link phone number to email account | New API route + profile UI |
| Phone uniqueness constraint in DB | New migration |

---

## Architecture

### Files Changed

| File | Change |
|---|---|
| `app/api/auth/whatsapp-otp/send/route.ts` | Replace GetOTP.co → Twilio Verify |
| `app/api/auth/whatsapp-otp/verify/route.ts` | Replace GetOTP.co check → Twilio check |
| `app/api/auth/whatsapp-otp/link/route.ts` | **New** — link phone to authenticated user |
| `components/auth/login-form.tsx` | Fix `setSession()`, add `PhoneInput`, add resend |
| `components/auth/signup-form.tsx` | Add "Con WhatsApp" tab |
| Profile settings component | Add "Vincular WhatsApp" section |
| `.env.local` | Add `TWILIO_VERIFY_SERVICE_SID` |
| `supabase/migrations/` | Unique index on `profiles.phone` |

### Environment Variables

```
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_VERIFY_SERVICE_SID=VAxx   # create in Twilio Console > Verify > Services
```

---

## Auth Flows

### 1. Login via WhatsApp OTP

1. User enters phone via `<PhoneInput>` (Colombia +57 default)
2. `POST /api/auth/whatsapp-otp/send` → `twilio.verify.v2.services(SID).verifications.create({ to: "+57XXX", channel: "whatsapp" })`
3. User enters 6-digit code; resend available after 60s
4. `POST /api/auth/whatsapp-otp/verify` → Twilio `verificationChecks.create({ to, code })` → find/create Supabase user → generate magic link → `verifyOtp` → return `{ access_token, refresh_token }`
5. Client: `supabase.auth.setSession({ access_token, refresh_token })` → redirect

> Twilio manages OTP state by phone number — `request_id` is no longer needed.

### 2. Phone-only Signup

- New "Con WhatsApp" tab in signup form
- Fields: `full_name`, phone (via `PhoneInput`), `community_id`
- Step 1: send OTP; Step 2: verify OTP + create account
- Account created with synthetic email: `${phone}@phone.barriored.co`
- Profile updated with `full_name` and `community_id`

### 3. Link Phone to Email Account

- Section in profile settings: "Vincular número de WhatsApp" (only visible when `profile.phone` is null)
- Same 2-step OTP flow
- `POST /api/auth/whatsapp-otp/link` (requires valid session cookie)
- Route uses service role to `UPDATE profiles SET phone = $1 WHERE id = $2`

---

## Data Model

No new columns needed. One migration:

```sql
-- Prevent duplicate WhatsApp accounts
CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_unique
ON profiles (phone) WHERE phone IS NOT NULL;
```

---

## Error Handling

| Case | Response |
|---|---|
| Phone already linked to another account | 409 → "Este número ya está registrado" |
| Invalid or expired OTP | 400 → "Código inválido o expirado" |
| Twilio rate limit | 429 → "Demasiados intentos. Espera antes de pedir otro código" |
| Community not selected (phone signup) | Client-side validation before OTP send |
| Resend cooldown | Disabled button + countdown, no API call |

---

## Components

### `WhatsAppOTPLogin` (in login-form.tsx)
- Replace `<Input>` with `<PhoneInput>` component
- Add `resendCooldown` state (60s countdown using `setInterval`)
- After `verifyOTP` succeeds: call `supabase.auth.setSession()`

### Signup form — new "Con WhatsApp" tab
- Fields: nombre, teléfono, comunidad
- Inline 2-step OTP (same pattern as login WhatsApp tab)
- After verify: creates user → redirects

### Profile settings — "Vincular WhatsApp"
- Collapsible card, hidden when `profile.phone` is already set
- Same 2-step OTP inline component (extract as `<WhatsAppOTPFlow>`)
