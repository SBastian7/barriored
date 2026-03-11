# Admin Tools Hub - Usage Guide

## Overview

The Admin Tools Hub provides centralized management for storage, SEO, and push notifications across all communities in the BarrioRed platform.

**Access:** `/admin/tools`

**Permissions:** Super Admins have access to all communities. Community Admins can only manage their own community's data.

---

## Features

### 1. Image Storage Analytics

**Tab:** Imágenes

**Capabilities:**
- View total storage usage across all buckets
- Breakdown by bucket (Negocios, Comunidad, Perfiles)
- Manual sync to update statistics
- Last sync timestamp

**How to Use:**
1. Navigate to `/admin/tools`
2. Click on "Imágenes" tab (default)
3. View current storage statistics
4. Click "Sincronizar Ahora" to refresh data
5. Monitor file counts and storage usage in GB

**Database:** `image_storage_analytics` table stores daily snapshots

---

### 2. SEO Management

**Tab:** Community Edit > SEO

**Capabilities:**
- Set meta title (max 70 characters)
- Set meta description (max 160 characters)
- Add meta keywords (comma-separated)
- Set Open Graph image URL
- Live Google search preview

**How to Use:**
1. Navigate to `/admin/communities`
2. Click "Editar" on a community
3. Click "SEO" tab
4. Fill in SEO fields:
   - **Meta Title:** Concise, keyword-rich title
   - **Meta Description:** Compelling summary (160 chars max)
   - **Keywords:** Comma-separated terms
   - **OG Image:** URL to social share image
5. Click "Guardar Cambios"
6. Verify changes appear in `<head>` of community pages

**Database:** `community_seo_settings` table

---

### 3. Push Notification Management

**Tab:** Notificaciones

#### 3.1 Statistics Dashboard

**Displays:**
- Total notifications sent (last 30 days)
- Delivery rate percentage
- Active subscribers count
- Average notifications per day
- Recent notification logs (last 10)

**How to Use:**
1. Navigate to `/admin/tools`
2. Click "Notificaciones" tab
3. View overview statistics
4. Check recent logs table for sent notifications

**Database:**
- `push_notification_logs` - All send records
- `push_subscriptions` - Subscriber list

#### 3.2 Test Notification Sender

**Capabilities:**
- Send test notifications without affecting rate limits
- Choose recipients: "Solo yo" (self only) or "Todos" (all subscribers)
- Preview before sending
- Character limits: Title (50 chars), Body (200 chars)

**How to Use:**
1. Navigate to `/admin/tools` > Notificaciones tab
2. Scroll to "Configuración y Pruebas" section (left card)
3. Select community from dropdown
4. Choose recipient mode:
   - **Solo yo:** Sends only to your browser subscriptions (safe for testing)
   - **Todos los suscriptores:** Sends to all community subscribers
5. Enter title (max 50 characters)
6. Enter message (max 200 characters)
7. Click "Enviar Prueba"
8. Check browser for notification
9. Verify in logs table (marked with test_mode: true)

**Rate Limiting:** Test notifications check rate limits but are marked as test_mode in logs.

#### 3.3 Configuration Panel

**Capabilities:**
- Enable/disable notifications per community
- Set daily rate limit (1-50 notifications per day)
- View current daily usage counter

**How to Use:**
1. Navigate to `/admin/tools` > Notificaciones tab
2. Scroll to "Configuración y Pruebas" section (right card)
3. Select community from dropdown
4. Toggle "Notificaciones Activadas" switch:
   - **ON:** Notifications will send normally
   - **OFF:** All notification sends will be blocked
5. Set "Límite Diario" (1-50):
   - Prevents spam by capping sends per day
   - Counter resets at midnight
6. View current usage: "X / Y enviadas hoy"
7. Click "Guardar Configuración"

**Database:** `push_notification_config` table (upserted on save)

---

## Navigation Links

### Internal Links

