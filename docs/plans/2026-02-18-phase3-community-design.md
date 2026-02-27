# Phase 3: Red Vecinal (Community) - Design Document

**Date:** 2026-02-18
**Status:** Approved

## Overview

Phase 3 adds a neighborhood social board at `/{community}/community` with five features: announcements, alerts, events, job postings, and a public services directory. This transforms BarrioRed from a business directory into a full community platform.

## Decisions

- **Scope:** All 5 sub-features built together
- **Permissions:** Any registered user can create posts (announcements, events, jobs). Alerts and services are admin-only.
- **Moderation:** All user posts require admin approval (pending → approved/rejected), consistent with business registration flow.
- **Layout:** Sectioned dashboard on community hub page, with sub-pages for each content type.
- **DB Approach:** Hybrid - 3 tables: `community_posts` (unified for announcements/events/jobs), `community_alerts` (admin-only), `public_services` (curated directory).

## Database Schema

### Table: `community_posts`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | default gen_random_uuid() |
| community_id | uuid FK → communities | NOT NULL |
| author_id | uuid FK → profiles | NOT NULL |
| type | text CHECK (announcement, event, job) | NOT NULL |
| title | text | NOT NULL |
| content | text | NOT NULL |
| image_url | text | Optional cover image |
| metadata | jsonb DEFAULT '{}' | Type-specific fields |
| status | text CHECK (pending, approved, rejected) | DEFAULT 'pending' |
| is_pinned | boolean | DEFAULT false |
| created_at | timestamptz | DEFAULT now() |
| updated_at | timestamptz | DEFAULT now() |

**Metadata schemas by type:**

- **announcement:** `{}` (no extra fields)
- **event:** `{ "date": "ISO string", "end_date": "ISO string?", "location": "string", "location_coords": {"lat": number, "lng": number}? }`
- **job:** `{ "category": "string", "salary_range": "string?", "contact_method": "whatsapp|phone|email", "contact_value": "string" }`

### Table: `community_alerts`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | default gen_random_uuid() |
| community_id | uuid FK → communities | NOT NULL |
| author_id | uuid FK → profiles | NOT NULL, admin only |
| type | text CHECK (water, power, security, construction, general) | NOT NULL |
| title | text | NOT NULL |
| description | text | |
| severity | text CHECK (info, warning, critical) | DEFAULT 'info' |
| is_active | boolean | DEFAULT true |
| starts_at | timestamptz | DEFAULT now() |
| ends_at | timestamptz | |
| created_at | timestamptz | DEFAULT now() |

### Table: `public_services`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | default gen_random_uuid() |
| community_id | uuid FK → communities | NOT NULL |
| category | text CHECK (emergency, health, government, transport, utilities) | NOT NULL |
| name | text | NOT NULL |
| description | text | |
| phone | text | |
| address | text | |
| hours | text | |
| sort_order | int | DEFAULT 0 |
| is_active | boolean | DEFAULT true |

### RLS Policies

**community_posts:**
- SELECT: Anyone can read approved posts for their community
- INSERT: Authenticated users can insert with status='pending'
- UPDATE: Authors can update own pending posts; admins can update any (for status changes)
- DELETE: Authors can delete own posts; admins can delete any

**community_alerts:**
- SELECT: Anyone can read active alerts
- INSERT/UPDATE/DELETE: Admin role only

**public_services:**
- SELECT: Anyone can read active services
- INSERT/UPDATE/DELETE: Admin role only

## Route Structure

```
app/[community]/community/
  page.tsx                    # Community hub dashboard (sectioned)
  announcements/
    page.tsx                  # All announcements list
    [id]/page.tsx             # Single announcement detail
    new/page.tsx              # Create announcement form
  events/
    page.tsx                  # All events list
    [id]/page.tsx             # Single event detail
    new/page.tsx              # Create event form
  jobs/
    page.tsx                  # All job postings list
    [id]/page.tsx             # Single job detail
    new/page.tsx              # Create job posting form
  alerts/
    page.tsx                  # All active/past alerts
  services/
    page.tsx                  # Public services directory
```

## Component Architecture

```
components/community/
  # Hub page sections
  alerts-banner.tsx           # Active alerts strip at top of hub
  announcements-section.tsx   # Recent 3 announcements preview
  events-section.tsx          # Next 3 upcoming events preview
  jobs-section.tsx            # Recent 3 job postings preview
  services-section.tsx        # Service categories quick links
  community-cta.tsx           # "Publica algo" CTA

  # Cards
  post-card.tsx               # Unified card (renders by type)
  alert-card.tsx              # Alert display card
  service-card.tsx            # Public service entry card

  # Forms
  post-form.tsx               # Create/edit form (type-aware fields)

  # Detail
  post-detail.tsx             # Full post view with metadata
```

### post-card.tsx rendering by type:

- **announcement**: Title, content excerpt, author avatar+name, date, pinned badge if applicable
- **event**: Date badge (day/month), title, location with MapPin icon, time info
- **job**: Category badge, title, salary range if provided, contact method icon

## API Routes

```
app/api/community/
  posts/route.ts              # GET (list by type/community), POST (create)
  posts/[id]/route.ts         # GET (single), PATCH (update), DELETE
  alerts/route.ts             # GET (list), POST (admin create)
  alerts/[id]/route.ts        # PATCH (update), DELETE (admin)
  services/route.ts           # GET (list), POST (admin create)
  services/[id]/route.ts      # PATCH, DELETE (admin)
```

## Admin Panel Updates

Add to existing admin panel (`/admin`):
- **Community Posts tab**: List pending posts with approve/reject, filter by type
- **Alerts management**: Create/edit/deactivate community alerts
- **Services management**: CRUD for public services directory

## Navigation Updates

Enable "Comunidad" in:
- `components/layout/top-bar.tsx` → `active: true`
- `components/layout/bottom-nav.tsx` → `enabled: true`
- `components/home/quick-nav.tsx` → `enabled: true`

## Community Hub Page Layout

1. **Active Alerts Banner** - Critical/warning alerts, dismissible, colored by severity
2. **Anuncios** - Latest 3 approved announcements + "Ver todos" link
3. **Eventos** - Next 3 upcoming events + "Ver todos" link
4. **Empleos** - Latest 3 job postings + "Ver todos" link
5. **Servicios** - Category cards linking to services directory
6. **CTA** - "Publica algo en tu barrio" button
