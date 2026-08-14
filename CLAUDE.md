# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is BarrioRed?

Community digital platform that democratizes commercial visibility and strengthens the social fabric in popular economy neighborhoods. Hyperlocal, multi-tenant, replicable, and low-cost.

**Pilot:** Parque Industrial, Comuna del Cafe, Pereira, Risaralda, Colombia (+30,000 inhabitants)

**Core value:** "Infraestructura digital comunitaria que democratiza la visibilidad comercial y fortalece el tejido social en barrios de economia popular"

## Commands

Package manager is **pnpm** (`packageManager: pnpm@11.5.0`, `pnpm-lock.yaml`) — do not use npm/yarn.

```bash
pnpm dev              # Start dev server (localhost:3000)
pnpm build            # Compile service worker (scripts/build-sw.js) then next build — always run both, not `next build` alone
pnpm build:sw         # Rebuild only the PWA service worker (app/sw.ts -> public/sw.js via esbuild)
pnpm start            # Serve production build
pnpm lint             # ESLint (flat config, eslint-config-next core-web-vitals + typescript)
pnpm test             # Jest (all tests)
pnpm exec jest __tests__/lib/twilio.test.ts   # Run a single test file
pnpm audit:check      # pnpm audit at moderate severity
```

Tests live in `__tests__/**/*.test.ts` (Jest via `next/jest`, `testEnvironment: 'node'`, `@/*` alias mapped). Coverage is currently thin (moderation keyword filter, Twilio helper) — most correctness relies on manual QA, see `TESTING.md`.

No database CLI scripts are wired up; Supabase migrations in `supabase/migrations/` are applied directly against the project (numbered/timestamped `.sql` files, chronological — read the latest few before altering schema to see current RLS conventions).

## Tech Stack

- **Frontend:** Next.js 16 (App Router, PWA) + React 19 + Tailwind CSS 4
- **Backend/DB:** Supabase (PostgreSQL, Auth, Storage, RLS)
- **Maps:** Leaflet + React-Leaflet (+ leaflet-draw for boundary editing, @turf/turf for geo math)
- **UI:** Radix UI primitives + custom components (`components.json` = shadcn-style setup)
- **Auth:** Supabase Auth (email + WhatsApp OTP via Twilio/getotp)
- **PWA:** Serwist (service worker built separately, see Commands)
- **Language:** TypeScript throughout, strict mode

## Architecture - Multi-Tenant

Routes follow pattern: `/{community-slug}/...`

```
barriored.co/parqueindustrial  -> Pilot instance
barriored.co/cuba              -> Future expansion
barriored.co/villasantana      -> Future expansion
```

Community resolution happens in `app/[community]/layout.tsx`: it looks up `communities` by `slug` (must be `is_active = true` or 404s), then wraps children in `CommunityProvider` (`components/community/community-provider.tsx`) so any client component can call `useCommunity()` instead of re-fetching. Each community-scoped table carries a `community_id` FK; isolation between tenants is enforced at the database layer via RLS, not just in application code.

## Auth & Authorization

Three layers, all must be kept in sync when changing access rules:

1. **`proxy.ts`** (repo root) — Next.js 16's request-interception convention (replaces the old `middleware.ts`). Redirects logged-in users away from `/auth/*`, gates `/dashboard`, `/admin`, `/profile` behind auth, and additionally requires `admin`/`moderator`/super-admin role for `/admin/*`. Note `lib/supabase/middleware.ts` (`updateSession`) is a separate suspended-user check referenced from docs but not wired into `proxy.ts` — check both before assuming session/suspension handling is complete when touching auth flow.
2. **`lib/auth/permissions.ts`** — `getPermissions(role, isSuperAdmin)` returns a `UserPermissions` capability object; `isStaff()` / `isAdmin()` helpers. This is the single source of truth for what each role can do — update here, not by scattering role checks.
3. **`lib/auth/api-protection.ts`** — `requirePermission(permission, supabase)` for API routes; fetches the caller's profile, checks `is_suspended`, then checks the permission from layer 2. Use this instead of hand-rolling auth checks in new `app/api/**/route.ts` handlers.
4. **RLS policies** (`supabase/migrations/*_rls_policies.sql`, `*_fix_multi_tenant_rls.sql`, etc.) — the last line of defense; community isolation and role checks are also enforced in Postgres, independent of the app-layer checks above.

## Role-Based Access Control

- **Super Admin** (`profiles.is_super_admin = true`) — platform-wide, all communities.
- **Community Admin** (`profiles.role = 'admin'`) — full access, scoped to own `community_id`.
- **Community Moderator** (`profiles.role = 'moderator'`) — community posts/alerts/reports only; cannot manage businesses, users, or public services.
- **Regular User** (`profiles.role = 'user'`) — views approved content, creates businesses/community posts, edits/deletes own content only.

Exact per-role booleans are defined in `lib/auth/permissions.ts` — treat that file as authoritative over this list.

## Project Structure

