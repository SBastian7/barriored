# Admin Tools Hub - Design Document

**Date:** March 10, 2026
**Status:** Approved
**Phases:** 3 (Phased rollout)

---

## Executive Summary

This document outlines the design for a comprehensive Admin Tools Hub for BarrioRed, adding essential administrative capabilities for managing images, SEO, and push notifications. The implementation follows a phased rollout approach to deliver value incrementally while maintaining quality and testing rigor.

**Timeline:** 6-8 weeks total
- Phase 1: Image Storage Analytics (2-3 weeks)
- Phase 2: SEO Management + Push Notification Statistics (2-3 weeks)
- Phase 3: Push Notification Configuration & Testing (1-2 weeks)

---

## Architecture Overview

### Hybrid Approach: Centralized Tools + Contextual Integration

**New Routes:**
- `/admin/tools` - Main tools hub with 3 tabs:
  - **Imágenes** - Storage analytics dashboard
  - **Rendimiento** - (Reserved for future)
  - **Notificaciones** - Push notification stats, config, testing

**Enhanced Existing Routes:**
- `/admin/communities/[id]/edit` - Add "SEO" tab
- `/admin/alerts` - Add "⚙️ Configurar" button linking to tools

**Navigation:**
- Add "Herramientas" to admin sidebar (Settings icon)
- Between "Logs" and bottom of navigation list
- Visible to all admin roles

**URL State Management:**
- Use query params: `/admin/tools?tab=images|notifications`
- Enables direct linking and preserves state
- Example: Alert page → `/admin/tools?tab=notifications`

---

## Database Schema

### New Tables

#### 1. `community_seo_settings`
Stores per-community SEO metadata.

```sql
CREATE TABLE community_seo_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id UUID UNIQUE NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  meta_title TEXT,
  meta_description TEXT,
  meta_keywords TEXT[],
  og_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE community_seo_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Community admins can manage their SEO settings"
  ON community_seo_settings
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM profiles
      WHERE (role = 'admin' AND community_id = community_seo_settings.community_id)
         OR is_super_admin = true
    )
  );

-- Index
CREATE INDEX idx_seo_community ON community_seo_settings(community_id);
```

#### 2. `image_storage_analytics`
Tracks storage usage snapshots for analytics.

```sql
CREATE TABLE image_storage_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
  bucket_name TEXT NOT NULL,
  total_size_bytes BIGINT NOT NULL,
  file_count INTEGER NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE image_storage_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view storage analytics"
  ON image_storage_analytics
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM profiles
      WHERE (role = 'admin' AND community_id = image_storage_analytics.community_id)
         OR is_super_admin = true
    )
  );

-- Indexes
CREATE INDEX idx_storage_community_date ON image_storage_analytics(community_id, recorded_at DESC);
CREATE INDEX idx_storage_bucket ON image_storage_analytics(bucket_name);
```

#### 3. `push_notification_logs`
Logs all notification sends for statistics.

```sql
CREATE TABLE push_notification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  alert_id UUID REFERENCES community_alerts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  test_mode BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE push_notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view notification logs"
  ON push_notification_logs
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM profiles
      WHERE (role = 'admin' AND community_id = push_notification_logs.community_id)
         OR is_super_admin = true
    )
  );

-- Indexes
CREATE INDEX idx_notif_logs_community_date ON push_notification_logs(community_id, sent_at DESC);
CREATE INDEX idx_notif_logs_alert ON push_notification_logs(alert_id);
```

#### 4. `push_notification_config`
Per-community push notification settings.

```sql
CREATE TABLE push_notification_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id UUID UNIQUE NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT true,
  max_per_day INTEGER DEFAULT 10,
  test_mode BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE push_notification_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage push config"
  ON push_notification_config
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM profiles
      WHERE (role = 'admin' AND community_id = push_notification_config.community_id)
         OR is_super_admin = true
    )
  );

-- Index
CREATE INDEX idx_push_config_community ON push_notification_config(community_id);
```

---

## Phase 1: Image Storage Analytics

### Overview
Provides visibility into storage usage across Supabase buckets without modification capabilities. Helps admins understand storage costs and growth trends.

### UI Components

#### Location: `/admin/tools?tab=images`

**A. Storage Overview Cards** (top section)
- Four brutalist stat cards in a row:
  - **Total Storage**: Aggregate across all buckets
  - **Business Images**: `business-images` bucket
  - **Community Posts**: `community-posts` bucket
  - **Profile Images**: `profiles` bucket
- Each card shows:
  - Large number (GB/MB)
  - Icon (HardDrive, Building2, MessageSquare, User)
  - Trend indicator vs 30 days ago

