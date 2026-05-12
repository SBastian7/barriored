# Super Admin Platform Management — Design Spec
**Date:** 2026-05-11  
**Approach:** Option A — Gap-fill (minimal, pragmatic)

## Goal

Reach 100% completion of the Super Admin feature set defined in USE-CASES-BY-ROLE.md. Much of the infrastructure already exists; this spec covers what is missing or broken.

---

## Current State Summary

### Already Done
- Create / edit / archive communities (soft-delete via `is_active=false`)
- Configure slug, name, description, municipality, department
- Set geographic boundaries (map picker exists)
- Logo upload in community form
- Assign / remove community administrators and moderators (staff API)
- View all communities dashboard with per-community stats
- Cross-community users list (super admin sees all users)
- Cross-community statistics page (super admin sees all data)
- Sidebar conditionally shows super-admin nav items
- Audit logging on community changes

### Broken / Incomplete
- `cover_image_url` column exists on `communities` but form has no upload field
- Categories page has drag-reorder but Create/Edit/Delete are unimplemented TODOs
- Payments page hardcodes `community_id` even for super admin — super admin only sees their own community's revenue

### Missing Entirely
- Transfer community ownership (no owner concept, no `primary_admin_id`)
- Hard delete communities (only soft-delete / archive exists)
- Access all community admin panels from community detail
- Platform-wide settings page
- Platform-wide policies page
- Platform-wide payment settings page
- Global service categories management (hardcoded enum)
- Cross-community analytics community selector + comparison table

---

## Section 1 — Quick Fixes

### 1.1 Cover Image Upload
**File:** `components/admin/community-form.tsx`  
Add a second `ImageUploadField` for `cover_image_url` below the existing logo field. Use the same `community-media` Supabase storage bucket. The DB column already exists.

### 1.2 Categories CRUD
**File:** `app/admin/categories/page.tsx`  
The categories table is global (no `community_id`). Implement the three missing dialogs:

- **Create:** "Nueva categoría" button → dialog with fields: name (string), icon (lucide icon name, text input with preview), sort_order (auto-set to max+1)
- **Edit:** Edit button per row → same dialog pre-filled
- **Delete:** Confirmation dialog. Block delete if any business references the category (show count of affected businesses in the message)

API routes already exist or use existing patterns in `/api/admin/categories/`.

### 1.3 Payments Cross-Community Fix
**File:** `app/admin/payments/page.tsx`  
**Problem:** `setCommunityId(profile.community_id)` is called for all users including super admin. Super admin has `community_id = null`, causing the payments query to return nothing or break.

**Fix:** For super admin, show a community selector dropdown at the top of the page:
- Default: "Todas las comunidades" — query removes `community_id` filter, shows platform-wide aggregates
- Specific community selected: filter by that community

Aggregate stats (total revenue, monthly revenue) sum across all communities when "all" is selected.

---

## Section 2 — Community Management Additions

### 2.1 Transfer Community Ownership
**Concept:** The system has staff with `admin` role but no single "owner". Add a `primary_admin_id UUID` nullable FK on the `communities` table pointing to `profiles`.

**UI:** In `app/admin/communities/[id]/page.tsx` Staff tab, add a "Designar como propietario" action per admin. Sets `communities.primary_admin_id = profile.id`. The designated owner displays a crown icon badge. Only one primary admin at a time.

**API:** Extend `PATCH /api/admin/communities/[id]` to accept `primary_admin_id` in the request body and update the column. Add it to the whitelist of patchable fields in the existing route handler.

**DB migration:** Add `primary_admin_id UUID REFERENCES profiles(id) ON DELETE SET NULL` to `communities`.

### 2.2 Hard Delete Communities
**Constraint:** Only available when the community is already archived (`is_active = false`).  
**Safety check (API-enforced):** Block hard delete if community has any associated records: businesses > 0, profiles with `community_id` = this community > 0, or community_posts > 0. Return 409 with a count breakdown.

**UI:** "Eliminar permanentemente" destructive button appears only when `is_active = false` in the community detail page. Opens a confirmation dialog requiring the user to type the community slug. On confirm, calls `DELETE /api/admin/communities/[id]?permanent=true`.

