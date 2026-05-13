# Design: System / Automated Processes

**Date:** 2026-04-13  
**Phase:** MVP Phase 1 — Directorio

---

## Scope

Implement the remaining system/automated processes for the MVP phase. Two items are already complete and require no work.

### Already Implemented (no action needed)
- **Business data validation** — Zod schema (`lib/validations/business.ts`) + PostGIS boundary check in `app/api/businesses/route.ts`
- **RLS policies** — all key tables have `rls_enabled: true` with role-based policies in Supabase

---

## Features to Implement

### 1. Email Verification on Signup

**Mechanism:** Supabase Auth native — sends verification email on `signUp()` automatically when enabled in project settings.

**Changes required:**
- Enable "Confirm email" in Supabase Auth project settings (dashboard config, not code)
- Modify `components/auth/signup-form.tsx`: after successful `signUp()`, replace the redirect-to-`/` with a "Check your email" confirmation UI showing instructions to verify before logging in

---

### 2. Password Reset — Full Flow

**Mechanism:** Supabase Auth native email delivery.

**New files:**
- `app/auth/forgot-password/page.tsx` — email input form, calls `supabase.auth.resetPasswordForEmail()`, shows success state after submission
- `app/auth/reset-password/page.tsx` — new password form, reads token from URL hash on mount via `supabase.auth.onAuthStateChange('PASSWORD_RECOVERY')`, calls `supabase.auth.updateUser({ password })`, redirects to `/auth/login` on success

**Modified files:**
- `app/auth/login/page.tsx` (or login form component) — add "¿Olvidaste tu contraseña?" link pointing to `/auth/forgot-password`

---

### 3. Business Registration Confirmation Email (Resend)

**Mechanism:** Resend API called server-side from Next.js API routes. Simple HTML strings (no React Email).

**New files:**
- `lib/email/resend.ts` — Resend client singleton + helper functions:
  - `sendBusinessSubmittedEmail(ownerEmail, businessName)` — "tu negocio está en revisión"
  - `sendBusinessApprovedEmail(ownerEmail, businessName, communitySlug)` — "tu negocio fue aprobado"
  - `sendBusinessRejectedEmail(ownerEmail, businessName, reason)` — "tu negocio fue rechazado"

**Modified files:**
- `app/api/businesses/route.ts` — after successful insert, fire-and-forget `sendBusinessSubmittedEmail`
- `app/api/businesses/[id]/approve/route.ts` — after approval, send `sendBusinessApprovedEmail`
- `app/api/businesses/[id]/reject/route.ts` — after rejection, send `sendBusinessRejectedEmail`

**Config:**
- Add `RESEND_API_KEY` to `.env.local` and Vercel environment variables
- Add `RESEND_FROM_EMAIL` (e.g., `noreply@barriored.co`)

**Dependencies:**
- `npm install resend`

---

### 4. Image Optimization + Thumbnails (Sharp)

**Mechanism:** Sharp processes images server-side in the upload API routes before storing to Supabase Storage. All outputs are WebP.

**Dimensions:**
- Full image: max 1200px wide, quality 80, WebP
- Thumbnail: max 400px wide, quality 70, WebP, path suffix `-thumb`

**Modified files:**
- `app/api/upload/route.ts` — add Sharp processing, upload both full + thumbnail, return `{ url, thumbnailUrl }`
- `app/api/upload/community/route.ts` — same treatment
- `app/api/upload/profile/route.ts` — thumbnail only (no full-size needed for avatars; resize to 200px)

**Response change:** upload routes now return `{ url: string, thumbnailUrl: string }` instead of `{ url: string }`. Callers should be updated to handle `thumbnailUrl`.

**Dependencies:**
- `npm install sharp`
- `npm install --save-dev @types/sharp`

---

### 5. Error Logging — Wire Up Client

The `error_logs` table and `app/api/admin/logs/error/route.ts` already exist.

**New files:**
- `lib/logger.ts` — `logError(error: unknown, context?: Record<string, unknown>)` utility that POSTs to `/api/admin/logs/error` with error type, message, stack trace, and request context. Silent on failure (never throws).
- `components/shared/error-boundary.tsx` — React class error boundary that catches render errors and calls `logError`, renders a fallback UI

**Modified files:**
- `app/layout.tsx` — wrap children with `<ErrorBoundary>`
- Key API routes that currently only `console.error` — add `logError` call in catch blocks (businesses, upload, community posts)

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `RESEND_API_KEY` | Resend API authentication |
| `RESEND_FROM_EMAIL` | Sender address for transactional emails |

---

## Out of Scope

- React Email templates (plain HTML strings are sufficient for MVP)
- Rate limiting on error log endpoint (noted as TODO in existing code)
- Image optimization for existing stored images (new uploads only)