**B. Storage Growth Trends** (chart section)
- Line chart showing storage over time
- X-axis: Time (last 30/60/90 days selector)
- Y-axis: Total storage (GB)
- Shows growth trajectory
- Warning line for Supabase tier limits

**C. Storage by Community** (table section)
- Only visible to super admins
- Community admins see only their community
- Table columns:
  - Community name
  - Storage used (GB)
  - Percentage of total
  - Image count
  - Growth (vs 30d ago)
- Sortable by storage size (default: largest first)

**D. Storage by Bucket** (chart section)
- Pie chart or donut chart
- Shows distribution across buckets
- Percentages + absolute values

**E. Sync Button** (top right)
- "Sincronizar Ahora" button
- Manually triggers storage sync from Supabase Storage API
- Shows loading state during sync
- Toast notification on success/failure

### Data Collection Strategy

**Daily Automated Sync:**
- Cron job (daily at 2 AM) calls `/api/admin/storage/sync`
- Queries Supabase Storage API for each bucket size
- Stores snapshot in `image_storage_analytics` table
- Aggregates by community (queries file paths to determine community ownership)

**Manual Sync:**
- Admin clicks "Sincronizar Ahora"
- POST to `/api/admin/storage/sync`
- Same logic as daily sync
- Returns fresh data immediately

**Dashboard Data:**
- Queries `image_storage_analytics` table (not live Storage API)
- Aggregates data for display
- Shows "Last synced: X hours ago" timestamp

### API Routes

#### `/api/admin/storage/summary` (GET)
Returns aggregated storage statistics.

**Response:**
```json
{
  "total": { "bytes": 1234567890, "gb": 1.15 },
  "buckets": [
    { "name": "business-images", "bytes": 800000000, "gb": 0.75 },
    { "name": "community-posts", "bytes": 300000000, "gb": 0.28 },
    { "name": "profiles", "bytes": 134567890, "gb": 0.12 }
  ],
  "communities": [
    { "id": "uuid", "name": "Parque Industrial", "bytes": 500000000, "gb": 0.47 }
  ],
  "last_synced": "2026-03-10T14:30:00Z"
}
```

#### `/api/admin/storage/sync` (POST)
Triggers manual storage sync.

**Logic:**
1. Check admin permissions
2. Query Supabase Storage API for each bucket
3. Parse file paths to extract community_id
4. Aggregate by bucket and community
5. Insert snapshots into `image_storage_analytics`
6. Return summary

**Response:**
```json
{
  "success": true,
  "synced_at": "2026-03-10T14:30:00Z",
  "total_bytes": 1234567890
}
```

---

## Phase 2: SEO Management

### Overview
Allows admins to customize meta tags and Open Graph images per community for better search engine visibility and social media sharing.

### UI Components

#### Location: `/admin/communities/[id]/edit` → New "SEO" tab

**A. Meta Tags Section**

**Title Field:**
- Input with character counter
- Ideal: 50-60 chars, Max: 70 chars
- Placeholder: "{Community Name} - BarrioRed"
- Real-time preview below showing SERP appearance

**Description Field:**
- Textarea with character counter
- Ideal: 150-160 chars, Max: 160 chars
- Placeholder: "Descubre negocios locales, eventos y servicios en {Community Name}"
- Real-time preview below

**Keywords Field:**
- Tag input (combobox style)
- Add keywords via comma or Enter key
- Max 10 keywords recommended
- Displays as removable tags

**B. Open Graph Image**
- Reuse existing `ImageUploadField` component
- Recommended size: 1200x630px
- Shows current image or placeholder
- Upload new image via drag-drop or file picker
- Stores in `community-logos` bucket with naming: `{community-id}/og-image.jpg`

**C. Social Media Previews**

Three preview cards showing how links appear:

**Facebook Preview:**
- Shows OG image (large)
- Title (bold)
- Description (gray text)
- Domain (barriored.co)

**WhatsApp Preview:**
- Shows OG image (smaller)
- Title (bold)
- Description (truncated)

**Google Search Preview:**
- Domain breadcrumb (barriored.co › parqueindustrial)
- Title (blue link)
- Description (black text, truncated at 160 chars)

Updates in real-time as user types.

**D. Technical Information** (read-only)
- Canonical URL: `https://barriored.co/{community-slug}`
- Structured Data: Shows JSON-LD snippet for LocalBusiness schema
  ```json
  {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "Parque Industrial - BarrioRed",
    "description": "...",
    "address": { ... }
  }
  ```

