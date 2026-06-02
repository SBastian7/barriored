# App-Wide Bug Fixes & Jobs Centralization

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 9 reported bugs across navigation, maps, offline state, community posts, layout, business editing, moderator access, and centralize job postings into the Marketplace.

**Architecture:** Fixes span the full stack — Supabase migration (lat/lng on businesses), Next.js App Router layouts (dashboard/profile get community nav), API routes (PATCH PGRST116, revalidation), and component-level bugs (redirect paths, offline detection). Jobs migration removes the `job` type from the community section entirely and relies on the existing `Trabajo` marketplace category.

**Tech Stack:** Next.js 16 App Router, Supabase (PostgreSQL + PostGIS + RLS), React 19, Leaflet, Tailwind CSS, TypeScript.

---

## File Map

| File | Change |
|------|--------|
| `components/home/quick-nav.tsx` | Enable Marketplace card |
| `app/[community]/layout.tsx` | Add PushNotificationPrompt |
| `components/layout/user-menu.tsx` | Show admin link for moderators |
| `components/community/post-edit-actions.tsx` | Fix redirect paths after delete |
| `components/community/post-edit-form.tsx` | Fix redirect path after update |
| `app/api/community/posts/[id]/route.ts` | Remove `.single()` from PATCH |
| `hooks/use-online-status.ts` | Event-based only, no initial false-positive |
| `components/dashboard/edit-business-form.tsx` | Add `router.refresh()` + read new lat/lng columns |
| `app/api/businesses/[id]/route.ts` | `revalidatePath` + store lat/lng |
| `app/api/businesses/route.ts` | Store lat/lng on create |
| `supabase/migrations/20260514001000_add_business_lat_lng.sql` | **New** — add columns + backfill + trigger |
| `app/[community]/business/[slug]/page.tsx` | Read `latitude`/`longitude` columns, remove linked jobs |
| `app/[community]/directory/page.tsx` | Add businesses map, select lat/lng |
| `components/business/businesses-map.tsx` | **New** — dynamic wrapper |
| `components/business/leaflet-businesses-map.tsx` | **New** — Leaflet multi-marker map |
| `app/dashboard/layout.tsx` | Replace custom header with community nav |
| `app/profile/layout.tsx` | **New** — community nav for profile |
| `app/[community]/community/page.tsx` | Remove JobsSection |
| `app/[community]/community/jobs/page.tsx` | **Delete** |
| `app/[community]/community/jobs/new/page.tsx` | **Delete** |
| `app/[community]/community/jobs/[id]/page.tsx` | **Delete** |
| `app/[community]/community/empleos/[id]/edit/page.tsx` | **Delete** |
| `components/community/jobs-section.tsx` | **Delete** |
| `components/community/job-filled-toggle.tsx` | **Delete** |
| `app/api/community/posts/[id]/toggle-filled/route.ts` | **Delete** (if exists) |
| `components/community/post-form.tsx` | Remove job type |
| `components/community/post-edit-form.tsx` | Remove job fields section |
| `components/community/post-edit-actions.tsx` | Remove job from type map |
| `components/community/post-card.tsx` | Remove job-specific display |
| `app/dashboard/page.tsx` | Remove job references from community posts section |
| `app/admin/community/page.tsx` | Remove job type from filters |
| `lib/types/index.ts` | Remove `'job'` from PostType |

---

## Task 1: Quick UI fixes (3 one-liners)

**Files:**
- Modify: `components/home/quick-nav.tsx:29`
- Modify: `app/[community]/layout.tsx`
- Modify: `components/layout/user-menu.tsx:112`

- [ ] **Step 1: Enable Marketplace in QuickNav**

In `components/home/quick-nav.tsx`, change line 29:
```typescript
// BEFORE
enabled: false,
// AFTER
enabled: true,
```

- [ ] **Step 2: Move PushNotificationPrompt to community layout**

In `app/[community]/layout.tsx`, add the import and render the prompt inside the layout:

```typescript
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CommunityProvider } from '@/components/community/community-provider'
import { TopBar } from '@/components/layout/top-bar'
import { BottomNav } from '@/components/layout/bottom-nav'
import { PushNotificationPrompt } from '@/components/community/push-notification-prompt'

// ... (generateMetadata unchanged) ...

export default async function CommunityLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ community: string }>
}) {
  const { community: slug } = await params
  const supabase = await createClient()
  const { data: community } = await supabase
    .from('communities')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single<{
      id: string
      name: string
      slug: string
      municipality: string
      department: string
      description: string | null
      logo_url: string | null
      primary_color: string | null
      cover_image_url: string | null
      [key: string]: any
    }>()

  if (!community) notFound()

  return (
    <CommunityProvider community={community}>
      <div className="min-h-screen pb-16 md:pb-0">
        <TopBar />
        <main>{children}</main>
        <BottomNav />
        <PushNotificationPrompt />
      </div>
    </CommunityProvider>
  )
}
```

Also remove `<PushNotificationPrompt />` from `app/[community]/community/page.tsx` (both the import on line 10 and the JSX on line 114).