**API:** Existing DELETE endpoint gets a `?permanent=true` query param that bypasses soft-delete and runs `DELETE FROM communities WHERE id = $1` after the safety check.

### 2.3 Access All Community Admin Panels
**UI:** Add an "Acceso rápido" card to `app/admin/communities/[id]/page.tsx` with 5 action link buttons:

| Button | Destination |
|---|---|
| Ver negocios | `/admin/businesses?community_id={id}` |
| Ver usuarios | `/admin/users?community_id={id}` |
| Ver alertas | `/admin/alerts?community_id={id}` |
| Ver marketplace | `/admin/marketplace?community_id={id}` |
| Ver estadísticas | `/admin/statistics?community_id={id}` |

**Each target admin page** must be updated to read `searchParams.community_id` when the session user is a super admin and apply it as an additional filter to the query. When absent, super admin sees all communities (existing behavior preserved). This change is needed in: businesses, users, alerts, and marketplace pages. The statistics page already supports this pattern.

**Override community-level settings:** The existing community edit tabs (Info, Boundaries, Settings, SEO) are already accessible to super admin from the community detail page via the "Editar" button. No additional work needed.

---

## Section 3 — New Platform-Wide Pages

A new "Plataforma" group appears in the admin sidebar (visible to `is_super_admin` only) with 4 new pages.

### 3.1 `/admin/platform/settings` — Platform Settings
**DB:** New table `platform_config`:
```sql
CREATE TABLE platform_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_name TEXT NOT NULL DEFAULT 'BarrioRed',
  support_email TEXT,
  support_phone TEXT,
  marketplace_enabled BOOLEAN NOT NULL DEFAULT true,
  community_posts_enabled BOOLEAN NOT NULL DEFAULT true,
  new_registrations_open BOOLEAN NOT NULL DEFAULT true,
  max_businesses_per_community INT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES profiles(id)
);
-- Seed with one row on migration
INSERT INTO platform_config DEFAULT VALUES;
```
RLS: read by all authenticated; write by super admin only.

**UI:** Single-page form. Toggle switches for boolean fields. Text inputs for name/email/phone. "Guardar cambios" button. No create/delete — always one row, always an update.

### 3.2 `/admin/platform/policies` — Platform Policies
**DB:** New table `platform_policies`:
```sql
CREATE TABLE platform_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL UNIQUE, -- 'terms', 'privacy', 'content', 'community'
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES profiles(id)
);
-- Seed four policy types
INSERT INTO platform_policies (type, title) VALUES
  ('terms', 'Términos de Servicio'),
  ('privacy', 'Política de Privacidad'),
  ('content', 'Política de Contenido'),
  ('community', 'Normas Comunitarias');
```
RLS: read by all authenticated; write by super admin only.

**UI:** Tab per policy type. Each tab has a textarea (markdown) on the left and a rendered markdown preview on the right. "Guardar" button per tab. Last updated timestamp shown.

### 3.3 `/admin/platform/payments` — Payment Gateway Settings
**DB:** New table `platform_payment_config`:
```sql
CREATE TABLE platform_payment_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway TEXT NOT NULL UNIQUE, -- 'wompi', 'nequi', 'mercadopago'
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  environment TEXT NOT NULL DEFAULT 'test', -- 'test' | 'production'
  public_key TEXT,
  private_key TEXT, -- stored masked after first save
  webhook_secret TEXT,
  account_identifier TEXT, -- for Nequi: phone number
  commission_rate NUMERIC(5,4) DEFAULT 0.03,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES profiles(id)
);
```
RLS: read/write by super admin only.

**UI:** Tab per gateway. Toggle to enable/disable. Environment selector (test/prod). Input fields with masked display for sensitive keys (show only last 4 chars after save, require re-enter to change). Commission rate input. 

**Security note:** For production, migrate sensitive keys to Supabase Vault. Current implementation stores in DB with RLS; acceptable for pilot phase.

### 3.4 `/admin/platform/service-categories` — Global Service Categories
**Current state:** `public_services.category` is a hardcoded enum string (`emergency`, `health`, `government`, `transport`, `utilities`).