**E. Save Button**
- "Guardar Cambios" button (primary, brutalist style)
- Saves to `community_seo_settings` table
- Shows success toast with preview link

### Default Values

If no SEO settings exist for a community:
- **Title:** "{Community.name} - BarrioRed"
- **Description:** "Descubre negocios locales, eventos y servicios en {Community.name}. Plataforma comunitaria 100% local."
- **Keywords:** ["barrio", community.name.toLowerCase(), "negocios locales", "comunidad", city.name]
- **OG Image:** Falls back to community logo, then default BarrioRed OG image

### Implementation Details

**Metadata Injection:**
- Use Next.js `generateMetadata()` in `/app/[community]/layout.tsx`
- Query `community_seo_settings` table
- Return metadata object with title, description, openGraph

**Example:**
```tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  const community = await getCommunity(params.community)
  const seoSettings = await getSEOSettings(community.id)

  return {
    title: seoSettings?.meta_title || `${community.name} - BarrioRed`,
    description: seoSettings?.meta_description || defaultDescription,
    keywords: seoSettings?.meta_keywords || defaultKeywords,
    openGraph: {
      title: seoSettings?.meta_title,
      description: seoSettings?.meta_description,
      images: [seoSettings?.og_image_url || community.logo_url],
      type: 'website',
    },
  }
}
```

**Caching:**
- Cache SEO settings in layout to avoid DB query per page
- Invalidate cache on settings update

### API Routes

#### `/api/admin/communities/[id]/seo` (GET)
Returns SEO settings for a community.

**Response:**
```json
{
  "meta_title": "Parque Industrial - BarrioRed",
  "meta_description": "Descubre negocios locales...",
  "meta_keywords": ["barrio", "parque industrial", "negocios locales"],
  "og_image_url": "https://...storage.../og-image.jpg"
}
```

#### `/api/admin/communities/[id]/seo` (PUT)
Updates SEO settings.

**Request Body:**
```json
{
  "meta_title": "...",
  "meta_description": "...",
  "meta_keywords": ["..."],
  "og_image_url": "..."
}
```

**Validation:**
- meta_title: max 70 chars
- meta_description: max 160 chars
- meta_keywords: max 10 items
- og_image_url: valid URL or null

---

## Phase 2: Push Notification Statistics

### Overview
Provides visibility into push notification performance, delivery rates, and subscriber growth.

### UI Components

#### Location: `/admin/tools?tab=notifications` (top section)

**A. Overview Cards** (top row)
Four brutalist stat cards (last 30 days):
- **Total Enviadas**: Count of all notifications sent
- **Tasa de Entrega**: (Delivered / Sent) × 100%
- **Suscriptores Activos**: Current subscriber count
- **Promedio Diario**: Avg notifications per day

Each card:
- Large primary number
- Trend indicator (↑ +12% vs previous period)
- Small sparkline chart (optional)

**B. Delivery Trends Chart**
- Line chart with two lines:
  - "Enviadas" (blue)
  - "Entregadas" (green)
- X-axis: Time
- Y-axis: Count
- Time range selector: 7 / 30 / 90 days
- Shows delivery issues visually (gap between lines)

**C. Notifications by Type**
- Pie chart or horizontal bar chart
- Shows breakdown:
  - Agua (water) - blue
  - Energía (power) - yellow
  - Seguridad (security) - red
  - Construcción (construction) - orange
  - General - gray
- Percentages + absolute counts

**D. Notifications by Community** (super admin only)
- Table with columns:
  - Community name
  - Subscribers
  - Sent (30d)
  - Delivery rate %
- Sortable by any column
- Community admins see only their community (single row)

**E. Recent Notifications Log**
- Table showing last 50 notifications
- Columns:
  - Timestamp (relative: "hace 2 horas")
  - Community (badge)
  - Title
  - Type (badge with icon)
  - Sent count
  - Failed count
  - Actions: "Reenviar" button for failed
- Pagination (50 per page)
- Filter by community (if super admin)

### Data Source
Queries `push_notification_logs` table.

**Aggregations:**
- Total sent: `SUM(sent_count)`
- Delivery rate: `SUM(sent_count - failed_count) / SUM(sent_count)`
- By type: `GROUP BY alert type` (joined to community_alerts)
- By community: `GROUP BY community_id`

**Subscriber Count:**
- Queries `push_subscriptions` table
- Filters by community_id and active subscriptions
- `COUNT(*) WHERE endpoint IS NOT NULL`

### API Routes

#### `/api/admin/notifications/stats` (GET)
Returns aggregated statistics.

**Query Params:**
- `community_id` (optional): Filter to specific community
- `days` (default: 30): Time range