- [ ] **Step 3: Show admin link for moderators in UserMenu**

In `components/layout/user-menu.tsx`, find this condition (around line 112):
```typescript
{userState.role === 'admin' && (
```
Change it to:
```typescript
{(userState.role === 'admin' || userState.role === 'moderator') && (
```

- [ ] **Step 4: Verify**

Start dev server (`npm run dev`). Check:
- Homepage QuickNav: Marketplace card is now clickable (navigates to `/community/marketplace`)
- Visit any page in `/{community}/...` after dismissing push notification prompt once — the prompt should no longer appear on that page session
- Log in as the moderator user → UserMenu should now show "Administración" link

- [ ] **Step 5: Commit**

```bash
git add components/home/quick-nav.tsx app/[community]/layout.tsx app/[community]/community/page.tsx components/layout/user-menu.tsx
git commit -m "fix: enable marketplace in quicknav, push prompt in layout, moderator admin access"
```

---

## Task 2: Fix community post delete/update redirect paths

**Files:**
- Modify: `components/community/post-edit-actions.tsx`
- Modify: `components/community/post-edit-form.tsx`

**Context:** The edit/delete UI uses Spanish path segments (`anuncios`, `eventos`, `empleos`) for redirects, but the actual listing and detail pages are at English paths (`announcements`, `events`, `jobs`). After delete → redirects to a 404. After update → redirects to a 404.

- [ ] **Step 1: Fix delete redirect in PostEditActions**

In `components/community/post-edit-actions.tsx`, replace the `postTypeSpanish` object and its usage in `handleDelete`:

```typescript
// BEFORE (around line 40)
const postTypeSpanish = {
  announcement: 'anuncios',
  event: 'eventos',
  job: 'empleos',
}[postType]

// Inside handleDelete:
router.push(`/${communitySlug}/community/${postTypeSpanish}`)

// AFTER
const postTypePath = {
  announcement: 'announcements',
  event: 'events',
  job: 'jobs',
}[postType]

// Inside handleDelete:
router.push(`/${communitySlug}/community/${postTypePath}`)
```

Also fix the edit link href (around line 71). Change it from using `postTypeSpanish` to `postTypePath`:
```typescript
// BEFORE
<Link href={`/${communitySlug}/community/${postTypeSpanish}/${postId}/edit`}>

// AFTER — edit pages live at Spanish paths, keep using them
<Link href={`/${communitySlug}/community/${postTypeSpanish}/${postId}/edit`}>
```

Wait — the edit pages ARE at Spanish paths (`anuncios/[id]/edit`, `eventos/[id]/edit`, `empleos/[id]/edit`). Keep a separate variable for the edit link path:

Full updated top of `PostEditActions`:
```typescript
const postTypePath = {
  announcement: 'announcements',
  event: 'events',
  job: 'jobs',
}[postType]

const postTypeEditPath = {
  announcement: 'anuncios',
  event: 'eventos',
  job: 'empleos',
}[postType]
```

Then in the delete handler use `postTypePath`, and in the edit `Link` href use `postTypeEditPath`.

- [ ] **Step 2: Fix post-update redirect in PostEditForm**

In `components/community/post-edit-form.tsx`, find the redirect after successful update (around line 65):
```typescript
// BEFORE
const postTypeSpanish = post.type === 'announcement' ? 'anuncios' : post.type === 'event' ? 'eventos' : 'empleos'
router.push(`/${communitySlug}/community/${postTypeSpanish}/${post.id}`)

// AFTER
const postTypePath = post.type === 'announcement' ? 'announcements' : post.type === 'event' ? 'events' : 'jobs'
router.push(`/${communitySlug}/community/${postTypePath}/${post.id}`)
```

- [ ] **Step 3: Verify**

Log in as a user with an approved announcement/event. Go to the detail page and click "Eliminar" → confirm delete → should redirect to the listing page (not 404). Similarly, edit a post and save → should redirect to the detail page.

- [ ] **Step 4: Commit**

```bash
git add components/community/post-edit-actions.tsx components/community/post-edit-form.tsx
git commit -m "fix: correct redirect paths after community post delete and update"
```

---

## Task 3: Fix PATCH PGRST116 on community post update

**Files:**
- Modify: `app/api/community/posts/[id]/route.ts`

**Context:** The PATCH handler calls `.update(...).select().single()` which throws PGRST116 ("Cannot coerce the result to a single JSON object") when RLS blocks reading the updated row. Fix: drop `.select().single()` and return `{ success: true }`.

- [ ] **Step 1: Update the PATCH handler**

In `app/api/community/posts/[id]/route.ts`, replace the update block (lines 64–73):

```typescript
// BEFORE
const { data, error } = await (supabase as any)
    .from('community_posts')
    .update({ ...parsed.data, metadata: parsed.data.metadata as any, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

if (error) return NextResponse.json({ error: error.message }, { status: 500 })

return NextResponse.json(data)

// AFTER
const { error: updateError } = await supabase
    .from('community_posts')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', id)

if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

return NextResponse.json({ success: true })
```