**DB migration:**
```sql
CREATE TABLE service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT NOT NULL, -- lucide icon name
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed from existing enum values
INSERT INTO service_categories (name, slug, icon, sort_order) VALUES
  ('Emergencias', 'emergency', 'siren', 0),
  ('Salud', 'health', 'heart-pulse', 1),
  ('Gobierno', 'government', 'landmark', 2),
  ('Transporte', 'transport', 'bus', 3),
  ('Servicios Públicos', 'utilities', 'zap', 4);

-- Add FK to public_services
ALTER TABLE public_services ADD COLUMN service_category_id UUID REFERENCES service_categories(id);
-- Backfill
UPDATE public_services ps SET service_category_id = sc.id 
FROM service_categories sc WHERE ps.category = sc.slug;
-- Drop old column after backfill verified
ALTER TABLE public_services DROP COLUMN category;
```

**UI:** Same pattern as categories page — list with drag-reorder, "Nueva categoría" button, edit dialog, soft-delete (set `is_active=false`, blocked if services reference it).

**Services form update:** The `category` dropdown in the services create/edit form switches from a hardcoded enum to a query against `service_categories WHERE is_active = true`.

---

## Section 4 — Cross-Community Analytics Enhancement

**File:** `app/admin/statistics/page.tsx`

**Changes:**
1. For super admin: add a community selector at the top of the page ("Todas las comunidades" default). Selecting a specific community scopes all stat cards to that community.
2. Add a new "Comparativa" tab (only visible to super admin) with a table: one row per community, columns = key metrics (businesses total, users, revenue last 30d, active alerts, marketplace listings). Sortable columns.

The existing queries already support the scoping pattern (conditional `community_id` filter). The community selector just passes the selected `community_id` to the query or omits it for aggregate view.

---

## DB Migrations Required

| Migration | Table | Change |
|---|---|---|
| 1 | `communities` | Add `primary_admin_id UUID REFERENCES profiles(id) ON DELETE SET NULL` |
| 2 | `platform_config` | Create table, seed 1 row |
| 3 | `platform_policies` | Create table, seed 4 policy rows |
| 4 | `platform_payment_config` | Create table, seed 3 gateway rows |
| 5 | `service_categories` | Create table, seed 5 categories |
| 6 | `public_services` | Add `service_category_id FK`, backfill, drop `category` enum column |

---

## File Changes Summary

### New Files
- `app/admin/platform/settings/page.tsx`
- `app/admin/platform/policies/page.tsx`
- `app/admin/platform/payments/page.tsx`
- `app/admin/platform/service-categories/page.tsx`
- `app/api/admin/platform/settings/route.ts`
- `app/api/admin/platform/policies/route.ts`
- `app/api/admin/platform/payments/route.ts`
- `app/api/admin/platform/service-categories/route.ts`
- `supabase/migrations/20260511000001_super_admin_platform.sql`

### Modified Files
- `components/admin/community-form.tsx` — add cover image field
- `app/admin/categories/page.tsx` — add Create/Edit/Delete dialogs
- `app/admin/payments/page.tsx` — fix super admin cross-community view
- `app/admin/communities/[id]/page.tsx` — add quick-access card, transfer ownership button, hard delete button
- `app/api/admin/communities/[id]/route.ts` — add `?permanent=true` hard delete
- `app/api/admin/communities/[id]/staff/route.ts` — add transfer ownership endpoint (or handled via PATCH communities)
- `app/admin/statistics/page.tsx` — community selector + comparativa tab
- `app/admin/services/page.tsx` — switch category dropdown to dynamic query
- `components/admin/collapsible-sidebar.tsx` — add Plataforma nav group

---

## Implementation Order

1. DB migration (all schema changes at once)
2. Quick fixes (cover image, categories CRUD, payments fix) — unblock existing features fast
3. Community management additions (transfer ownership, hard delete, quick-access links)
4. Platform pages (settings → policies → payments → service-categories)
5. Statistics enhancement

---

## Out of Scope

- Supabase Vault for payment keys (noted as future hardening)
- Email notifications on ownership transfer
- Audit log entries for platform config changes (can be added later following existing `logAuditAction` pattern)