**Response:**
```json
{
  "overview": {
    "total_sent": 245,
    "delivery_rate": 0.96,
    "active_subscribers": 1523,
    "avg_per_day": 8.2,
    "trend_vs_previous": 0.12
  },
  "by_type": [
    { "type": "water", "count": 89, "percentage": 36.3 },
    { "type": "power", "count": 67, "percentage": 27.3 }
  ],
  "by_community": [
    { "community_id": "uuid", "name": "Parque Industrial", "sent": 245, "subscribers": 1523 }
  ]
}
```

#### `/api/admin/notifications/logs` (GET)
Returns paginated notification history.

**Query Params:**
- `page` (default: 1)
- `limit` (default: 50)
- `community_id` (optional)

**Response:**
```json
{
  "logs": [
    {
      "id": "uuid",
      "title": "Corte de agua programado",
      "body": "...",
      "community": { "id": "uuid", "name": "Parque Industrial" },
      "type": "water",
      "sent_count": 150,
      "failed_count": 3,
      "sent_at": "2026-03-10T14:30:00Z",
      "test_mode": false
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 245
  }
}
```

---

## Phase 3: Push Notification Configuration & Testing

### Overview
Provides tools to test push notifications, configure rate limits, and manage notification settings per community.

### UI Components

#### Location: `/admin/tools?tab=notifications` (bottom section)

**A. Test Notification Sender** (top panel)

Brutalist card with form fields:

**Community Selector:**
- Dropdown showing available communities
- Community admins: pre-selected to their community (disabled)
- Super admins: can select any community

**Title Field:**
- Input (required)
- Max 50 chars
- Placeholder: "Prueba de notificación"

**Message Field:**
- Textarea (required)
- Max 200 chars
- Placeholder: "Este es un mensaje de prueba..."