- [ ] **Step 2: Verify**

Edit an existing announcement or event. Submit the form. Should show "¡Actualizado!" toast and redirect to the detail page without errors. Check the browser console and network tab — no 500 errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/community/posts/[id]/route.ts
git commit -m "fix: remove .single() from community post PATCH to prevent PGRST116"
```

---

## Task 4: Fix offline banner false positive

**Files:**
- Modify: `hooks/use-online-status.ts`

**Context:** `navigator.onLine` is unreliable on initial mount in some environments (Windows, some dev setups). The hook trusts the initial value, showing "Sin conexión" when actually online. Fix: always start as `true` and only update state in response to actual browser `online`/`offline` events.

- [ ] **Step 1: Update useOnlineStatus**

Replace the entire file `hooks/use-online-status.ts`:
```typescript
'use client'

import { useEffect, useState } from 'react'

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    // Sync with actual state after mount, then rely on events
    setIsOnline(navigator.onLine)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return { isOnline }
}
```

The key change: `useState(true)` instead of `useState(() => navigator.onLine)`. The component renders online by default (no flash), then syncs after hydration.

- [ ] **Step 2: Verify**

Visit `http://localhost:3000`. The offline banner should NOT appear. Open DevTools → Network tab → toggle "Offline" mode → the banner should appear. Toggle back to online → toast "Conexión restaurada" should show.

- [ ] **Step 3: Commit**

```bash
git add hooks/use-online-status.ts
git commit -m "fix: prevent offline banner false positive on initial mount"
```

---

## Task 5: Fix business update — stale data after save

**Files:**
- Modify: `components/dashboard/edit-business-form.tsx`
- Modify: `app/api/businesses/[id]/route.ts`

**Context:** After updating a business, the user is redirected to `/dashboard` but sees old data (hard refresh needed). Fix: (a) call `router.refresh()` to bust the Next.js cache before redirecting, (b) add `revalidatePath` in the API so server-cached pages also update.

- [ ] **Step 1: Add router.refresh() in EditBusinessForm**

In `components/dashboard/edit-business-form.tsx`, find the success handler after the PATCH call. Locate the line with `router.push('/dashboard')` and add `router.refresh()` before it:

```typescript
// After the successful PATCH response, replace:
router.push('/dashboard')

// With:
router.refresh()
router.push('/dashboard')
```

- [ ] **Step 2: Add revalidatePath in the PATCH API**

In `app/api/businesses/[id]/route.ts`, add revalidation after the successful update. Add the import at the top:
```typescript
import { revalidatePath } from 'next/cache'
import { revalidateTag } from 'next/cache'
```

After `return NextResponse.json(data)`, add before it:
```typescript
revalidatePath('/dashboard')
revalidatePath(`/[community]/business/${id}`, 'page')
revalidateTag(`businesses-${data.community_id}`)  // busts directory cache

return NextResponse.json(data)
```

Full updated success block in the PATCH handler:
```typescript
if (error) {
  return NextResponse.json({ error: error.message }, { status: 500 })
}

revalidatePath('/dashboard')
revalidateTag(`businesses-${data.community_id}`)

return NextResponse.json(data)
```

Note: `revalidatePath` and `revalidateTag` are imported from `'next/cache'`.

- [ ] **Step 3: Verify**

Edit a business name. Save. The dashboard should show the new name immediately without needing a manual refresh.

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/edit-business-form.tsx app/api/businesses/[id]/route.ts
git commit -m "fix: refresh data after business update without requiring hard reload"
```

---

## Task 6: DB migration — add lat/lng columns to businesses

**Files:**
- Create: `supabase/migrations/20260514001000_add_business_lat_lng.sql`
- Modify: `app/api/businesses/[id]/route.ts` (store lat/lng on update)
- Modify: `app/api/businesses/route.ts` (store lat/lng on create)
- Modify: `components/dashboard/edit-business-form.tsx` (read new columns)
- Modify: `app/[community]/business/[slug]/page.tsx` (read new columns for map)
- Modify: `app/dashboard/business/[id]/edit/page.tsx` (pass lat/lng to form)

**Context:** Supabase returns PostGIS `location` as a WKB hex string, not as a GeoJSON object with `.coordinates`. The edit form defaults to Pereira coordinates when `location?.coordinates` is undefined. Fix: add proper `latitude`/`longitude` float8 columns, backfill from PostGIS, and keep them in sync via trigger.

- [ ] **Step 1: Create the migration file**

Create `supabase/migrations/20260514001000_add_business_lat_lng.sql`:

```sql
-- Add latitude and longitude as regular columns for easy client-side access
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS latitude  FLOAT8,
  ADD COLUMN IF NOT EXISTS longitude FLOAT8;

-- Backfill from existing PostGIS data
UPDATE businesses
SET
  latitude  = ST_Y(location::geometry),
  longitude = ST_X(location::geometry)
WHERE location IS NOT NULL;

