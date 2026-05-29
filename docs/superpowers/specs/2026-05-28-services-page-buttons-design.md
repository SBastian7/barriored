# Services Page Buttons — Design Spec
_2026-05-28_

## Scope

Implement production-ready functionality for three interactive elements on the `/{community}/services` page:

1. **"GUARDAR NÚMEROS"** — Download all emergency contacts as a `.vcf` file
2. **"INFORMAR SERVICIO"** — Anonymous form to suggest a new service listing
3. **"REPORTAR DATO ERRADO"** — Anonymous form to report incorrect data on a specific service card

---

## 1. Database — `service_feedback` table

New Supabase table. Anonymous `INSERT` is allowed (no auth required). Read/write for admins only.

### Schema

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | PK |
| `community_id` | `uuid` FK → `communities` | NO | — | Required |
| `type` | `text` | NO | — | `'suggestion'` or `'report'` |
| `service_id` | `uuid` FK → `public_services` | YES | `null` | Populated for reports, null for suggestions |
| `service_name` | `text` | YES | `null` | Suggestion: name of proposed new service |
| `category` | `text` | YES | `null` | Suggestion: `'emergency'`, `'health'`, or `'utilities'` |
| `phone` | `text` | YES | `null` | Suggestion: proposed phone number |
| `address` | `text` | YES | `null` | Suggestion: proposed address |
| `message` | `text` | NO | — | Report: description of what's wrong. Suggestion: additional context |
| `reporter_id` | `uuid` FK → `profiles` | YES | `null` | Logged-in user if available, null for anonymous |
| `reporter_name` | `text` | YES | `null` | Optional self-identification |
| `reporter_whatsapp` | `text` | YES | `null` | Optional follow-up contact for admin |
| `status` | `text` | NO | `'pending'` | `'pending'`, `'reviewed'`, `'dismissed'` |
| `created_at` | `timestamptz` | NO | `now()` | Auto |

### RLS Policies

- `INSERT`: allowed for everyone (anon + authenticated)
- `SELECT`: allowed for authenticated users with `role = 'admin'` or `is_super_admin = true` within the same `community_id`
- `UPDATE`: same as SELECT
- `DELETE`: super admin only

### Migration

Single SQL migration file: `supabase/migrations/20260528_create_service_feedback.sql`

---

## 2. API Routes

### `POST /api/community/services/suggest`

Anonymous. No auth check.

**Request body (Zod-validated):**
```ts
{
  community_id: string (uuid)
  service_name: string (min 2, max 100)
  category: 'emergency' | 'health' | 'utilities'
  phone: string (min 3, max 30)
  address?: string (max 200)
  message?: string (max 500)
  reporter_name?: string (max 100)
  reporter_whatsapp?: string (max 30)
}
```

**Rate limiting:** Before insert, count rows in `service_feedback` with same `community_id` and `created_at > now() - interval '1 hour'` where `reporter_whatsapp` or remote IP matches. If count >= 3, return 429.

**On success:** Insert row with `type: 'suggestion'`, return `{ success: true }` 201.

---

### `POST /api/community/services/report`

Anonymous. No auth check. Handles both per-card reports (specific service) and generic CTA reports (no specific service).

**Request body (Zod-validated):**
```ts
{
  community_id: string (uuid)
  service_id?: string (uuid)           // populated from card; null for CTA generic report
  service_name_hint?: string (max 100) // free-text hint when service_id is null
  message: string (min 5, max 500)
  reporter_name?: string (max 100)
  reporter_whatsapp?: string (max 30)
}
```

**Validation:** When `service_id` is provided, confirm the `public_services` row exists and `is_active = true` before inserting.

**Rate limiting:** Same approach — max 3 reports per community per hour from same source.

**On success:** Insert row with `type: 'report'`, `service_id` set or null, return `{ success: true }` 201.

---

## 3. UI Components

### 3a. VCF Download utility — `lib/utils/vcf.ts`