**From Alerts Page:**
- **Path:** `/admin/alerts`
- **Button:** "Configurar Notificaciones" (top-right)
- **Destination:** `/admin/tools?tab=notifications`
- **Purpose:** Quick access to notification settings when managing alerts

**From Admin Sidebar:**
- **Menu Item:** "Herramientas"
- **Icon:** Settings
- **Destination:** `/admin/tools`

---

## Testing Checklist

Before deploying to production, verify all features work correctly:

### Image Storage Analytics
- [ ] Navigate to `/admin/tools`
- [ ] Default tab is "Imágenes"
- [ ] Storage overview cards display with data
- [ ] Click "Sincronizar Ahora" button
- [ ] Confirm toast notification appears
- [ ] Verify "Última sincronización" timestamp updates
- [ ] Check breakdown by bucket (Negocios, Comunidad, Perfiles)
- [ ] Verify total storage adds up correctly

### SEO Settings
- [ ] Navigate to `/admin/communities`
- [ ] Click "Editar" on a community
- [ ] Click "SEO" tab
- [ ] Enter meta title (try exceeding 70 chars - should show warning)
- [ ] Enter meta description (try exceeding 160 chars - should show warning)
- [ ] Add keywords (comma-separated)
- [ ] Add OG image URL
- [ ] Check Google preview card updates live
- [ ] Click "Guardar Cambios"
- [ ] Refresh page and verify data persists
- [ ] View page source of community homepage
- [ ] Confirm meta tags appear in `<head>` section

### Push Notification Statistics
- [ ] Navigate to `/admin/tools?tab=notifications`
- [ ] Verify overview cards display:
  - Total Enviadas
  - Tasa de Entrega (percentage)
  - Suscriptores (active count)
  - Promedio Diario
- [ ] Check "Últimas Notificaciones" table shows logs
- [ ] Verify table displays: Date, Title, Sent/Failed counts

### Test Notification Sender
- [ ] Navigate to `/admin/tools?tab=notifications`
- [ ] Scroll to "Configuración y Pruebas" section (left card)
- [ ] Select community
- [ ] Choose "Solo yo" recipient mode
- [ ] Enter test title (max 50 chars)
- [ ] Enter test message (max 200 chars)
- [ ] Click "Enviar Prueba"
- [ ] Verify notification appears in browser
- [ ] Check toast success message
- [ ] Verify log appears in "Últimas Notificaciones" table
- [ ] Test with "Todos los suscriptores" mode (if safe)
- [ ] Verify character count displays correctly
- [ ] Try exceeding character limits (button should disable)

### Push Configuration Panel
- [ ] Navigate to `/admin/tools?tab=notifications`
- [ ] Scroll to "Configuración y Pruebas" section (right card)
- [ ] Select community
- [ ] Toggle "Notificaciones Activadas" switch OFF
- [ ] Verify warning message appears
- [ ] Try sending test notification (should fail/warn)
- [ ] Toggle switch back ON
- [ ] Change "Límite Diario" to different value (e.g., 5)
- [ ] Click "Guardar Configuración"
- [ ] Verify toast success message
- [ ] Refresh page and confirm value persists
- [ ] Check "X / Y enviadas hoy" counter is accurate

### Rate Limiting
- [ ] Set rate limit to 3 notifications per day
- [ ] Send 3 test notifications successfully
- [ ] Try sending 4th notification
- [ ] Verify 429 error response
- [ ] Verify toast shows "Límite diario alcanzado"
- [ ] Wait until next day (or manually update DB timestamp)
- [ ] Verify counter resets and notifications work again

### Navigation & Links
- [ ] Navigate to `/admin/alerts`
- [ ] Click "Configurar Notificaciones" button (top-right)
- [ ] Verify redirect to `/admin/tools?tab=notifications`
- [ ] Verify "Notificaciones" tab is active
- [ ] From admin sidebar, click "Herramientas"
- [ ] Verify redirect to `/admin/tools`