-- Trigger to keep lat/lng in sync when location is updated
CREATE OR REPLACE FUNCTION sync_business_lat_lng()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.location IS NOT NULL THEN
    NEW.latitude  := ST_Y(NEW.location::geometry);
    NEW.longitude := ST_X(NEW.location::geometry);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_business_lat_lng ON businesses;
CREATE TRIGGER trg_sync_business_lat_lng
  BEFORE INSERT OR UPDATE OF location ON businesses
  FOR EACH ROW EXECUTE FUNCTION sync_business_lat_lng();
```

- [ ] **Step 2: Apply the migration via Supabase MCP**

Use the `mcp__plugin_supabase_supabase__apply_migration` tool with:
- `project_id`: `qtridgmtcddlkpandzpf`
- `name`: `add_business_lat_lng`
- `query`: (the SQL above)

Verify by running:
```sql
SELECT id, name, latitude, longitude FROM businesses WHERE location IS NOT NULL LIMIT 3;
```
Expected: rows have non-null lat/lng values matching the business locations in Pereira area (lat ≈ 4.81, lng ≈ -75.69).

- [ ] **Step 3: Update the business UPDATE API to store lat/lng**

In `app/api/businesses/[id]/route.ts`, in the PATCH handler, update the data construction block so lat/lng are explicitly stored:

```typescript
// BEFORE
const updateData: Record<string, unknown> = { ...parsed.data }
if (parsed.data.latitude && parsed.data.longitude) {
  updateData.location = `POINT(${parsed.data.longitude} ${parsed.data.latitude})`
  delete updateData.latitude
  delete updateData.longitude
}

// AFTER
const updateData: Record<string, unknown> = { ...parsed.data }
if (parsed.data.latitude && parsed.data.longitude) {
  updateData.location = `POINT(${parsed.data.longitude} ${parsed.data.latitude})`
  // Keep latitude/longitude — trigger also sets them but explicit is safer
  // They are now real columns on the table
}
```

The trigger will handle sync, but keeping them in updateData is fine since they're real columns now.

- [ ] **Step 4: Update the business CREATE API to store lat/lng**

Open `app/api/businesses/route.ts`. Find where `location` is constructed and add lat/lng:

```typescript
// Find the location construction block (search for POINT):
// BEFORE (approximately):
const businessData = {
  ...parsed.data,
  location: `POINT(${parsed.data.longitude} ${parsed.data.latitude})`,
  // ...
}
delete businessData.latitude
delete businessData.longitude

// AFTER: Remove the deletes so lat/lng are stored:
const businessData = {
  ...parsed.data,
  location: `POINT(${parsed.data.longitude} ${parsed.data.latitude})`,
  // latitude and longitude stay in the object — they are real columns
}
// Remove any lines that do: delete businessData.latitude / delete businessData.longitude
```

- [ ] **Step 5: Fix EditBusinessForm to read new lat/lng columns**

In `components/dashboard/edit-business-form.tsx`, replace the PostGIS extraction at the top of the component:

```typescript
// BEFORE (lines 57-59)
const location = business.location as any
const initialLat = location?.coordinates?.[1] ?? 4.8133
const initialLng = location?.coordinates?.[0] ?? -75.6961

// AFTER
const initialLat = (business.latitude as number | null) ?? 4.8133
const initialLng = (business.longitude as number | null) ?? -75.6961
```

- [ ] **Step 6: Update the edit page to select lat/lng**

In `app/dashboard/business/[id]/edit/page.tsx`, update the Supabase select query to include the new columns:

```typescript
// Find the select query for the business and add latitude, longitude:
const { data: business } = await supabase
  .from('businesses')
  .select('*, categories(name), latitude, longitude')
  // ... rest of query unchanged
```

- [ ] **Step 7: Fix business detail page to use new lat/lng columns**

In `app/[community]/business/[slug]/page.tsx`, find where `lat` and `lng` are extracted (search for `lat` in the file). Update the select query and the extraction:

Update the select:
```typescript
const { data: business } = await supabase
  .from('businesses')
  .select('*, categories(name, slug), latitude, longitude')
  // ... rest unchanged
```

Then find where `lat` and `lng` are defined (likely extracted from the PostGIS object). Replace:
```typescript
// BEFORE (something like):
const location = business?.location as any
const lat = location?.coordinates?.[1]
const lng = location?.coordinates?.[0]

// AFTER:
const lat = business?.latitude as number | undefined
const lng = business?.longitude as number | undefined
```

Also, remove the linked jobs section from the business detail page (part of Task 9). Search for "Ofertas de Empleo" or `linked_business_id` in this file and remove that block.

- [ ] **Step 8: Verify**

1. Open a business edit form — the map should show the business's actual location, not Pereira center.
2. Move the map pin to a new location, save. The map in the edit form should show the new location on next open.
3. Visit the business detail page — the map should appear and show the correct location.

- [ ] **Step 9: Commit**

```bash
git add supabase/migrations/20260514001000_add_business_lat_lng.sql \
        app/api/businesses/[id]/route.ts \
        app/api/businesses/route.ts \
        components/dashboard/edit-business-form.tsx \
        app/dashboard/business/[id]/edit/page.tsx \
        app/[community]/business/[slug]/page.tsx
