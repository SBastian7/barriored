# Signup Email Verification — Auto Sign-In

**Goal:** Clicking the signup confirmation email link signs the user in (currently lands anonymous because `redirect_to` skips `/auth/callback`). The "check your email" waiting screen auto-detects verification (e.g. done in another tab) and signs the user in without a manual refresh.

**Architecture:** `app/auth/callback/route.ts` already exchanges a PKCE `code` for a session correctly — it's just never reached because `EmailSignupForm`'s `supabase.auth.signUp()` doesn't pass `emailRedirectTo`, so GoTrue uses the bare `site_url` (now `https://barrio.red`) instead. Cross-tab detection uses polling with a freshly constructed browser client each tick (the `@supabase/ssr` client's session state is cookie-backed and can go stale in a long-lived instance, so re-reading via a fresh client per poll is the reliable path) rather than relying on `onAuthStateChange`, since the session in the other tab is established via a server Route Handler (Set-Cookie), not through this tab's client instance.

---

## Task 1: Route the confirmation link through `/auth/callback`

**File:** `components/auth/signup-form.tsx`

- [x] In `EmailSignupForm.handleSignup`, add `options.emailRedirectTo: \`${window.location.origin}/auth/callback\`` to the `supabase.auth.signUp()` call.

## Task 2: Auto sign-in on the "check your email" screen

**File:** `components/auth/signup-form.tsx`

- [x] In `EmailSignupForm`, while `emailSent` is true, poll (every ~3s) for a session using a freshly constructed Supabase browser client per tick.
- [x] On detecting a signed-in user, stop polling and `router.push('/')` + `router.refresh()`.
- [x] Clear the interval on unmount.