### Mobile Responsive
- [ ] Open `/admin/tools` on mobile (or dev tools mobile view)
- [ ] Verify tabs display correctly
- [ ] Verify cards stack vertically on small screens
- [ ] Test "Configuración y Pruebas" grid collapses to 1 column
- [ ] Verify all buttons are tappable
- [ ] Test scrolling and navigation

### Permissions & RLS
- [ ] Log in as **Super Admin**
  - [ ] Verify access to all communities in dropdowns
  - [ ] Verify can edit all community SEO settings
  - [ ] Verify can send notifications to any community
- [ ] Log in as **Community Admin**
  - [ ] Verify only see own community in dropdowns
  - [ ] Verify cannot access other communities' data
  - [ ] Verify SEO settings save only for own community
  - [ ] Verify notifications send only to own community
- [ ] Test RLS policies enforce isolation (check network tab)

### Error Handling
- [ ] Disconnect internet and try syncing storage
- [ ] Verify error toast displays
- [ ] Try sending notification with no subscribers
- [ ] Verify graceful handling (0 sent message)
- [ ] Enter invalid data in SEO fields (e.g., 200-char title)
- [ ] Verify validation errors display
- [ ] Test with empty required fields
- [ ] Verify form validation works

---

## Database Schema

### Tables Created

#### `image_storage_analytics`
Stores daily snapshots of storage usage per community and bucket.

```sql
- id: UUID (PK)
- community_id: UUID (FK -> communities)
- bucket_name: TEXT
- total_size_bytes: BIGINT
- file_count: INTEGER
- recorded_at: TIMESTAMPTZ
```

**RLS:** Admins can view their community's data.

#### `community_seo_settings`
SEO metadata per community.

```sql
- id: UUID (PK)
- community_id: UUID (UNIQUE, FK -> communities)
- meta_title: TEXT
- meta_description: TEXT
- meta_keywords: TEXT[]
- og_image_url: TEXT
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

**RLS:** Admins can manage their community's SEO.

#### `push_notification_logs`
Records all push notification sends.

```sql
- id: UUID (PK)
- community_id: UUID (FK -> communities)
- alert_id: UUID (nullable, FK -> community_alerts)
- title: TEXT
- body: TEXT
- sent_count: INTEGER
- failed_count: INTEGER
- clicked_count: INTEGER (default 0)
- test_mode: BOOLEAN (default false)
- sent_at: TIMESTAMPTZ
```

**RLS:** Admins can view their community's logs.

#### `push_notification_config`
Configuration settings per community.

```sql
- id: UUID (PK)
- community_id: UUID (UNIQUE, FK -> communities)
- is_enabled: BOOLEAN (default true)
- max_per_day: INTEGER (default 10, range 1-50)
- test_mode: BOOLEAN (default false)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

**RLS:** Admins can manage their community's config.

---

## API Endpoints

### Storage Analytics

**GET** `/api/admin/storage/summary`
- Query params: `community_id` (optional)
- Returns: Total storage + per-bucket breakdown
- Auth: Admin only

**POST** `/api/admin/storage/sync`
- Body: `{ community_id }`
- Returns: Success message
- Auth: Admin only
- Action: Queries Supabase Storage buckets and inserts snapshots

### SEO Management

**GET** `/api/admin/communities/[id]/seo`
- Returns: SEO settings or smart defaults
- Auth: Admin only

**PUT** `/api/admin/communities/[id]/seo`
- Body: `{ meta_title, meta_description, meta_keywords, og_image_url }`
- Returns: Updated SEO settings
- Auth: Admin only
- Validation: Title max 70 chars, description max 160 chars

### Push Notifications

**GET** `/api/admin/notifications/stats`
- Query params: `days` (default 30)
- Returns: Overview statistics
- Auth: Admin only

**GET** `/api/admin/notifications/logs`
- Query params: `limit` (default 50), `offset` (default 0)
- Returns: Paginated logs
- Auth: Admin only