git commit -m "feat: add lat/lng columns to businesses for reliable coordinate access"
```

---

## Task 7: Add businesses map to directory page

**Files:**
- Create: `components/business/businesses-map.tsx`
- Create: `components/business/leaflet-businesses-map.tsx`
- Modify: `app/[community]/directory/page.tsx`

**Context:** The directory page lists all businesses but has no map. Add a Leaflet map above the listing showing all business locations as markers. Clicking a marker links to the business profile.

- [ ] **Step 1: Create the Leaflet multi-marker map component**

Create `components/business/leaflet-businesses-map.tsx`:

```typescript
'use client'

import { useEffect } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

type BusinessMarker = {
  id: string
  name: string
  slug: string
  latitude: number
  longitude: number
  address: string | null
}

// Fix Leaflet default marker icon (Webpack/Next.js issue)
const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
})

export function LeafletBusinessesMap({
  businesses,
  communitySlug,
}: {
  businesses: BusinessMarker[]
  communitySlug: string
}) {
  useEffect(() => {
    const container = document.getElementById('businesses-map')
    if (!container || (container as any)._leaflet_id) return

    const validBusinesses = businesses.filter(b => b.latitude && b.longitude)
    if (validBusinesses.length === 0) return

    const avgLat = validBusinesses.reduce((s, b) => s + b.latitude, 0) / validBusinesses.length
    const avgLng = validBusinesses.reduce((s, b) => s + b.longitude, 0) / validBusinesses.length

    const map = L.map('businesses-map').setView([avgLat, avgLng], 15)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map)

    validBusinesses.forEach(b => {
      L.marker([b.latitude, b.longitude], { icon })
        .addTo(map)
        .bindPopup(
          `<div style="font-weight:bold;font-size:14px">${b.name}</div>` +
          (b.address ? `<div style="font-size:12px;color:#666">${b.address}</div>` : '') +
          `<a href="/${communitySlug}/business/${b.slug}" style="font-size:12px;color:#e11d48;font-weight:bold">Ver perfil →</a>`
        )
    })

    // Fit map to all markers
    if (validBusinesses.length > 1) {
      const bounds = L.latLngBounds(validBusinesses.map(b => [b.latitude, b.longitude]))
      map.fitBounds(bounds, { padding: [30, 30] })
    }

    return () => { map.remove() }
  }, [businesses, communitySlug])

  return <div id="businesses-map" style={{ height: '100%', width: '100%' }} />
}
```

- [ ] **Step 2: Create the dynamic wrapper**

Create `components/business/businesses-map.tsx`:

```typescript
'use client'

import dynamic from 'next/dynamic'

const LeafletBusinessesMap = dynamic(
  () => import('./leaflet-businesses-map').then(m => m.LeafletBusinessesMap),
  { ssr: false, loading: () => <div className="h-full w-full bg-muted animate-pulse" /> }
)

type BusinessMarker = {
  id: string
  name: string
  slug: string
  latitude: number
  longitude: number
  address: string | null
}

export function BusinessesMap({
  businesses,
  communitySlug,
}: {
  businesses: BusinessMarker[]
  communitySlug: string
}) {
  const mapped = businesses.filter(b => b.latitude && b.longitude)
  if (mapped.length === 0) return null

  return (
    <div className="border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden h-[320px] md:h-[400px]">
      <LeafletBusinessesMap businesses={mapped} communitySlug={communitySlug} />
    </div>
  )
}
```

- [ ] **Step 3: Update directory page to select lat/lng and render map**

In `app/[community]/directory/page.tsx`:

In the `getDirectoryData` function, update the select to include `latitude, longitude`:
```typescript
const { data: businesses } = await (admin as any)
  .from('businesses')
  .select('id, name, slug, description, photos, whatsapp, address, latitude, longitude, created_at, is_featured, categories(name, slug)')
  // ... rest unchanged
```

Also update the search branch (around line 108) to include `latitude, longitude`:
```typescript
const { data: full } = await supabase
  .from('businesses')
  .select('id, name, slug, description, photos, whatsapp, address, latitude, longitude, created_at, is_featured, categories(name, slug)')
  .in('id', ids)
  .eq('status', 'approved')
```

Add the import at the top of the file:
```typescript
import { BusinessesMap } from '@/components/business/businesses-map'
```

In both return statements (no-search and search branches), add the map between the header and DirectoryView:

```tsx
// After BannerRotator and before DirectoryView, add:
<div className="mb-8">
  <h2 className="text-sm font-black uppercase tracking-widest text-black/40 mb-3">
    Negocios en el mapa
  </h2>
  <BusinessesMap businesses={businesses} communitySlug={slug} />