Pure client-side utility. No API call.

```ts
function generateVcf(services: PublicService[]): string
function downloadVcf(services: PublicService[], filename: string): void
```

`generateVcf` maps each service with a phone number to a `VCARD` block (VERSION 3.0). Each card has `FN`, `ORG`, `TEL;TYPE=WORK`, and optionally `ADR`.

`downloadVcf` creates a `Blob` with `text/vcard` MIME type, generates an object URL, clicks a temporary `<a download>` element, then revokes the URL.

The "GUARDAR NÚMEROS" button calls `downloadVcf(services, 'emergencias-parque-industrial.vcf')` directly — no dialog, instant download.

---

### 3b. `ServiceSuggestionDialog` — `components/community/service-suggestion-dialog.tsx`

Radix `Dialog` wrapping a form. Triggered by both "INFORMAR SERVICIO" buttons (hero section and CTA section).

**Props:** `{ communityId: string; communityName: string }`

**Fields:**
| Field | Type | Required |
|---|---|---|
| Nombre del servicio | text input | Yes |
| Categoría | select: Emergencias / Salud / Servicios Públicos | Yes |
| Teléfono | text input | Yes |
| Dirección | text input | No |
| Información adicional | textarea | No |
| Tu nombre | text input | No |
| Tu WhatsApp | text input | No |

**Submit flow:** POST to `/api/community/services/suggest` → on success: close dialog + `toast.success('¡Gracias! Revisaremos tu sugerencia.')` → on error: `toast.error(message)`.

**Style:** Neo-brutalist, matching `rejection-dialog.tsx` — border-2 border-black, hard shadows, Outfit headings, uppercase labels.

---

### 3c. `ServiceReportDialog` — `components/community/service-report-dialog.tsx`

Radix `Dialog`. Two trigger points: flag button (⚑) on each `ServiceCard`, and the CTA "REPORTAR UN DATO ERRADO" button.

**Props:** `{ communityId: string; serviceId?: string; serviceName?: string }`

When `serviceId` is provided (per-card): dialog title shows the service name, no "which service?" field shown.
When `serviceId` is absent (CTA): dialog shows an extra optional text field "¿Cuál servicio tiene el dato errado?" that populates `service_name_hint`.

**Fields:**
| Field | Type | Shown when | Required |
|---|---|---|---|
| ¿Cuál servicio? | text input | `serviceId` absent (CTA mode) | No |
| ¿Qué dato está errado? | textarea | Always | Yes |
| Tu nombre | text input | Always | No |
| Tu WhatsApp | text input | Always | No |

**Submit flow:** POST to `/api/community/services/report` with `service_id` (or null) and `service_name_hint` → on success: close + `toast.success('Reporte enviado. ¡Gracias por ayudar!')` → on error: `toast.error(message)`.

---

## 4. Integration into `ServicesPageClient`

- Import and wire `downloadVcf` to the "GUARDAR NÚMEROS" button
- Import and render `<ServiceSuggestionDialog>` wrapping both "INFORMAR SERVICIO" buttons
- Import and render `<ServiceReportDialog>` on each `ServiceCard` (flag icon button replaces or supplements the `↗` button)
- Import and render `<ServiceReportDialog>` wrapping the CTA "REPORTAR UN DATO ERRADO" button (with `serviceId={null}` general mode)

---

## 5. Error Handling & Edge Cases

- VCF with zero services with phones: button is disabled or shows a toast explaining there are no numbers to save
- Form submit while offline: catch fetch error, show `toast.error('Sin conexión. Intenta de nuevo.')`
- Rate limit hit (429): show `toast.error('Demasiados envíos. Espera un momento.')`
- Service not found on report (404): show `toast.error('Servicio no encontrado.')`

---

## 6. Out of Scope

- Admin panel UI for reviewing `service_feedback` entries (can be added later)
- Email/push notification to admins on new submission (can be added later)
- CAPTCHA or advanced bot protection