**Recipient Options:**
- Radio button group:
  - ⭕ "Todos los suscriptores" (default)
  - ⭕ "Solo yo" (sends only to current admin's device)

**Preview Panel:**
- Shows mobile notification mockup
- Updates in real-time as user types
- Displays title + message in notification format

**Send Button:**
- "Enviar Prueba" (primary red button)
- Icon: Bell
- Loading state during send
- Disabled if form invalid

**Result Display:**
- Toast notification on success: "✅ Enviada a 5 suscriptores"
- Toast on error: "❌ Error: No hay suscriptores"
- Logs to statistics immediately (visible in Recent Notifications)

**B. Global Configuration Panel**

Brutalist card with settings:

**Community Selector** (if super admin):
- Dropdown to select which community to configure
- Community admins: shows their community (read-only)

**Notification Status:**
- Large toggle switch: "Notificaciones Activadas" / "Desactivadas"
- When OFF: All sends blocked for that community
- Warning banner appears: "⚠️ Las notificaciones están desactivadas para esta comunidad"

**Rate Limit:**
- Number input: "Límite Diario"
- Default: 10
- Range: 1-50
- Current usage display: "3 / 10 enviadas hoy"
- Resets at midnight (community timezone)

**Save Button:**
- "Guardar Configuración"
- Shows success toast
- Updates `push_notification_config` table

**C. Quick Templates** (helper panel)

Expandable section with pre-written templates:

**Template Cards:**
1. "Corte de agua programado"
   - Title: "Corte de agua mañana"
   - Message: "Habrá corte de agua de 8am a 2pm por mantenimiento."
2. "Corte de energía"
   - Title: "Corte de energía esta noche"
   - Message: "Corte programado de 10pm a 6am en el sector."
3. "Alerta de seguridad"
   - Title: "Alerta de seguridad"
   - Message: "Se reporta actividad sospechosa en la zona. Mantén puertas cerradas."
4. "Evento comunitario"
   - Title: "Evento este fin de semana"
   - Message: "Reunión comunitaria el sábado 10am en el parque."

Click template → Auto-fills test sender form (user can still edit).

### Data Flow

**Test Send Flow:**
1. Admin fills form and clicks "Enviar Prueba"
2. Frontend validates fields (non-empty, char limits)
3. POST to `/api/admin/notifications/test`
4. Backend:
   - Validates admin permissions (community match)
   - Checks rate limit (test sends count toward daily limit)
   - Queries `push_subscriptions` table filtered by community
   - If "Solo yo": filter to current admin's subscription only
   - Sends via Web Push API (reuse existing logic)
   - Inserts log to `push_notification_logs` with `test_mode: true`
5. Returns result: `{ success: true, sent_count: 5 }`
6. Frontend shows toast and updates statistics

**Configuration Save Flow:**
1. Admin changes settings (toggle, rate limit)
2. Frontend debounces changes (wait 500ms after last edit)
3. PUT to `/api/admin/notifications/config`
4. Backend:
   - Validates permissions
   - Upserts to `push_notification_config` table
   - Returns updated config
5. Frontend shows success toast

**Rate Limiting Check:**
- Before ANY send (test or production):
  - Query `push_notification_logs` for today (community + date)
  - Count: `SELECT COUNT(*) WHERE community_id = X AND DATE(sent_at) = TODAY`
  - Get limit: `SELECT max_per_day FROM push_notification_config WHERE community_id = X`
  - If count >= limit: Return 429 error "Límite diario alcanzado"
- Display in UI: "3 / 10 enviadas hoy"

### Integration with Alerts Page

On `/admin/alerts` page:
- Add button in header: "⚙️ Configurar Notificaciones"
- Links to: `/admin/tools?tab=notifications`
- Opens directly to configuration section
- Breadcrumb trail for easy navigation back

### API Routes

#### `/api/admin/notifications/test` (POST)
Sends test push notification.

**Request Body:**
```json
{
  "community_id": "uuid",
  "title": "Prueba de notificación",
  "body": "Este es un mensaje de prueba",
  "recipient_mode": "all" | "self"
}
```

**Validation:**
- title: required, max 50 chars
- body: required, max 200 chars
- community_id: admin must have permission
- Check rate limit before sending

**Response:**
```json
{
  "success": true,
  "sent_count": 5,
  "failed_count": 0,
  "message": "Notificación enviada a 5 suscriptores"
}
```

**Errors:**
- 401: Unauthorized
- 403: No permission for this community
- 429: Rate limit exceeded
- 400: Validation error

#### `/api/admin/notifications/config` (GET)
Returns notification config for a community.

**Query Params:**
- `community_id` (required)

**Response:**
```json
{
  "community_id": "uuid",
  "is_enabled": true,
  "max_per_day": 10,
  "current_count_today": 3,
  "test_mode": false
}
```

#### `/api/admin/notifications/config` (PUT)
Updates notification config.

**Request Body:**
```json
{
  "community_id": "uuid",
  "is_enabled": true,
  "max_per_day": 15
}
```

**Validation:**
- max_per_day: 1-50 range
- is_enabled: boolean

**Response:**
```json
{
  "success": true,
  "config": { ... }
}
```

---

## Error Handling & Edge Cases

### Image Storage Analytics

**Errors:**
- **Supabase Storage API unavailable:**
  - Show cached data with warning banner: "⚠️ Datos de hace X horas"
  - Disable "Sincronizar Ahora" button
  - Log error to `error_logs` table
- **No data available (new installation):**
  - Show empty state with friendly message
  - "No hay datos de almacenamiento registrados"
  - "Sincronizar Ahora" button to trigger first sync
- **Sync fails:**
  - Toast error: "Error al sincronizar. Intenta de nuevo."
  - Log detailed error for debugging
  - Preserve existing data (don't clear)

**Edge Cases:**
- **Multi-tenant isolation:**
  - Community admins: Query filters by `community_id` automatically
  - Super admin: Shows aggregated view, can drill down by community
  - RLS policies enforce data isolation
- **Large datasets:**
  - If storage > 10GB, show warning: "Acercándose al límite de almacenamiento"
  - Paginate/aggregate if performance degrades
- **Empty buckets:**
  - Show "0 GB" gracefully, not errors
  - Indicate which buckets have no data

### SEO Settings

**Errors:**
- **Image upload fails:**
  - Show error message below image field
  - Don't save other settings (keep form dirty)
  - Allow retry without losing other changes
  - Log error with details
- **Invalid metadata:**
  - Client-side validation prevents submit:
    - Title required
    - Description required
    - Title max 70 chars
    - Description max 160 chars
  - Show inline error messages
- **Database save fails:**
  - Toast error: "Error al guardar. Intenta de nuevo."
  - Preserve form data (don't reset)
  - Log error for investigation

**Edge Cases:**
- **No settings exist:**
  - Use smart defaults based on community data
  - Show placeholders that demonstrate good SEO
  - Pre-fill with defaults, allow editing
- **OG image deleted from storage:**
  - Fallback chain: Community logo → Default BarrioRed OG image
  - Show warning in admin: "La imagen OG no está disponible"
- **Very long text:**
  - Meta description: Truncate at 160 chars with ellipsis in preview
  - Meta title: Show character count in red when > 70
  - Keywords: Limit to 10, disable add button after

### Push Notification Statistics

**Errors:**
- **No logs exist:**
  - Show empty state: "No hay notificaciones registradas"
  - Suggest creating first notification via alert page
  - Show helpful illustration (optional)
- **Database query fails:**
  - Toast error: "Error al cargar estadísticas"
  - Show cached data if available
  - "Reintentar" button to retry query

**Edge Cases:**
- **Zero subscribers:**
  - Show message: "No hay vecinos suscritos a notificaciones aún"
  - Link to documentation on how subscribers sign up
  - Not treated as error (valid state for new community)
- **Community with no notifications sent:**
  - Show all metrics as "0" (not errors)
  - Charts show empty state with message
  - Encourage sending first notification
- **All deliveries failed:**
  - Highlight in red: delivery rate 0%
  - Show troubleshooting link
  - Check VAPID keys, subscription validity

### Push Notification Configuration

**Errors:**
- **Test send fails (no subscribers):**
  - Success response with clarification: "✅ Enviada a 0 suscriptores"
  - Not an error (valid if no one subscribed yet)
  - Suggest testing with "Solo yo" mode
- **Rate limit exceeded:**
  - Block send with clear message: "Límite diario alcanzado (10/10)"
  - Show when limit resets: "Se reinicia a medianoche"
  - Suggest increasing limit or waiting
- **Invalid VAPID keys:**
  - Show setup error in banner
  - Link to documentation: "Configura las claves VAPID"
  - Disable send functionality until fixed
- **Admin not subscribed:**
  - When selecting "Solo yo" but admin has no subscription:
  - Error message: "No estás suscrito a notificaciones"
  - Link to subscribe: "Suscríbete primero"

**Edge Cases:**
- **Test mode bypass:**
  - Admin can send test notifications even if `is_enabled = false`
  - Warning shown: "Las notificaciones están desactivadas para usuarios, pero puedes probar"
  - Test sends marked with `test_mode: true` flag
- **Template selected but user edits:**
  - Don't overwrite edited content when selecting another template
  - Show confirmation: "¿Quieres reemplazar el texto actual con la plantilla?"
- **Multiple admins configuring simultaneously:**
  - Last write wins (standard DB behavior)
  - Show "last updated" timestamp
  - Consider optimistic locking if conflicts arise

### Security Considerations

**Authentication & Authorization:**
- All admin routes check authentication via middleware
- Super admin: `is_super_admin = true` in profiles
- Community admin: `role = 'admin' AND community_id = X`
- RLS policies enforce row-level access control

**Rate Limiting:**
- API routes: 10 requests/minute per user (prevents abuse)
- Push notifications: Configurable per-day limit per community
- Image uploads: Existing 5MB size limit + type validation

**Input Validation:**
- All text inputs: Sanitize HTML, prevent XSS
- File uploads: Type validation (MIME), size limits, malware scan (Supabase)
- URLs: Validate format, prevent SSRF attacks

**Data Privacy:**
- Community admins: Cannot access other communities' data
- Push subscriptions: Encrypted endpoints, no PII exposed
- Logs: No sensitive user data stored

---

## Testing Strategy

### Phase 1: Image Storage Analytics

**Manual Testing Checklist:**
- [ ] Verify storage totals match Supabase dashboard (within 5% margin)
- [ ] Test "Sincronizar Ahora" button updates data immediately
- [ ] Confirm charts render correctly with real data (no console errors)
- [ ] Test community filtering: Admin sees only theirs, super admin sees all
- [ ] Test with empty state (new community with 0 images)
- [ ] Verify responsive design on mobile (cards stack vertically)

**Data Validation:**
- [ ] Check storage calculations accurate (bytes → GB conversion)
- [ ] Verify bucket breakdown adds up to total (sum test)
- [ ] Test with various data sizes (KB, MB, GB ranges)
- [ ] Confirm growth trends calculate correctly (compare snapshots)

**Edge Cases:**
- [ ] Test with no data (first load after installation)
- [ ] Test with sync failure (disconnect internet, trigger sync)
- [ ] Test with extremely large storage (mock > 10GB)

### Phase 2: SEO Settings

**Manual Testing Checklist:**
- [ ] Edit SEO settings for a community and save successfully
- [ ] Verify metadata appears in page source: `view-source:https://...`
- [ ] Test Open Graph image in Facebook Debugger tool
- [ ] Test OG tags in WhatsApp (send link to yourself)
- [ ] Verify Google SERP preview matches actual search result
- [ ] Test default values when no settings exist (new community)

**Browser Testing:**
- [ ] Chrome: Check OG tags render
- [ ] Firefox: Check OG tags render
- [ ] Safari (mobile): Check WhatsApp preview
- [ ] Verify responsive design on mobile (form fields usable)

**Validation Testing:**
- [ ] Try saving with empty title (should block)
- [ ] Try title > 70 chars (should show warning, allow save)
- [ ] Try description > 160 chars (should truncate in preview)
- [ ] Upload invalid image format (should reject)
- [ ] Upload image > 5MB (should reject)

### Phase 2: Push Notification Statistics

**Manual Testing Checklist:**
- [ ] Send notifications and verify logs appear in dashboard within 1 minute
- [ ] Check statistics update correctly (sent count, delivery rate)
- [ ] Test chart time range switching (7/30/90 days loads data)
- [ ] Verify community filtering works (admin vs super admin)
- [ ] Test "Reenviar" button on failed notifications

**Edge Case Testing:**
- [ ] Test with zero notifications sent (empty state displays)
- [ ] Test with zero subscribers (shows 0, not error)
- [ ] Test with 100% failed deliveries (highlights in red)
- [ ] Test with large dataset (1000+ logs, pagination works)

**Data Integrity:**
- [ ] Verify sent_count matches actual push subscriptions queried
- [ ] Check delivery rate calculation: (sent - failed) / sent
- [ ] Confirm by_type breakdown matches alert types
- [ ] Test by_community filtering excludes other communities

### Phase 3: Push Notification Configuration

**Manual Testing Checklist:**
- [ ] Send test notification "Solo yo" - verify received on your device
- [ ] Send test notification "Todos" - verify count matches subscribers
- [ ] Toggle notifications off - verify sends are blocked (error shown)
- [ ] Change rate limit to 3 - verify 4th send blocks with error
- [ ] Test templates - click each, verify form fills correctly
- [ ] Test template then edit - verify edit preserved on template re-select

**Security Testing:**
- [ ] Community admin cannot test notifications for other communities (403 error)
- [ ] Community admin cannot view config for other communities (403 error)
- [ ] Rate limiting enforced: Try sending 11 in a day (should block 11th)
- [ ] Test mode bypass: Send test when notifications disabled (should work)

**Integration Testing:**
- [ ] Click "Configurar" button on alerts page → navigates to tools?tab=notifications
- [ ] Test notification logs appear in statistics dashboard immediately
- [ ] Rate limit counter updates after sends (shows X / Y enviadas hoy)
- [ ] Configuration changes persist after page refresh

**Edge Case Testing:**
- [ ] Admin not subscribed + "Solo yo" mode (shows error)
- [ ] No subscribers + "Todos" mode (success with 0 count)
- [ ] Rate limit at midnight (resets correctly to 0)
- [ ] Multiple admins editing config simultaneously (last write wins)

### Rollout Strategy

**Phase 1 Rollout** (Week 1-2):
1. Deploy image storage analytics to staging
2. Run full test suite on staging
3. Deploy to production with feature flag (enable for super admin only)
4. Monitor for 48 hours: Check error logs, performance metrics
5. Enable for all admins in pilot community (Parque Industrial)
6. Gather feedback from 2-3 community admins
7. Fix any issues found
8. Enable globally for all communities

**Phase 2 Rollout** (Week 3-4):
1. Deploy SEO settings + push stats to staging
2. Test SEO metadata injection on staging subdomain
3. Deploy to production with feature flag
4. Enable for pilot community first
5. Train community admins on SEO best practices (document + video)
6. Monitor Google Search Console for SEO improvements (2-week window)
7. Enable globally after confirming no regressions

**Phase 3 Rollout** (Week 5-6):
1. Deploy push notification config/testing to staging
2. Test with staging push subscriptions (controlled environment)
3. Deploy to production with feature flag
4. Enable for 2-3 trusted admins first (beta testers)
5. Monitor delivery rates and error logs closely
6. Gather feedback on test notification UX
7. Enable globally after 1 week of stable operation

**Monitoring During Rollout:**
- Error logs: Check `/admin/logs` daily for new errors
- Performance: Monitor API response times (should be < 200ms)
- User feedback: Survey admins after each phase
- Database load: Monitor query performance, add indexes if needed

---

## Implementation Notes

### Technologies & Libraries

**Frontend:**
- React 19 + Next.js 16 (App Router)
- Radix UI for tabs, dialogs, toggles
- Recharts for charts (line, pie, bar)
- Lucide React for icons
- Tailwind CSS for styling (neo-brutalist utilities)

**Backend:**
- Next.js API routes
- Supabase client (server-side for admin routes)
- Supabase Storage API for storage queries
- Web Push library for push notifications

**Database:**
- PostgreSQL (Supabase)
- Row Level Security (RLS) for multi-tenant isolation

**Cron Jobs:**
- Vercel Cron or external service (for daily storage sync)
- Hit `/api/admin/storage/sync` at 2 AM daily

### Code Organization

**New Files to Create:**
```
app/
  admin/
    tools/
      page.tsx                    # Main tools hub page
      components/
        images-tab.tsx            # Image storage analytics
        notifications-tab.tsx     # Push stats + config
  api/
    admin/
      storage/
        summary/route.ts          # GET storage summary
        sync/route.ts             # POST trigger sync
      notifications/
        stats/route.ts            # GET notification stats
        logs/route.ts             # GET notification logs
        test/route.ts             # POST test send
        config/route.ts           # GET/PUT config
      communities/
        [id]/
          seo/route.ts            # GET/PUT SEO settings

components/
  admin/
    tools/
      storage-overview-cards.tsx
      storage-trends-chart.tsx
      storage-by-community.tsx
      push-test-sender.tsx
      push-config-panel.tsx
      push-stats-dashboard.tsx
    communities/
      seo-settings-tab.tsx
      social-preview-cards.tsx

lib/
  admin/
    storage.ts                    # Storage utility functions
    push-notifications.ts         # Push notification utilities
```

### Deployment Checklist

**Before Phase 1:**
- [ ] Run database migrations (create new tables)
- [ ] Set up cron job for daily storage sync
- [ ] Test Supabase Storage API access (permissions)
- [ ] Deploy to staging and run full test suite
- [ ] Create feature flags in environment variables

**Before Phase 2:**
- [ ] Verify VAPID keys configured correctly
- [ ] Test metadata injection on staging
- [ ] Validate OG images in Facebook Debugger (staging URL)
- [ ] Set up Google Search Console for production domain

**Before Phase 3:**
- [ ] Test push notification delivery on multiple devices
- [ ] Verify rate limiting logic with load testing
- [ ] Document push notification setup for new admins
- [ ] Create troubleshooting guide for common issues

---

## Success Metrics

### Phase 1 (Image Storage Analytics)
- **Adoption:** 80% of admins view storage analytics within first month
- **Value:** Admins can identify storage usage within 5 clicks
- **Performance:** Dashboard loads in < 2 seconds

### Phase 2 (SEO + Push Stats)
- **SEO Impact:** 20% increase in organic traffic within 2 months (Google Analytics)
- **Click-through rate:** 10% improvement in SERP CTR (Search Console)
- **Push visibility:** 100% of admins view push stats within first week

### Phase 3 (Push Config + Testing)
- **Testing adoption:** 50% of admins send test notification within first month
- **Rate limiting:** < 5% of sends blocked by rate limit (not too restrictive)
- **Delivery reliability:** > 95% delivery rate across all communities

---

## Future Enhancements (Out of Scope)

These features are explicitly excluded from this design but noted for future consideration:

**Image Management:**
- Image compression and optimization tools
- Duplicate image detection and cleanup
- Unused image identification
- Bulk image operations (delete, move)

**Performance Monitoring:**
- Core Web Vitals tracking (LCP, FID, CLS, TTFB)
- Lighthouse audits integration
- Performance alerts and degradation tracking

**Advanced SEO:**
- Structured data editor (JSON-LD)
- Robots.txt and sitemap management
- A/B testing for meta descriptions
- Keyword research integration

**Advanced Push Notifications:**
- Notification scheduling (send later)
- Subscriber segmentation (send to groups)
- Quiet hours configuration
- Dynamic content personalization

---

## Appendix

### Glossary

- **RLS:** Row Level Security - Postgres security feature for multi-tenant data isolation
- **VAPID:** Voluntary Application Server Identification - Web Push protocol for authentication
- **OG Image:** Open Graph image - Social media preview image
- **SERP:** Search Engine Results Page - Google search results display
- **Core Web Vitals:** Google's page performance metrics (LCP, FID, CLS)
- **Rate Limiting:** Throttling request frequency to prevent abuse

### References

- [Next.js Metadata API](https://nextjs.org/docs/app/building-your-application/optimizing/metadata)
- [Supabase Storage API](https://supabase.com/docs/reference/javascript/storage)
- [Web Push Notifications](https://web.dev/push-notifications-overview/)
- [Open Graph Protocol](https://ogp.me/)
- [BarrioRed Brand Guidelines](../CLAUDE.md#brand-guidelines-neo-brutalist-tropical)

---

**End of Design Document**