</div>
```

- [ ] **Step 4: Verify**

Visit `/{community}/directory`. A Leaflet map should appear above the business listing with markers for each business. Clicking a marker shows a popup with the business name and a "Ver perfil →" link.

- [ ] **Step 5: Commit**

```bash
git add components/business/businesses-map.tsx components/business/leaflet-businesses-map.tsx app/[community]/directory/page.tsx
git commit -m "feat: add businesses map to directory page"
```

---

## Task 8: Dashboard and Profile with community navigation

**Files:**
- Modify: `app/dashboard/layout.tsx`
- Create: `app/profile/layout.tsx`

**Context:** `/dashboard` and `/profile` have their own isolated layouts without TopBar/BottomNav. Fix: wrap both with `CommunityProvider` using the user's profile community, giving them the full app nav.

- [ ] **Step 1: Update dashboard layout**

Replace the entire content of `app/dashboard/layout.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CommunityProvider } from '@/components/community/community-provider'
import { TopBar } from '@/components/layout/top-bar'
import { BottomNav } from '@/components/layout/bottom-nav'

export const metadata = { title: 'Mi Panel | BarrioRed' }

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?returnUrl=/dashboard')

  const { data: profile } = await supabase
    .from('profiles')
    .select('communities(*)')
    .eq('id', user.id)
    .single() as { data: { communities: any } | null }

  const community = profile?.communities ?? null

  if (!community) {
    // User not linked to a community yet — show basic layout
    return (
      <div className="min-h-screen bg-background pb-16 md:pb-0">
        <main className="container mx-auto max-w-5xl px-4 py-8">{children}</main>
      </div>
    )
  }

  return (
    <CommunityProvider community={community}>
      <div className="min-h-screen bg-background pb-16 md:pb-0">
        <TopBar />
        <main>{children}</main>
        <BottomNav />
      </div>
    </CommunityProvider>
  )
}
```

- [ ] **Step 2: Create profile layout**

Create `app/profile/layout.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CommunityProvider } from '@/components/community/community-provider'
import { TopBar } from '@/components/layout/top-bar'
import { BottomNav } from '@/components/layout/bottom-nav'

export const metadata = { title: 'Mi Perfil | BarrioRed' }

export default async function ProfileLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('communities(*)')
    .eq('id', user.id)
    .single() as { data: { communities: any } | null }

  const community = profile?.communities ?? null

  if (!community) {
    return (
      <div className="min-h-screen bg-background pb-16 md:pb-0">
        <main>{children}</main>
      </div>
    )
  }

  return (
    <CommunityProvider community={community}>
      <div className="min-h-screen bg-background pb-16 md:pb-0">
        <TopBar />
        <main>{children}</main>
        <BottomNav />
      </div>
    </CommunityProvider>
  )
}
```

- [ ] **Step 3: Remove metadata from profile/page.tsx**

Since the new `profile/layout.tsx` sets `metadata`, remove the metadata export from `app/profile/page.tsx` (the layout takes precedence and having both can cause duplication). Find and remove:

```typescript
// Remove these lines from app/profile/page.tsx:
export const metadata = {
  title: 'Mi Perfil | BarrioRed',
  description: 'Administra tu perfil de usuario',
}
```

- [ ] **Step 4: Verify**

1. Navigate to `/dashboard` — should show TopBar + BottomNav with community nav links, no "← Mi Panel" back button.
2. Navigate to `/profile` — same community nav should appear.
3. The UserMenu inside the TopBar should still work (shows user email, Mi Perfil/Mi Panel links, Cerrar Sesión).
4. Clicking "Directorio" in the nav from dashboard should work correctly.

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/layout.tsx app/profile/layout.tsx app/profile/page.tsx
git commit -m "fix: dashboard and profile pages now use community nav layout"
```

---

## Task 9: Remove jobs from community section

**Files (delete):**
- `app/[community]/community/jobs/page.tsx`
- `app/[community]/community/jobs/new/page.tsx`
- `app/[community]/community/jobs/[id]/page.tsx`
- `app/[community]/community/empleos/[id]/edit/page.tsx`
- `components/community/jobs-section.tsx`
- `components/community/job-filled-toggle.tsx`
- `app/api/community/posts/[id]/toggle-filled/route.ts` (if exists)

**Files (modify):**
- `app/[community]/community/page.tsx`
- `app/dashboard/page.tsx`
- `app/admin/community/page.tsx`
- `components/community/post-form.tsx`
- `components/community/post-edit-form.tsx`
- `components/community/post-edit-actions.tsx`
- `components/community/post-card.tsx`
- `lib/types/index.ts`

**Context:** Jobs are centralized in the Marketplace ("Trabajo" category already exists). Remove all job-specific code from the community section. The 1 existing community job post in the DB is harmless orphaned test data.

- [ ] **Step 1: Delete community job pages**

Delete these files:
```bash
rm "app/[community]/community/jobs/page.tsx"
rm "app/[community]/community/jobs/new/page.tsx"
rm "app/[community]/community/jobs/[id]/page.tsx"
rm "app/[community]/community/empleos/[id]/edit/page.tsx"
```

Also remove the now-empty directories:
```bash
rm -rf "app/[community]/community/jobs"
rm -rf "app/[community]/community/empleos"
```

- [ ] **Step 2: Delete job components**

```bash
rm "components/community/jobs-section.tsx"
rm "components/community/job-filled-toggle.tsx"
```