**GET** `/api/admin/notifications/config`
- Query params: `community_id`
- Returns: Config + current daily count
- Auth: Admin only

**PUT** `/api/admin/notifications/config`
- Body: `{ community_id, is_enabled, max_per_day }`
- Returns: Updated config
- Auth: Admin only
- Validation: max_per_day range 1-50

**POST** `/api/admin/notifications/test`
- Body: `{ community_id, title, body, recipient_mode }`
- Returns: Send results
- Auth: Admin only
- Validation:
  - Title max 50 chars
  - Body max 200 chars
  - Checks rate limiting
  - Filters recipients by mode
- Action: Sends test notification, logs with test_mode: true

---

## Known Limitations

### Storage Analytics
- Does **not** track actual file sizes (Supabase Storage API limitation)
- File count is accurate, but total_size_bytes is placeholder
- Requires daily cron job for historical trend data
- No real-time webhooks for storage updates

### SEO Management
- Meta tag injection requires server restart to clear cache
- No structured data editor (future enhancement)
- No sitemap generation (out of scope)

### Push Notifications
- Click tracking not yet implemented (clicked_count always 0)
- No notification scheduling (immediate send only)
- No subscriber segmentation (all or self only)
- Rate limit resets at midnight UTC (not configurable timezone)

---

## Future Enhancements (Out of Scope)

### Storage
- [ ] Image compression and optimization
- [ ] Core Web Vitals tracking
- [ ] CDN integration

### SEO
- [ ] Structured data editor (JSON-LD)
- [ ] Sitemap auto-generation
- [ ] Canonical URL management

### Notifications
- [ ] Scheduling (send at specific time)
- [ ] Segmentation (target by location, interests)
- [ ] A/B testing for notifications
- [ ] Click tracking with analytics
- [ ] Rich notifications with images/actions

---

## Troubleshooting

### Storage Sync Not Working
- **Problem:** Sync button doesn't update statistics
- **Solution:**
  1. Check browser console for errors
  2. Verify admin role in `profiles` table
  3. Check RLS policies on `image_storage_analytics`
  4. Ensure Supabase Storage API is accessible

### SEO Changes Not Appearing
- **Problem:** Meta tags don't update in page source
- **Solution:**
  1. Hard refresh browser (Ctrl+Shift+R)
  2. Restart Next.js dev server
  3. Clear browser cache
  4. Check `community_seo_settings` table for saved data
  5. Verify RLS policies allow admin to read/write

### Notifications Not Sending
- **Problem:** Test notifications don't arrive
- **Solution:**
  1. Check browser notification permissions (allow)
  2. Verify service worker is registered (`/sw.js`)
  3. Check `push_subscriptions` table for active subscriptions
  4. Verify VAPID keys are set in `.env.local`
  5. Check `push_notification_config.is_enabled` is true
  6. Verify rate limit not exceeded
  7. Check browser console for web-push errors

### Rate Limit Issues
- **Problem:** Can't send notifications even though counter shows space
- **Solution:**
  1. Check `push_notification_logs` table for today's sends
  2. Verify `sent_at` timestamp is today
  3. Check `push_notification_config.max_per_day` value
  4. Ensure timezone handling is correct (UTC midnight)
  5. Manually reset counter if needed (delete today's logs)

### RLS Policy Blocking Access
- **Problem:** "Permission denied" errors
- **Solution:**
  1. Verify user role in `profiles` table
  2. Check `is_super_admin` flag
  3. Verify `community_id` matches for community admins
  4. Test RLS policies in Supabase SQL Editor
  5. Check auth session is valid

---

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review database schema and RLS policies
3. Check API endpoint logs in browser dev tools
4. Verify environment variables (`.env.local`)
5. Test in incognito mode to rule out cache issues

---

**Version:** 1.0.0
**Last Updated:** March 10, 2026
**Author:** BarrioRed Development Team