```
app/
  [community]/           # Multi-tenant community routes (layout resolves slug -> CommunityProvider)
    page.tsx             # Community homepage (hero + categories + featured)
    directory/[category] # Business directory, category-filtered
    business/[slug]/     # Individual business profile
    map/                 # Map view of all businesses
    register/            # Business registration form
    community/           # Neighborhood social board (announcements, alerts, events, jobs)
    marketplace/         # Local buy/sell classifieds
    services/            # Public services + emergency directory
  auth/                  # Login, signup, callback, password reset
  admin/                 # Admin panel (businesses, users, community, marketplace, reviews, statistics, platform...)
  dashboard/              # Merchant dashboard (business, marketplace, reviews)
  api/                    # Route handlers, one subfolder per resource (businesses, community, marketplace, notifications, upload, cron, ...)
  actions/                # Server actions (e.g. classified-actions.ts)

components/               # One folder per domain (admin, business, community, marketplace, directory, registration, pwa, ui, ...)
lib/
  supabase/               # client.ts (browser), server.ts (RSC), admin.ts (service role), middleware.ts (suspended-user check)
  auth/                   # permissions.ts, api-protection.ts — see Auth & Authorization above
  validations/            # Zod schemas (auth, business, community, service-feedback, common)
  moderation/             # Keyword filters for community posts / marketplace listings
  notifications/          # Push notification composition for community + marketplace events
  types/                  # database.ts (generated Supabase types), supabase.ts, index.ts (app-level types)

supabase/migrations/      # Chronological .sql migrations — schema, RLS, storage, and Postgres functions all live here
```

## Database (Supabase)

Key tables: `communities`, `businesses` (FK to community), `categories`, `profiles` (linked to Supabase Auth), `classifieds`/`marketplace_categories` (Phase 4), community posts (announcements/alerts/events/jobs), `reviews`, `push_subscriptions`.

Business statuses: `pending` -> `approved` / `rejected`.

Schema changes go in a new timestamped file under `supabase/migrations/`; RLS policies for a new table should be added in the same migration, following the pattern in the most recent `*_rls*` / `*security_hardening*` migrations.

## Brand Guidelines - Neo-Brutalist Tropical

- **Logo:** Location-pin isotipo carrying the italic sigla **BR** + the **BARRIO**(ink)/**RED**(red) wordmark. Single source of truth: `components/layout/logo.tsx` (`BrandMark`, `Wordmark`, `Logo`). Favicon `app/icon.svg`; PWA/app icons under `public/icons/` + `app/apple-icon.png`. Full spec in `docs/branding/guia-de-estilo.md`. Never recolor/distort the pin or drop its black border.
- **Style:** Neo-Brutalist with tropical Latin American warmth — 2-4px solid black borders always present, hard offset shadows (e.g. `shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`).
- **Typography:** Outfit (headings, font-black, uppercase, tracking-tighter, italic) + Inter (body).
- **Utility classes:** `.brutalist-button`, `.brutalist-card`, `.brutalist-input` — 2px black border + hard shadow + hover/focus lift.
- **Colors (oklch):** Primary/Barrio Red `oklch(0.57 0.23 18)`, Secondary/Sun Yellow `oklch(0.85 0.17 85)`, Accent/Street Art Blue `oklch(0.5 0.2 260)`, Background `oklch(0.99 0.01 60)`, Foreground `oklch(0.15 0.02 240)`, Borders pure black. Chart colors: Green `oklch(0.5 0.15 150)`, Warm/Terracotta `oklch(0.7 0.15 30)`.
- **Patterns:** rotated badges (`rotate-[-2deg]`) for playful elements; uppercase + tracking-widest for labels/nav; active states = primary bg + lifted shadow; disabled/coming-soon = reduced opacity + "Pronto" badge in secondary color; mobile-first with bottom nav on mobile, top nav on desktop.

For any UI/UX design work, use the UIUX promax skill.

## Key Differentiators to Preserve

1. **Informal business inclusion** - No RUT or Camara de Comercio required for basic registration
2. **WhatsApp-first** - WhatsApp is the primary CTA on business profiles (not phone calls or web)
3. **Hyperlocal** - One commune at a time, not city-wide
4. **Multi-tenant replicable** - Architecture supports multiple communities from day one
5. **Low cost** - Supabase free tier, Vercel/Hostinger hosting, minimal infrastructure

## Language & Content

- All user-facing content is in **Spanish (Colombia)**, informal "tu", warm/approachable tone.
- Technical/admin content and code can be in English.

## Conventions

- Use `'use client'` only when the component needs hooks/interactivity; server components by default for data fetching.
- Supabase server client (`lib/supabase/server.ts`) in server components/route handlers, browser client (`lib/supabase/client.ts`) in client components, admin client (`lib/supabase/admin.ts`, service role) only where RLS must be intentionally bypassed.
- Use `cn()` (`lib/utils.ts`) for conditional Tailwind classes; lucide-react for all icons.
- New API routes: validate input with a Zod schema from `lib/validations/`, authorize with `requirePermission()` from `lib/auth/api-protection.ts`.

## Roadmap Status

MVP, Phase 3 (Comunidad/Red Vecinal), and Phase 5 (Servicios) are complete. Phase 4 (Marketplace) has the public browsing/detail flow complete; user-created listings and paid featured listings are not yet built. Phase 2 (Monetization — premium profiles, banner ads, business analytics dashboard, reviews/ratings, payment integration) is the current focus after MVP.

#Memory
For ui ux designs or implementations use the UIUX promax skill

IMPORTANT: When writing down output messages, just write what it's strictally necessary. Avoid onlg explanations. Just perform required tasks.