Check if `app/api/community/posts/[id]/toggle-filled/route.ts` exists and delete it:
```bash
# Check first:
ls "app/api/community/posts/[id]/"
# If toggle-filled/route.ts exists:
rm -rf "app/api/community/posts/[id]/toggle-filled"
```

- [ ] **Step 3: Remove JobsSection from community hub page**

In `app/[community]/community/page.tsx`:

Remove the import (line 7):
```typescript
// Remove:
import { JobsSection } from '@/components/community/jobs-section'
```

Remove the jobs data fetch from the `Promise.all` (the 4th element):
```typescript
// BEFORE:
const [alertsRes, announcementsRes, eventsRes, jobsRes, promotionsRes] = await Promise.all([
  // ... 5 queries
])

// AFTER:
const [alertsRes, announcementsRes, eventsRes, promotionsRes] = await Promise.all([
  // alerts query (unchanged)
  // announcements query (unchanged)
  // events query (unchanged)
  // REMOVE the jobs query entirely
  // promotions query (unchanged)
])
```

Remove the `<JobsSection>` JSX:
```typescript
// Remove this line:
<JobsSection posts={(jobsRes.data ?? []) as any} communitySlug={slug} />
```

- [ ] **Step 4: Remove job type from PostType**

In `lib/types/index.ts`, find the `PostType` definition and remove `'job'`:

```typescript
// BEFORE:
export type PostType = 'announcement' | 'event' | 'job' | 'promotion'

// AFTER:
export type PostType = 'announcement' | 'event' | 'promotion'
```

Also remove `JobMetadata` type if it exists in the same file (search for `JobMetadata`). Remove the full type definition.

- [ ] **Step 5: Remove job from post-form.tsx**

In `components/community/post-form.tsx`, the `type` prop is `'announcement' | 'event' | 'job'`. Update:

```typescript
// Update the Props type:
type Props = {
    type: 'announcement' | 'event'  // Remove 'job'
    communityId: string
    communitySlug: string
}
```

Remove the `defaultValues` for job type (line 49):
```typescript
// Remove:
...(type === 'job' ? { metadata: { category: '', contact_method: 'whatsapp', contact_value: '' } } : {}),
```

Remove the job-specific form fields section (search for `type === 'job'` in the JSX and remove that block). Remove the `Briefcase` import from lucide-react if no longer used.

- [ ] **Step 6: Remove job from post-edit-form.tsx**

In `components/community/post-edit-form.tsx`:

Remove `JobFilledToggle` import if present. Remove the job-specific fields section (search for `post.type === 'job'` in the JSX — remove that entire conditional block). Remove `PhoneInput` import if it was only used for the job contact field.

Update the redirect logic at line 65 to remove the job case:
```typescript
// BEFORE:
const postTypePath = post.type === 'announcement' ? 'announcements' : post.type === 'event' ? 'events' : 'jobs'

// AFTER:
const postTypePath = post.type === 'announcement' ? 'announcements' : 'events'
```

- [ ] **Step 7: Remove job from post-edit-actions.tsx**

In `components/community/post-edit-actions.tsx`:

Remove `JobFilledToggle` import. Remove the job toggle button (the `{postType === 'job' && isAuthor && <JobFilledToggle ... />}` block).

Update the type mappings to remove job:
```typescript
// In postTypePath:
const postTypePath = {
  announcement: 'announcements',
  event: 'events',
}[postType as 'announcement' | 'event'] ?? 'announcements'

// In postTypeEditPath:
const postTypeEditPath = {
  announcement: 'anuncios',
  event: 'eventos',
}[postType as 'announcement' | 'event'] ?? 'anuncios'
```

Update the Props type:
```typescript
type Props = {
  postId: string
  postType: 'announcement' | 'event'  // Remove 'job'
  communitySlug: string
  isAuthor: boolean
  isAdmin: boolean
}
// Remove isFilled prop
```

- [ ] **Step 8: Remove job display from post-card.tsx**

In `components/community/post-card.tsx`:

Remove `JobMetadata` from imports. Remove `Briefcase` import if it was only used for jobs. Remove the job-specific metadata display block (search for `post.type === 'job'` in the JSX and remove that block). Remove the job badge/filled status display.

Update the type labels and colors to remove job:
```typescript
const typeLabels = { announcement: 'Anuncio', event: 'Evento', promotion: 'Promoción' }
const typeColors = { announcement: 'default', event: 'outline', promotion: 'secondary' } as const
```

Update `linkPath`:
```typescript
const linkPath = post.type === 'announcement' ? 'announcements' : post.type === 'event' ? 'events' : 'promotions'
```

- [ ] **Step 9: Remove job references from dashboard**

In `app/dashboard/page.tsx`:

Remove `JobFilledToggle` import. Remove `JobMetadata` import from types. Remove `Briefcase` from lucide-react imports (unless used elsewhere).

In the `BusinessTabContent` component, find the `typeIcons` object and remove the job entry:
```typescript
// BEFORE:
const typeIcons = {
  announcement: { icon: MessageSquare, label: 'Anuncio', color: 'bg-primary', urlPath: 'anuncios' },
  event: { icon: Calendar, label: 'Evento', color: 'bg-accent', urlPath: 'eventos' },
  job: { icon: Briefcase, label: 'Empleo', color: 'bg-secondary', urlPath: 'empleos' },
}

// AFTER:
const typeIcons = {
  announcement: { icon: MessageSquare, label: 'Anuncio', color: 'bg-primary', urlPath: 'anuncios' },
  event: { icon: Calendar, label: 'Evento', color: 'bg-accent', urlPath: 'eventos' },
}
```

Remove the `JobFilledToggle` usage in the community posts list (the `{post.type === 'job' && ...}` blocks). Remove the job badge display. Change the text "Comparte anuncios, eventos o empleos" to "Comparte anuncios y eventos".

- [ ] **Step 10: Remove job filter from admin community page**

In `app/admin/community/page.tsx`, find the type filter options. Remove the `job` option from the filter UI and from any filter logic/queries.

Search for `'job'` in this file and remove all references. If there's a type filter that includes `{ value: 'job', label: 'Empleos' }` or similar, remove that entry.

- [ ] **Step 11: Verify**

1. Visit `/{community}/community` — no JobsSection appears.
2. Create a new community post — only Announcement and Event options are available (no Job).
3. Visit `/dashboard` — community posts section should not show job-specific elements.
4. Admin moderation panel — no job type filter.
5. No TypeScript errors: `npm run build` (or `npx tsc --noEmit`).

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat: remove job postings from community section — centralized in marketplace"
```

---

## Task 10: Verify and enhance Marketplace for Trabajo (Jobs)

**Files:**
- Verify only — `app/[community]/marketplace/page.tsx` (no changes needed, "Trabajo" category already exists)

**Context:** The `marketplace_categories` table already has a "Trabajo" category (slug: `trabajo`, icon: `Briefcase`). Users can already create a classified with this category. This task verifies the flow and makes one UI improvement: show "Salario" instead of "Precio" in job listings.

- [ ] **Step 1: Verify Trabajo category shows in marketplace**

Visit `/{community}/marketplace`. Click the "Trabajo" category filter. It should filter to show job listings (if any exist) or an empty state.

- [ ] **Step 2: Verify job classified creation works**

Log in. Click "Publicar Clasificado". Select "Trabajo" as category. Fill in title (job title), description, price (salary range e.g. "1,500,000 COP"), WhatsApp (contact). Submit. The classified should appear in the marketplace under Trabajo.

- [ ] **Step 3 (optional enhancement): Show "Salario" label for Trabajo listings**

In `components/marketplace/marketplace-hub.tsx` (or wherever the classified card shows price), find where "Precio" / price is rendered. Add a conditional:

```typescript
// Find where price is displayed, something like:
<span>{classified.price}</span>

// Update to show context-aware label:
const isJob = classified.marketplace_categories?.slug === 'trabajo'
// Then in JSX:
{classified.price && (
  <span className="text-xs font-black uppercase tracking-widest text-black/60">
    {isJob ? 'Salario' : 'Precio'}: {classified.price}
  </span>
)}
```

Note: Only implement this if `marketplace-hub.tsx` already renders price — check first. Skip if it doesn't render price in the listing card.

- [ ] **Step 4: Verify full job flow**

1. Create a job classified (category: Trabajo, title: "Se busca Vendedor", price: "1,200,000 COP")
2. Verify it appears in marketplace under Trabajo filter
3. Click the classified — detail page should show correctly
4. WhatsApp button should work
5. To mark as "filled": the classified owner can archive it from their dashboard (status: archived) — this is sufficient for MVP

- [ ] **Step 5: Commit (if any changes were made)**

```bash
git add components/marketplace/marketplace-hub.tsx  # or whichever file was changed
git commit -m "fix: show 'Salario' label for Trabajo category classifieds in marketplace"
```

If no code changes were needed, skip the commit.

---

## Self-Review

### Spec coverage check

| Issue | Task | Covered? |
|-------|------|----------|
| 1. Marketplace nav/quicknav deactivated | Task 1 | ✅ |
| 2. Business detail map + directory map | Task 6 (detail) + Task 7 (directory) | ✅ |
| 3. False offline message | Task 4 | ✅ |
| 4. Push notification only on community page | Task 1 | ✅ |
| 5. Delete 404 | Task 2 | ✅ |
| 5.1. Update PGRST116 | Task 3 | ✅ |
| 6. Dashboard/Profile lose layout | Task 8 | ✅ |
| 7. Business update stale data | Task 5 | ✅ |
| 7.1. Edit map shows default Pereira | Task 6 | ✅ |
| 8. Moderator sees nothing | Task 1 (UserMenu) | ✅ |
| 9. Jobs centralization to Marketplace | Task 9 + Task 10 | ✅ |

### Execution order matters

Tasks 6 (DB migration) must run before Task 7 (directory map uses lat/lng columns). All other tasks are independent.

Recommended order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10
