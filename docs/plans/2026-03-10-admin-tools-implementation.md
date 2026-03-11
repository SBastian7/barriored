# Admin Tools Hub Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a comprehensive admin tools hub with image storage analytics, SEO management, and push notification configuration across three phased releases.

**Architecture:** Hybrid approach with centralized `/admin/tools` page for bulk operations (images, notifications) and contextual SEO settings embedded in community edit page. Uses existing Supabase storage, new analytics tables, and extends push notification system.

**Tech Stack:** Next.js 16 App Router, React 19, Supabase (PostgreSQL + Storage), Radix UI, Recharts, Tailwind CSS, Web Push API

---

## Prerequisites

Before starting, ensure:
- [ ] Supabase project is running and accessible
- [ ] Admin panel exists at `/admin` with working layout
- [ ] Push notification system is functional (service worker, subscriptions)
- [ ] You have super admin access for testing

---

## Phase 1: Image Storage Analytics (2-3 weeks)

### Task 1: Database Migration - Create `image_storage_analytics` Table

**Files:**
- Create: `supabase/migrations/YYYYMMDDHHMMSS_create_image_storage_analytics.sql`

**Step 1: Write migration SQL**

```sql
-- Create image_storage_analytics table
CREATE TABLE image_storage_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
  bucket_name TEXT NOT NULL,
  total_size_bytes BIGINT NOT NULL,
  file_count INTEGER NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_storage_community_date ON image_storage_analytics(community_id, recorded_at DESC);
CREATE INDEX idx_storage_bucket ON image_storage_analytics(bucket_name);

-- Enable RLS
ALTER TABLE image_storage_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admins can view their community's storage
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

-- Comment
COMMENT ON TABLE image_storage_analytics IS 'Stores daily snapshots of storage usage per community and bucket';
```

**Step 2: Apply migration**

Run: `npx supabase db push` or use Supabase dashboard to run migration

Expected: Migration successful, table created

**Step 3: Verify table exists**

Run SQL in Supabase dashboard:
```sql
SELECT * FROM image_storage_analytics LIMIT 1;
```

Expected: Returns empty result (table exists, no data yet)

**Step 4: Commit migration**

```bash
git add supabase/migrations/
git commit -m "feat(db): add image_storage_analytics table with RLS

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 2: Storage Sync API Route - `/api/admin/storage/sync`

**Files:**
- Create: `app/api/admin/storage/sync/route.ts`
- Reference: `lib/supabase/server.ts` (Supabase server client)

**Step 1: Write minimal API route structure**

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // TODO: Implement storage sync logic

  return NextResponse.json({
    success: true,
    synced_at: new Date().toISOString()
  })
}
```

**Step 2: Test API route exists**

Run dev server: `npm run dev`
Test: `curl -X POST http://localhost:3000/api/admin/storage/sync` (expect 401)

Expected: 401 Unauthorized (no auth token)

**Step 3: Implement storage bucket query logic**

```typescript
export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check admin permissions
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_super_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_super_admin && profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const buckets = ['business-images', 'community-posts', 'profiles', 'community-logos']
    const storageData = []

    // Query Supabase Storage API for each bucket
    for (const bucketName of buckets) {
      const { data: files, error } = await supabase.storage.from(bucketName).list()

      if (error) {
        console.error(`Error fetching bucket ${bucketName}:`, error)
        continue
      }

      // Calculate total size and count
      let totalSize = 0
      let fileCount = 0

      if (files) {
        for (const file of files) {
          // Note: Supabase Storage list() doesn't return size, we need to fetch metadata
          // For now, store count only and note this limitation
          fileCount += 1
        }
      }

      storageData.push({
        bucket_name: bucketName,
        total_size_bytes: totalSize, // Will be 0 for now
        file_count: fileCount,
        community_id: null // We'll enhance this later to map files to communities
      })
    }

    // Insert snapshot into analytics table
    const { error: insertError } = await supabase
      .from('image_storage_analytics')
      .insert(storageData)

    if (insertError) {
      throw insertError
    }

    return NextResponse.json({
      success: true,
      synced_at: new Date().toISOString(),
      buckets: storageData.length
    })
  } catch (error) {
    console.error('Storage sync error:', error)
    return NextResponse.json({
      error: 'Failed to sync storage'
    }, { status: 500 })
  }
}
```

**Step 4: Test sync endpoint manually**

With logged-in admin session:
Run: `curl -X POST http://localhost:3000/api/admin/storage/sync -H "Cookie: ..."`

Expected: 200 OK with `{ success: true, synced_at: "...", buckets: 4 }`

**Step 5: Verify data inserted**

Check Supabase dashboard:
```sql
SELECT * FROM image_storage_analytics ORDER BY recorded_at DESC LIMIT 10;
```

Expected: See rows for each bucket with file counts

**Step 6: Commit**

```bash
git add app/api/admin/storage/sync/route.ts
git commit -m "feat(api): add storage sync endpoint for analytics

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 3: Storage Summary API Route - `/api/admin/storage/summary`

**Files:**
- Create: `app/api/admin/storage/summary/route.ts`

**Step 1: Write API route to aggregate storage data**

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check admin permissions
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_super_admin, community_id')
    .eq('id', user.id)
    .single()

  if (!profile?.is_super_admin && profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    // Fetch most recent storage snapshot
    let query = supabase
      .from('image_storage_analytics')
      .select('*')
      .order('recorded_at', { ascending: false })
      .limit(100)

    // Community admins see only their data
    if (!profile.is_super_admin && profile.community_id) {
      query = query.eq('community_id', profile.community_id)
    }

    const { data: snapshots, error } = await query

    if (error) throw error

    // Aggregate by bucket
    const bucketMap = new Map<string, { bytes: number, count: number }>()
    let totalBytes = 0

    snapshots?.forEach(snap => {
      const existing = bucketMap.get(snap.bucket_name) || { bytes: 0, count: 0 }
      bucketMap.set(snap.bucket_name, {
        bytes: existing.bytes + snap.total_size_bytes,
        count: existing.count + snap.file_count
      })
      totalBytes += snap.total_size_bytes
    })

    const buckets = Array.from(bucketMap.entries()).map(([name, data]) => ({
      name,
      bytes: data.bytes,
      gb: (data.bytes / (1024 ** 3)).toFixed(2),
      file_count: data.count
    }))

    // Get last sync timestamp
    const lastSync = snapshots?.[0]?.recorded_at || null

    return NextResponse.json({
      total: {
        bytes: totalBytes,
        gb: (totalBytes / (1024 ** 3)).toFixed(2)
      },
      buckets,
      last_synced: lastSync
    })
  } catch (error) {
    console.error('Storage summary error:', error)
    return NextResponse.json({
      error: 'Failed to fetch storage summary'
    }, { status: 500 })
  }
}
```

**Step 2: Test summary endpoint**

Run: `curl http://localhost:3000/api/admin/storage/summary -H "Cookie: ..."`

Expected: 200 OK with aggregated storage data

**Step 3: Commit**

```bash
git add app/api/admin/storage/summary/route.ts
git commit -m "feat(api): add storage summary endpoint

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 4: Admin Tools Main Page - `/admin/tools`

**Files:**
- Create: `app/admin/tools/page.tsx`

**Step 1: Create basic tools page with tabs**

```tsx
'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { HardDrive, Bell } from 'lucide-react'

export default function AdminToolsPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-4xl font-heading font-black uppercase italic tracking-tighter">
          Herramientas de <span className="text-primary">Admin</span>
        </h1>
        <p className="font-bold text-black/60 text-sm">
          Gestión avanzada de almacenamiento, SEO y notificaciones.
        </p>
      </header>

      <Tabs defaultValue="images" className="space-y-6">
        <TabsList className="border-2 border-black bg-white">
          <TabsTrigger
            value="images"
            className="data-[state=active]:bg-primary data-[state=active]:text-white uppercase tracking-widest text-xs font-black"
          >
            <HardDrive className="h-4 w-4 mr-2" />
            Imágenes
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="data-[state=active]:bg-primary data-[state=active]:text-white uppercase tracking-widest text-xs font-black"
          >
            <Bell className="h-4 w-4 mr-2" />
            Notificaciones
          </TabsTrigger>
        </TabsList>

        <TabsContent value="images">
          <div className="p-8 border-4 border-black rounded-none">
            <p className="text-center text-black/40 font-bold uppercase">
              Próximamente: Análisis de almacenamiento
            </p>
          </div>
        </TabsContent>

        <TabsContent value="notifications">
          <div className="p-8 border-4 border-black rounded-none">
            <p className="text-center text-black/40 font-bold uppercase">
              Próximamente: Estadísticas de notificaciones
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

**Step 2: Test page renders**

Navigate to: `http://localhost:3000/admin/tools`

Expected: Page loads with two tabs, placeholders visible

**Step 3: Add to admin sidebar navigation**

Edit: `components/admin/collapsible-sidebar.tsx`

Add after line 37:
```tsx
{ href: '/admin/logs', label: 'Logs', icon: FileText },
{ href: '/admin/tools', label: 'Herramientas', icon: Settings }, // ADD THIS
```

Import Settings icon at top:
```tsx
import { Settings } from 'lucide-react'
```

**Step 4: Test navigation**

Navigate to `/admin` and click "Herramientas" in sidebar

Expected: Navigates to `/admin/tools` page

**Step 5: Commit**

```bash
git add app/admin/tools/page.tsx components/admin/collapsible-sidebar.tsx
git commit -m "feat(admin): add tools hub page with tab navigation

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 5: Storage Overview Cards Component

**Files:**
- Create: `app/admin/tools/components/storage-overview-cards.tsx`

**Step 1: Create storage cards component**

```tsx
'use client'

import { Card, CardContent } from '@/components/ui/card'
import { HardDrive, Building2, MessageSquare, User } from 'lucide-react'

interface StorageOverviewCardsProps {
  total: { bytes: number; gb: string }
  buckets: Array<{ name: string; bytes: number; gb: string; file_count: number }>
}

export function StorageOverviewCards({ total, buckets }: StorageOverviewCardsProps) {
  const getBucketData = (bucketName: string) => {
    return buckets.find(b => b.name === bucketName) || { gb: '0', file_count: 0 }
  }

  const cards = [
    {
      title: 'Total',
      value: total.gb,
      unit: 'GB',
      icon: HardDrive,
      color: 'bg-primary'
    },
    {
      title: 'Negocios',
      value: getBucketData('business-images').gb,
      unit: 'GB',
      icon: Building2,
      color: 'bg-accent'
    },
    {
      title: 'Comunidad',
      value: getBucketData('community-posts').gb,
      unit: 'GB',
      icon: MessageSquare,
      color: 'bg-secondary'
    },
    {
      title: 'Perfiles',
      value: getBucketData('profiles').gb,
      unit: 'GB',
      icon: User,
      color: 'bg-[oklch(0.5_0.15_150)]'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Card
            key={card.title}
            className="border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden"
          >
            <CardContent className="p-0">
              <div className="flex">
                <div className={`w-16 flex items-center justify-center ${card.color}`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className="p-4 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-1">
                    {card.title}
                  </p>
                  <p className="text-3xl font-heading font-black italic">
                    {card.value}
                    <span className="text-lg ml-1 text-black/60">{card.unit}</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
```

**Step 2: Test component in isolation**

Create test file (optional): Test by importing in tools page

**Step 3: Commit**

```bash
git add app/admin/tools/components/storage-overview-cards.tsx
git commit -m "feat(admin): add storage overview cards component

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 6: Images Tab Component with Data Fetching

**Files:**
- Create: `app/admin/tools/components/images-tab.tsx`
- Modify: `app/admin/tools/page.tsx` (integrate component)

**Step 1: Create images tab component**

```tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { RefreshCw, Loader2 } from 'lucide-react'
import { StorageOverviewCards } from './storage-overview-cards'

interface StorageSummary {
  total: { bytes: number; gb: string }
  buckets: Array<{ name: string; bytes: number; gb: string; file_count: number }>
  last_synced: string | null
}

export function ImagesTab() {
  const [data, setData] = useState<StorageSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  async function fetchSummary() {
    try {
      const res = await fetch('/api/admin/storage/summary')
      if (!res.ok) throw new Error('Failed to fetch')
      const summary = await res.json()
      setData(summary)
    } catch (error) {
      console.error('Fetch error:', error)
      toast.error('Error al cargar datos de almacenamiento')
    } finally {
      setLoading(false)
    }
  }

  async function handleSync() {
    setSyncing(true)
    try {
      const res = await fetch('/api/admin/storage/sync', { method: 'POST' })
      if (!res.ok) throw new Error('Sync failed')
      toast.success('✅ Almacenamiento sincronizado')
      await fetchSummary()
    } catch (error) {
      console.error('Sync error:', error)
      toast.error('Error al sincronizar almacenamiento')
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    fetchSummary()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-20">
        <p className="text-black/40 font-bold uppercase mb-4">No hay datos disponibles</p>
        <Button onClick={handleSync} disabled={syncing} className="brutalist-button">
          <RefreshCw className="h-4 w-4 mr-2" />
          Sincronizar Ahora
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-black/60">
            Última sincronización: {data.last_synced ? new Date(data.last_synced).toLocaleString('es-CO') : 'Nunca'}
          </p>
        </div>
        <Button
          onClick={handleSync}
          disabled={syncing}
          className="brutalist-button"
        >
          {syncing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Sincronizar Ahora
        </Button>
      </div>

      <StorageOverviewCards total={data.total} buckets={data.buckets} />
    </div>
  )
}
```

**Step 2: Integrate into tools page**

Edit: `app/admin/tools/page.tsx`

Replace `<TabsContent value="images">` section:
```tsx
<TabsContent value="images">
  <ImagesTab />
</TabsContent>
```

Add import at top:
```tsx
import { ImagesTab } from './components/images-tab'
```

**Step 3: Test full flow**

1. Navigate to `/admin/tools`
2. Click "Imágenes" tab
3. Should see storage cards with data
4. Click "Sincronizar Ahora"
5. Should see success toast and updated data

Expected: All works without errors

**Step 4: Commit**

```bash
git add app/admin/tools/components/images-tab.tsx app/admin/tools/page.tsx
git commit -m "feat(admin): add images tab with storage data fetching

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 7: Storage Trends Chart Component (Optional Enhancement)

**Files:**
- Create: `app/admin/tools/components/storage-trends-chart.tsx`
- Modify: `app/admin/tools/components/images-tab.tsx` (add chart)

**Step 1: Install Recharts (if not already installed)**

```bash
npm install recharts
```

**Step 2: Create trends chart component**

```tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface TrendsData {
  date: string
  size_gb: number
}

interface StorageTrendsChartProps {
  data: TrendsData[]
}

export function StorageTrendsChart({ data }: StorageTrendsChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card className="border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <CardHeader>
          <CardTitle className="font-heading font-black uppercase italic">
            Tendencia de Almacenamiento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-black/40 py-8">
            No hay datos de tendencias disponibles
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      <CardHeader>
        <CardTitle className="font-heading font-black uppercase italic">
          Tendencia de Almacenamiento
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              label={{ value: 'GB', angle: -90, position: 'insideLeft' }}
              style={{ fontSize: '12px' }}
            />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="size_gb"
              stroke="oklch(0.57 0.23 18)"
              strokeWidth={3}
              name="Almacenamiento (GB)"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
```

**Step 3: Add chart to images tab**

Edit: `app/admin/tools/components/images-tab.tsx`

Add below `<StorageOverviewCards />`:
```tsx
{/* Placeholder for future trends - needs historical data */}
{/* <StorageTrendsChart data={[]} /> */}
```

**Step 4: Commit**

```bash
git add app/admin/tools/components/storage-trends-chart.tsx app/admin/tools/components/images-tab.tsx package.json
git commit -m "feat(admin): add storage trends chart component

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

**Phase 1 Complete! ✅**

At this point, image storage analytics is functional:
- ✅ Database table for tracking storage
- ✅ API routes for sync and summary
- ✅ Admin tools page with navigation
- ✅ Storage overview cards showing current usage
- ✅ Manual sync button

---

## Phase 2: SEO Management + Push Notification Statistics (2-3 weeks)

### Task 8: Database Migration - Create `community_seo_settings` Table

**Files:**
- Create: `supabase/migrations/YYYYMMDDHHMMSS_create_community_seo_settings.sql`

**Step 1: Write migration SQL**

```sql
-- Create community_seo_settings table
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

-- Create index
CREATE INDEX idx_seo_community ON community_seo_settings(community_id);

-- Enable RLS
ALTER TABLE community_seo_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admins can manage their community's SEO
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

-- Comment
COMMENT ON TABLE community_seo_settings IS 'SEO metadata settings per community for search engines and social media';
```

**Step 2: Apply migration**

Run: `npx supabase db push`

Expected: Migration successful

**Step 3: Verify table**

```sql
SELECT * FROM community_seo_settings LIMIT 1;
```

Expected: Empty table exists

**Step 4: Commit**

```bash
git add supabase/migrations/
git commit -m "feat(db): add community_seo_settings table

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 9: SEO Settings API Routes

**Files:**
- Create: `app/api/admin/communities/[id]/seo/route.ts`

**Step 1: Create GET handler for SEO settings**

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const communityId = params.id

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check permissions
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_super_admin, community_id')
    .eq('id', user.id)
    .single()

  const canAccess = profile?.is_super_admin ||
    (profile?.role === 'admin' && profile?.community_id === communityId)

  if (!canAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    // Fetch SEO settings
    const { data: settings, error } = await supabase
      .from('community_seo_settings')
      .select('*')
      .eq('community_id', communityId)
      .single()

    if (error && error.code !== 'PGRST116') { // Ignore not found error
      throw error
    }

    // If no settings exist, return defaults
    if (!settings) {
      const { data: community } = await supabase
        .from('communities')
        .select('name, slug')
        .eq('id', communityId)
        .single()

      return NextResponse.json({
        meta_title: `${community?.name || 'Comunidad'} - BarrioRed`,
        meta_description: `Descubre negocios locales, eventos y servicios en ${community?.name || 'tu barrio'}. Plataforma comunitaria 100% local.`,
        meta_keywords: ['barrio', community?.name.toLowerCase() || 'comunidad', 'negocios locales'],
        og_image_url: null
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('SEO fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch SEO settings' }, { status: 500 })
  }
}
```

**Step 2: Create PUT handler to update settings**

Add to same file:
```typescript
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const communityId = params.id

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check permissions
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_super_admin, community_id')
    .eq('id', user.id)
    .single()

  const canAccess = profile?.is_super_admin ||
    (profile?.role === 'admin' && profile?.community_id === communityId)

  if (!canAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { meta_title, meta_description, meta_keywords, og_image_url } = body

    // Validate
    if (!meta_title || !meta_description) {
      return NextResponse.json({ error: 'Title and description are required' }, { status: 400 })
    }

    if (meta_title.length > 70) {
      return NextResponse.json({ error: 'Title must be 70 characters or less' }, { status: 400 })
    }

    if (meta_description.length > 160) {
      return NextResponse.json({ error: 'Description must be 160 characters or less' }, { status: 400 })
    }

    // Upsert settings
    const { data, error } = await supabase
      .from('community_seo_settings')
      .upsert({
        community_id: communityId,
        meta_title,
        meta_description,
        meta_keywords: meta_keywords || [],
        og_image_url,
        updated_at: new Date().toISOString()
      }, { onConflict: 'community_id' })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('SEO update error:', error)
    return NextResponse.json({ error: 'Failed to update SEO settings' }, { status: 500 })
  }
}
```

**Step 3: Test GET endpoint**

Run: `curl http://localhost:3000/api/admin/communities/{community-id}/seo -H "Cookie: ..."`

Expected: Returns default SEO settings or existing settings

**Step 4: Test PUT endpoint**

Run:
```bash
curl -X PUT http://localhost:3000/api/admin/communities/{community-id}/seo \
  -H "Content-Type: application/json" \
  -H "Cookie: ..." \
  -d '{"meta_title":"Test","meta_description":"Test description","meta_keywords":["test"]}'
```

Expected: 200 OK with saved settings

**Step 5: Commit**

```bash
git add app/api/admin/communities/[id]/seo/route.ts
git commit -m "feat(api): add SEO settings endpoints

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 10: SEO Settings Tab Component

**Files:**
- Create: `components/admin/communities/seo-settings-tab.tsx`

**Step 1: Create SEO settings form component**

```tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, Save } from 'lucide-react'

interface SEOSettingsTabProps {
  communityId: string
  communityName: string
}

export function SEOSettingsTab({ communityId, communityName }: SEOSettingsTabProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    meta_title: '',
    meta_description: '',
    meta_keywords: [] as string[],
    og_image_url: ''
  })

  useEffect(() => {
    fetchSettings()
  }, [communityId])

  async function fetchSettings() {
    try {
      const res = await fetch(`/api/admin/communities/${communityId}/seo`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setFormData({
        meta_title: data.meta_title || '',
        meta_description: data.meta_description || '',
        meta_keywords: data.meta_keywords || [],
        og_image_url: data.og_image_url || ''
      })
    } catch (error) {
      console.error('Fetch error:', error)
      toast.error('Error al cargar configuración SEO')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      const res = await fetch(`/api/admin/communities/${communityId}/seo`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to save')
      }

      toast.success('✅ Configuración SEO guardada')
    } catch (error: any) {
      console.error('Save error:', error)
      toast.error(error.message || 'Error al guardar configuración')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <CardHeader>
          <CardTitle className="font-heading font-black uppercase italic">
            Meta Tags
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-black/40">
              Título (Meta Title)
            </Label>
            <Input
              value={formData.meta_title}
              onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })}
              placeholder={`${communityName} - BarrioRed`}
              maxLength={70}
              className="brutalist-input"
            />
            <p className="text-xs text-black/60">
              {formData.meta_title.length} / 70 caracteres (ideal: 50-60)
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-black/40">
              Descripción (Meta Description)
            </Label>
            <Textarea
              value={formData.meta_description}
              onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
              placeholder={`Descubre negocios locales, eventos y servicios en ${communityName}`}
              maxLength={160}
              rows={3}
              className="brutalist-input"
            />
            <p className="text-xs text-black/60">
              {formData.meta_description.length} / 160 caracteres (ideal: 150-160)
            </p>
          </div>

          {/* Keywords */}
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-black/40">
              Palabras Clave (Keywords)
            </Label>
            <Input
              value={formData.meta_keywords.join(', ')}
              onChange={(e) => setFormData({
                ...formData,
                meta_keywords: e.target.value.split(',').map(k => k.trim()).filter(Boolean)
              })}
              placeholder="barrio, negocios locales, comunidad"
              className="brutalist-input"
            />
            <p className="text-xs text-black/60">
              Separadas por comas. Máximo 10 recomendadas.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Preview Card */}
      <Card className="border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <CardHeader>
          <CardTitle className="font-heading font-black uppercase italic">
            Vista Previa Google
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <p className="text-xs text-blue-600">
              barriored.co › {communityName.toLowerCase().replace(/\s+/g, '')}
            </p>
            <p className="text-xl text-blue-800 font-semibold">
              {formData.meta_title || `${communityName} - BarrioRed`}
            </p>
            <p className="text-sm text-gray-600 line-clamp-2">
              {formData.meta_description || 'Descripción no configurada'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button
        type="submit"
        disabled={saving}
        className="brutalist-button bg-primary text-white w-full"
      >
        {saving ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Save className="h-4 w-4 mr-2" />
        )}
        Guardar Cambios
      </Button>
    </form>
  )
}
```

**Step 2: Test component in isolation**

Create test page or add to community edit page (next step)

**Step 3: Commit**

```bash
git add components/admin/communities/seo-settings-tab.tsx
git commit -m "feat(admin): add SEO settings tab component

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 11: Integrate SEO Tab into Community Edit Page

**Files:**
- Modify: `app/admin/communities/[id]/edit/page.tsx`

**Step 1: Find the existing community edit page**

Read the file to understand current tab structure.

**Step 2: Add SEO tab to tabs list**

Find the `<TabsList>` section and add:
```tsx
<TabsTrigger value="seo">SEO</TabsTrigger>
```

**Step 3: Add SEO tab content**

Find the `<TabsContent>` sections and add:
```tsx
<TabsContent value="seo">
  <SEOSettingsTab
    communityId={params.id}
    communityName={community.name}
  />
</TabsContent>
```

**Step 4: Add import**

At top of file:
```tsx
import { SEOSettingsTab } from '@/components/admin/communities/seo-settings-tab'
```

**Step 5: Test integration**

Navigate to: `/admin/communities/{community-id}/edit`
Click "SEO" tab
Fill form and save

Expected: SEO settings save successfully

**Step 6: Commit**

```bash
git add app/admin/communities/[id]/edit/page.tsx
git commit -m "feat(admin): integrate SEO tab into community edit page

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 12: Database Migration - Create `push_notification_logs` Table

**Files:**
- Create: `supabase/migrations/YYYYMMDDHHMMSS_create_push_notification_logs.sql`

**Step 1: Write migration SQL**

```sql
-- Create push_notification_logs table
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

-- Create indexes
CREATE INDEX idx_notif_logs_community_date ON push_notification_logs(community_id, sent_at DESC);
CREATE INDEX idx_notif_logs_alert ON push_notification_logs(alert_id);

-- Enable RLS
ALTER TABLE push_notification_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admins can view logs
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

-- Comment
COMMENT ON TABLE push_notification_logs IS 'Logs all push notification sends for statistics and debugging';
```

**Step 2: Apply migration**

Run: `npx supabase db push`

Expected: Migration successful

**Step 3: Commit**

```bash
git add supabase/migrations/
git commit -m "feat(db): add push_notification_logs table

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 13: Update Notification Send API to Log to Database

**Files:**
- Modify: `app/api/notifications/send/route.ts`

**Step 1: Add logging after successful send**

Find the notification send logic and add logging:

```typescript
// After sending notifications
const { error: logError } = await supabase
  .from('push_notification_logs')
  .insert({
    community_id: body.community_id,
    alert_id: body.alert_id || null,
    title: body.title,
    body: body.body,
    sent_count: successCount,
    failed_count: failedCount,
    test_mode: false
  })

if (logError) {
  console.error('Failed to log notification:', logError)
  // Don't fail the request, just log error
}
```

**Step 2: Test notification send**

Send a notification via admin alerts page.

Expected: Notification sent AND logged to `push_notification_logs` table

**Step 3: Verify log entry**

Check database:
```sql
SELECT * FROM push_notification_logs ORDER BY sent_at DESC LIMIT 5;
```

Expected: See recent notification log entry

**Step 4: Commit**

```bash
git add app/api/notifications/send/route.ts
git commit -m "feat(api): log push notifications to database

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 14: Push Notification Statistics API Route

**Files:**
- Create: `app/api/admin/notifications/stats/route.ts`

**Step 1: Create stats aggregation endpoint**

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const days = parseInt(searchParams.get('days') || '30')

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check permissions
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_super_admin, community_id')
    .eq('id', user.id)
    .single()

  if (!profile?.is_super_admin && profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    // Calculate date range
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Build query
    let logsQuery = supabase
      .from('push_notification_logs')
      .select('*')
      .gte('sent_at', startDate.toISOString())

    // Filter by community for community admins
    if (!profile.is_super_admin && profile.community_id) {
      logsQuery = logsQuery.eq('community_id', profile.community_id)
    }

    const { data: logs, error } = await logsQuery

    if (error) throw error

    // Calculate overview stats
    const totalSent = logs?.reduce((sum, log) => sum + log.sent_count, 0) || 0
    const totalFailed = logs?.reduce((sum, log) => sum + log.failed_count, 0) || 0
    const deliveryRate = totalSent > 0 ? (totalSent - totalFailed) / totalSent : 0
    const avgPerDay = totalSent / days

    // Get active subscribers count
    const { count: subscriberCount } = await supabase
      .from('push_subscriptions')
      .select('*', { count: 'exact', head: true })
      .not('endpoint', 'is', null)

    // Group by type (from alert_id → community_alerts.type)
    // TODO: Join with community_alerts to get type breakdown

    const overview = {
      total_sent: totalSent,
      delivery_rate: Math.round(deliveryRate * 100) / 100,
      active_subscribers: subscriberCount || 0,
      avg_per_day: Math.round(avgPerDay * 10) / 10,
      trend_vs_previous: 0 // TODO: Calculate vs previous period
    }

    return NextResponse.json({
      overview,
      by_type: [], // TODO: Implement type breakdown
      by_community: [] // TODO: Implement community breakdown
    })
  } catch (error) {
    console.error('Stats error:', error)
    return NextResponse.json({ error: 'Failed to fetch statistics' }, { status: 500 })
  }
}
```

**Step 2: Test stats endpoint**

Run: `curl http://localhost:3000/api/admin/notifications/stats -H "Cookie: ..."`

Expected: Returns statistics object with overview

**Step 3: Commit**

```bash
git add app/api/admin/notifications/stats/route.ts
git commit -m "feat(api): add push notification statistics endpoint

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 15: Push Notification Logs API Route

**Files:**
- Create: `app/api/admin/notifications/logs/route.ts`

**Step 1: Create logs endpoint with pagination**

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = (page - 1) * limit

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_super_admin, community_id')
    .eq('id', user.id)
    .single()

  if (!profile?.is_super_admin && profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    // Build query with join to communities
    let logsQuery = supabase
      .from('push_notification_logs')
      .select('*, communities(id, name, slug)', { count: 'exact' })
      .order('sent_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Filter by community for community admins
    if (!profile.is_super_admin && profile.community_id) {
      logsQuery = logsQuery.eq('community_id', profile.community_id)
    }

    const { data: logs, error, count } = await logsQuery

    if (error) throw error

    return NextResponse.json({
      logs: logs || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    })
  } catch (error) {
    console.error('Logs fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 })
  }
}
```

**Step 2: Test logs endpoint**

Run: `curl "http://localhost:3000/api/admin/notifications/logs?page=1&limit=10" -H "Cookie: ..."`

Expected: Returns paginated logs with communities

**Step 3: Commit**

```bash
git add app/api/admin/notifications/logs/route.ts
git commit -m "feat(api): add push notification logs endpoint

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 16: Push Notification Statistics Component

**Files:**
- Create: `app/admin/tools/components/push-stats-dashboard.tsx`

**Step 1: Create statistics dashboard component**

```tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Bell, TrendingUp, Users, Calendar } from 'lucide-react'
import { toast } from 'sonner'

interface PushStats {
  overview: {
    total_sent: number
    delivery_rate: number
    active_subscribers: number
    avg_per_day: number
  }
}

export function PushStatsDashboard() {
  const [stats, setStats] = useState<PushStats | null>(null)
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const [statsRes, logsRes] = await Promise.all([
        fetch('/api/admin/notifications/stats?days=30'),
        fetch('/api/admin/notifications/logs?limit=10')
      ])

      if (!statsRes.ok || !logsRes.ok) throw new Error('Failed to fetch')

      const statsData = await statsRes.json()
      const logsData = await logsRes.json()

      setStats(statsData)
      setLogs(logsData.logs || [])
    } catch (error) {
      console.error('Fetch error:', error)
      toast.error('Error al cargar estadísticas')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-black/40 font-bold uppercase">
          No hay datos disponibles
        </p>
      </div>
    )
  }

  const statCards = [
    {
      title: 'Total Enviadas',
      value: stats.overview.total_sent,
      icon: Bell,
      color: 'bg-primary'
    },
    {
      title: 'Tasa de Entrega',
      value: `${(stats.overview.delivery_rate * 100).toFixed(1)}%`,
      icon: TrendingUp,
      color: 'bg-accent'
    },
    {
      title: 'Suscriptores',
      value: stats.overview.active_subscribers,
      icon: Users,
      color: 'bg-secondary'
    },
    {
      title: 'Promedio Diario',
      value: stats.overview.avg_per_day.toFixed(1),
      icon: Calendar,
      color: 'bg-[oklch(0.5_0.15_150)]'
    }
  ]

  return (
    <div className="space-y-8">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <Card
              key={card.title}
              className="border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden"
            >
              <CardContent className="p-0">
                <div className="flex">
                  <div className={`w-16 flex items-center justify-center ${card.color}`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="p-4 flex-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-1">
                      {card.title}
                    </p>
                    <p className="text-3xl font-heading font-black italic">
                      {card.value}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Recent Logs */}
      <Card className="border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <CardHeader>
          <CardTitle className="font-heading font-black uppercase italic">
            Notificaciones Recientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-center text-black/40 py-8">
              No hay notificaciones registradas
            </p>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 border-2 border-black rounded-none"
                >
                  <div className="flex-1">
                    <p className="font-bold">{log.title}</p>
                    <p className="text-xs text-black/60">
                      {log.communities?.name} • {new Date(log.sent_at).toLocaleDateString('es-CO')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-green-600">
                      ✓ {log.sent_count}
                    </p>
                    {log.failed_count > 0 && (
                      <p className="text-xs text-red-600">
                        ✗ {log.failed_count}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

**Step 2: Test component**

Add to notifications tab (next task)

**Step 3: Commit**

```bash
git add app/admin/tools/components/push-stats-dashboard.tsx
git commit -m "feat(admin): add push notification statistics dashboard

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 17: Integrate Push Stats into Notifications Tab

**Files:**
- Create: `app/admin/tools/components/notifications-tab.tsx`
- Modify: `app/admin/tools/page.tsx`

**Step 1: Create notifications tab component**

```tsx
'use client'

import { PushStatsDashboard } from './push-stats-dashboard'

export function NotificationsTab() {
  return (
    <div className="space-y-8">
      {/* Statistics Section */}
      <section>
        <h2 className="text-2xl font-heading font-black uppercase italic mb-4">
          Estadísticas
        </h2>
        <PushStatsDashboard />
      </section>

      {/* Configuration Section (Phase 3) */}
      <section className="mt-12">
        <h2 className="text-2xl font-heading font-black uppercase italic mb-4">
          Configuración
        </h2>
        <div className="p-8 border-4 border-black rounded-none bg-white">
          <p className="text-center text-black/40 font-bold uppercase">
            Próximamente: Configuración y pruebas
          </p>
        </div>
      </section>
    </div>
  )
}
```

**Step 2: Update tools page**

Edit: `app/admin/tools/page.tsx`

Replace `<TabsContent value="notifications">`:
```tsx
<TabsContent value="notifications">
  <NotificationsTab />
</TabsContent>
```

Add import:
```tsx
import { NotificationsTab } from './components/notifications-tab'
```

**Step 3: Test full notifications tab**

Navigate to: `/admin/tools?tab=notifications`

Expected: See statistics dashboard with cards and recent logs

**Step 4: Commit**

```bash
git add app/admin/tools/components/notifications-tab.tsx app/admin/tools/page.tsx
git commit -m "feat(admin): integrate push stats into notifications tab

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

**Phase 2 Complete! ✅**

At this point:
- ✅ SEO settings per community (with preview)
- ✅ Push notification statistics dashboard
- ✅ Recent notification logs

---

## Phase 3: Push Notification Configuration & Testing (1-2 weeks)

### Task 18: Database Migration - Create `push_notification_config` Table

**Files:**
- Create: `supabase/migrations/YYYYMMDDHHMMSS_create_push_notification_config.sql`

**Step 1: Write migration SQL**

```sql
-- Create push_notification_config table
CREATE TABLE push_notification_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id UUID UNIQUE NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT true,
  max_per_day INTEGER DEFAULT 10,
  test_mode BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index
CREATE INDEX idx_push_config_community ON push_notification_config(community_id);

-- Enable RLS
ALTER TABLE push_notification_config ENABLE ROW LEVEL SECURITY;

-- RLS Policy
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

-- Comment
COMMENT ON TABLE push_notification_config IS 'Per-community push notification configuration and rate limits';
```

**Step 2: Apply migration**

Run: `npx supabase db push`

Expected: Migration successful

**Step 3: Commit**

```bash
git add supabase/migrations/
git commit -m "feat(db): add push_notification_config table

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 19: Push Notification Config API Routes

**Files:**
- Create: `app/api/admin/notifications/config/route.ts`

**Step 1: Create GET handler**

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const communityId = searchParams.get('community_id')

  if (!communityId) {
    return NextResponse.json({ error: 'community_id required' }, { status: 400 })
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check permissions
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_super_admin, community_id')
    .eq('id', user.id)
    .single()

  const canAccess = profile?.is_super_admin ||
    (profile?.role === 'admin' && profile?.community_id === communityId)

  if (!canAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    // Fetch config
    const { data: config, error } = await supabase
      .from('push_notification_config')
      .select('*')
      .eq('community_id', communityId)
      .single()

    // If no config exists, return defaults
    if (error && error.code === 'PGRST116') {
      return NextResponse.json({
        community_id: communityId,
        is_enabled: true,
        max_per_day: 10,
        current_count_today: 0,
        test_mode: false
      })
    }

    if (error) throw error

    // Get current count today
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const { count } = await supabase
      .from('push_notification_logs')
      .select('*', { count: 'exact', head: true })
      .eq('community_id', communityId)
      .gte('sent_at', startOfDay.toISOString())

    return NextResponse.json({
      ...config,
      current_count_today: count || 0
    })
  } catch (error) {
    console.error('Config fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 })
  }
}
```

**Step 2: Create PUT handler**

Add to same file:
```typescript
export async function PUT(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { community_id, is_enabled, max_per_day } = body

    if (!community_id) {
      return NextResponse.json({ error: 'community_id required' }, { status: 400 })
    }

    // Validate max_per_day
    if (max_per_day && (max_per_day < 1 || max_per_day > 50)) {
      return NextResponse.json({ error: 'max_per_day must be between 1 and 50' }, { status: 400 })
    }

    // Check permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_super_admin, community_id')
      .eq('id', user.id)
      .single()

    const canAccess = profile?.is_super_admin ||
      (profile?.role === 'admin' && profile?.community_id === community_id)

    if (!canAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Upsert config
    const { data, error } = await supabase
      .from('push_notification_config')
      .upsert({
        community_id,
        is_enabled: is_enabled ?? true,
        max_per_day: max_per_day ?? 10,
        updated_at: new Date().toISOString()
      }, { onConflict: 'community_id' })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Config update error:', error)
    return NextResponse.json({ error: 'Failed to update config' }, { status: 500 })
  }
}
```

**Step 3: Test endpoints**

GET: `curl "http://localhost:3000/api/admin/notifications/config?community_id={id}" -H "Cookie: ..."`

PUT: `curl -X PUT http://localhost:3000/api/admin/notifications/config -H "Content-Type: application/json" -d '{"community_id":"...","max_per_day":15}'`

Expected: Both work correctly

**Step 4: Commit**

```bash
git add app/api/admin/notifications/config/route.ts
git commit -m "feat(api): add push notification config endpoints

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 20: Push Notification Test API Route

**Files:**
- Create: `app/api/admin/notifications/test/route.ts`

**Step 1: Create test send endpoint**

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import webpush from 'web-push'

// Configure VAPID keys
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY!
const vapidEmail = process.env.VAPID_EMAIL || 'mailto:admin@barriored.co'

webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey)

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { community_id, title, body: message, recipient_mode } = body

    // Validate
    if (!community_id || !title || !message) {
      return NextResponse.json({
        error: 'community_id, title, and body are required'
      }, { status: 400 })
    }

    if (title.length > 50 || message.length > 200) {
      return NextResponse.json({
        error: 'Title max 50 chars, body max 200 chars'
      }, { status: 400 })
    }

    // Check permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_super_admin, community_id')
      .eq('id', user.id)
      .single()

    const canAccess = profile?.is_super_admin ||
      (profile?.role === 'admin' && profile?.community_id === community_id)

    if (!canAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check rate limit
    const { data: config } = await supabase
      .from('push_notification_config')
      .select('is_enabled, max_per_day')
      .eq('community_id', community_id)
      .single()

    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const { count: todayCount } = await supabase
      .from('push_notification_logs')
      .select('*', { count: 'exact', head: true })
      .eq('community_id', community_id)
      .gte('sent_at', startOfDay.toISOString())

    const maxPerDay = config?.max_per_day || 10
    if ((todayCount || 0) >= maxPerDay) {
      return NextResponse.json({
        error: `Límite diario alcanzado (${todayCount}/${maxPerDay})`
      }, { status: 429 })
    }

    // Fetch subscriptions
    let subscriptionsQuery = supabase
      .from('push_subscriptions')
      .select('*')
      .eq('community_id', community_id)
      .not('endpoint', 'is', null)

    // Filter for "Solo yo" mode
    if (recipient_mode === 'self') {
      subscriptionsQuery = subscriptionsQuery.eq('user_id', user.id)
    }

    const { data: subscriptions } = await subscriptionsQuery

    if (!subscriptions || subscriptions.length === 0) {
      // Still log as successful send with 0 count
      await supabase.from('push_notification_logs').insert({
        community_id,
        title,
        body: message,
        sent_count: 0,
        failed_count: 0,
        test_mode: true
      })

      return NextResponse.json({
        success: true,
        sent_count: 0,
        failed_count: 0,
        message: 'No hay suscriptores'
      })
    }

    // Send notifications
    let successCount = 0
    let failedCount = 0

    const payload = JSON.stringify({
      title,
      body: message,
      icon: '/icon-192.png',
      badge: '/badge-72.png'
    })

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        }, payload)
        successCount++
      } catch (error) {
        console.error('Send error:', error)
        failedCount++
      }
    }

    // Log
    await supabase.from('push_notification_logs').insert({
      community_id,
      title,
      body: message,
      sent_count: successCount,
      failed_count: failedCount,
      test_mode: true
    })

    return NextResponse.json({
      success: true,
      sent_count: successCount,
      failed_count: failedCount,
      message: `Notificación enviada a ${successCount} suscriptores`
    })
  } catch (error) {
    console.error('Test send error:', error)
    return NextResponse.json({
      error: 'Failed to send test notification'
    }, { status: 500 })
  }
}
```

**Step 2: Test endpoint**

```bash
curl -X POST http://localhost:3000/api/admin/notifications/test \
  -H "Content-Type: application/json" \
  -H "Cookie: ..." \
  -d '{
    "community_id": "...",
    "title": "Test",
    "body": "This is a test",
    "recipient_mode": "self"
  }'
```

Expected: Notification sent to your device

**Step 3: Commit**

```bash
git add app/api/admin/notifications/test/route.ts
git commit -m "feat(api): add test push notification endpoint

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 21: Push Test Sender Component

**Files:**
- Create: `app/admin/tools/components/push-test-sender.tsx`

**Step 1: Create test sender form component**

```tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Bell, Loader2, Smartphone } from 'lucide-react'

export function PushTestSender() {
  const [communities, setCommunities] = useState<any[]>([])
  const [sending, setSending] = useState(false)
  const [formData, setFormData] = useState({
    community_id: '',
    title: '',
    body: '',
    recipient_mode: 'all'
  })

  useEffect(() => {
    fetchCommunities()
  }, [])

  async function fetchCommunities() {
    try {
      const res = await fetch('/api/communities')
      if (res.ok) {
        const data = await res.json()
        setCommunities(data)
        if (data.length > 0) {
          setFormData(prev => ({ ...prev, community_id: data[0].id }))
        }
      }
    } catch (error) {
      console.error('Fetch communities error:', error)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!formData.title || !formData.body) {
      toast.error('Completa todos los campos')
      return
    }

    setSending(true)

    try {
      const res = await fetch('/api/admin/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || 'Failed to send')
      }

      if (result.sent_count === 0) {
        toast.success('✅ Enviada a 0 suscriptores (nadie suscrito aún)')
      } else {
        toast.success(`✅ Enviada a ${result.sent_count} suscriptores`)
      }

      // Reset form
      setFormData(prev => ({ ...prev, title: '', body: '' }))
    } catch (error: any) {
      console.error('Send error:', error)
      toast.error(error.message || 'Error al enviar notificación')
    } finally {
      setSending(false)
    }
  }

  return (
    <Card className="border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      <CardHeader>
        <CardTitle className="font-heading font-black uppercase italic">
          Enviar Notificación de Prueba
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Community Selector */}
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-black/40">
              Comunidad
            </Label>
            <Select
              value={formData.community_id}
              onValueChange={(v) => setFormData({ ...formData, community_id: v })}
            >
              <SelectTrigger className="brutalist-input">
                <SelectValue placeholder="Seleccionar comunidad" />
              </SelectTrigger>
              <SelectContent>
                {communities.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-black/40">
              Título
            </Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Prueba de notificación"
              maxLength={50}
              className="brutalist-input"
            />
            <p className="text-xs text-black/60">
              {formData.title.length} / 50 caracteres
            </p>
          </div>

          {/* Body */}
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-black/40">
              Mensaje
            </Label>
            <Textarea
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              placeholder="Este es un mensaje de prueba..."
              maxLength={200}
              rows={3}
              className="brutalist-input"
            />
            <p className="text-xs text-black/60">
              {formData.body.length} / 200 caracteres
            </p>
          </div>

          {/* Recipient Mode */}
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-black/40">
              Destinatarios
            </Label>
            <RadioGroup
              value={formData.recipient_mode}
              onValueChange={(v) => setFormData({ ...formData, recipient_mode: v })}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all" className="cursor-pointer">
                  Todos los suscriptores
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="self" id="self" />
                <Label htmlFor="self" className="cursor-pointer">
                  Solo yo
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Preview */}
          {formData.title && formData.body && (
            <Card className="bg-gray-50 border-2 border-black/20">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-black/60" />
                  <p className="text-xs font-black uppercase tracking-widest text-black/40">
                    Vista Previa
                  </p>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-white p-3 border border-black/20 rounded">
                  <p className="font-bold text-sm">{formData.title}</p>
                  <p className="text-xs text-black/70 mt-1">{formData.body}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Send Button */}
          <Button
            type="submit"
            disabled={sending || !formData.title || !formData.body}
            className="w-full brutalist-button bg-primary text-white"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Bell className="h-4 w-4 mr-2" />
            )}
            Enviar Prueba
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
```

**Step 2: Test component**

Add to notifications tab (next task)

**Step 3: Commit**

```bash
git add app/admin/tools/components/push-test-sender.tsx
git commit -m "feat(admin): add push notification test sender component

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 22: Push Configuration Panel Component

**Files:**
- Create: `app/admin/tools/components/push-config-panel.tsx`

**Step 1: Create config panel component**

```tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2, Save, AlertCircle } from 'lucide-react'

export function PushConfigPanel() {
  const [communities, setCommunities] = useState<any[]>([])
  const [selectedCommunity, setSelectedCommunity] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState({
    is_enabled: true,
    max_per_day: 10,
    current_count_today: 0
  })

  useEffect(() => {
    fetchCommunities()
  }, [])

  useEffect(() => {
    if (selectedCommunity) {
      fetchConfig()
    }
  }, [selectedCommunity])

  async function fetchCommunities() {
    try {
      const res = await fetch('/api/communities')
      if (res.ok) {
        const data = await res.json()
        setCommunities(data)
        if (data.length > 0) {
          setSelectedCommunity(data[0].id)
        }
      }
    } catch (error) {
      console.error('Fetch communities error:', error)
    }
  }

  async function fetchConfig() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/notifications/config?community_id=${selectedCommunity}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setConfig({
        is_enabled: data.is_enabled,
        max_per_day: data.max_per_day,
        current_count_today: data.current_count_today
      })
    } catch (error) {
      console.error('Fetch config error:', error)
      toast.error('Error al cargar configuración')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/notifications/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          community_id: selectedCommunity,
          is_enabled: config.is_enabled,
          max_per_day: config.max_per_day
        })
      })

      if (!res.ok) throw new Error('Failed to save')

      toast.success('✅ Configuración guardada')
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Error al guardar configuración')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card className="border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <CardContent className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      <CardHeader>
        <CardTitle className="font-heading font-black uppercase italic">
          Configuración Global
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Community Selector */}
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest text-black/40">
            Comunidad
          </Label>
          <Select value={selectedCommunity} onValueChange={setSelectedCommunity}>
            <SelectTrigger className="brutalist-input">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {communities.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status Toggle */}
        <div className="flex items-center justify-between p-4 border-2 border-black rounded-none">
          <div>
            <Label className="text-sm font-bold">Notificaciones Activadas</Label>
            <p className="text-xs text-black/60">
              Cuando están desactivadas, no se envían notificaciones
            </p>
          </div>
          <Switch
            checked={config.is_enabled}
            onCheckedChange={(checked) => setConfig({ ...config, is_enabled: checked })}
          />
        </div>

        {!config.is_enabled && (
          <div className="p-3 bg-yellow-50 border-2 border-yellow-500 rounded-none">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
              <p className="text-sm font-bold text-yellow-800">
                ⚠️ Las notificaciones están desactivadas para esta comunidad
              </p>
            </div>
          </div>
        )}

        {/* Rate Limit */}
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest text-black/40">
            Límite Diario
          </Label>
          <Input
            type="number"
            min={1}
            max={50}
            value={config.max_per_day}
            onChange={(e) => setConfig({ ...config, max_per_day: parseInt(e.target.value) })}
            className="brutalist-input"
          />
          <p className="text-xs text-black/60">
            {config.current_count_today} / {config.max_per_day} enviadas hoy
          </p>
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full brutalist-button bg-primary text-white"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Guardar Configuración
        </Button>
      </CardContent>
    </Card>
  )
}
```

**Step 2: Test component**

Add to notifications tab (next task)

**Step 3: Commit**

```bash
git add app/admin/tools/components/push-config-panel.tsx
git commit -m "feat(admin): add push notification config panel

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 23: Complete Notifications Tab with All Features

**Files:**
- Modify: `app/admin/tools/components/notifications-tab.tsx`

**Step 1: Update notifications tab with all components**

```tsx
'use client'

import { PushStatsDashboard } from './push-stats-dashboard'
import { PushTestSender } from './push-test-sender'
import { PushConfigPanel } from './push-config-panel'

export function NotificationsTab() {
  return (
    <div className="space-y-12">
      {/* Statistics Section */}
      <section>
        <h2 className="text-2xl font-heading font-black uppercase italic mb-4 border-b-2 border-black pb-2">
          📊 Estadísticas
        </h2>
        <PushStatsDashboard />
      </section>

      {/* Configuration Section */}
      <section>
        <h2 className="text-2xl font-heading font-black uppercase italic mb-4 border-b-2 border-black pb-2">
          ⚙️ Configuración y Pruebas
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PushTestSender />
          <PushConfigPanel />
        </div>
      </section>
    </div>
  )
}
```

**Step 2: Test complete notifications tab**

Navigate to: `/admin/tools?tab=notifications`

Test all features:
1. View statistics
2. Send test notification
3. Change configuration
4. Verify rate limiting

Expected: All features work end-to-end

**Step 3: Commit**

```bash
git add app/admin/tools/components/notifications-tab.tsx
git commit -m "feat(admin): complete notifications tab with all features

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 24: Add Link from Alerts Page to Tools

**Files:**
- Modify: `app/admin/alerts/page.tsx`

**Step 1: Add configuration button to alerts page header**

Find the header section and add button:
```tsx
<header className="flex items-center justify-between">
  <div className="space-y-2">
    <h1 className="text-4xl font-heading font-black uppercase italic tracking-tighter">
      Gestión de <span className="text-primary">Alertas</span>
    </h1>
    <p className="font-bold text-black/60 text-sm">
      Crea avisos críticos o de servicios públicos para las comunidades.
    </p>
  </div>
  <Link href="/admin/tools?tab=notifications">
    <Button className="brutalist-button">
      <Settings className="h-4 w-4 mr-2" />
      Configurar Notificaciones
    </Button>
  </Link>
</header>
```

Add imports:
```tsx
import Link from 'next/link'
import { Settings } from 'lucide-react'
```

**Step 2: Test link**

Navigate to: `/admin/alerts`
Click "Configurar Notificaciones"

Expected: Navigates to `/admin/tools?tab=notifications`

**Step 3: Commit**

```bash
git add app/admin/alerts/page.tsx
git commit -m "feat(admin): add link to notification config from alerts page

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 25: Final Testing & Documentation

**Files:**
- Create: `docs/admin-tools-usage.md` (optional)

**Step 1: Run full integration tests**

Test checklist:
- [ ] Image storage analytics loads and syncs
- [ ] SEO settings save and appear in page source
- [ ] Push notification stats display correctly
- [ ] Test notifications send successfully
- [ ] Rate limiting blocks after limit reached
- [ ] Configuration changes persist
- [ ] All navigation links work
- [ ] Mobile responsive design works
- [ ] RLS policies enforce permissions (test as community admin)

**Step 2: Create usage documentation (optional)**

Document for admins how to use new features.

**Step 3: Final commit**

```bash
git add docs/admin-tools-usage.md
git commit -m "docs: add admin tools usage guide

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

**Phase 3 Complete! ✅**

**All Three Phases Complete! 🎉**

At this point, the Admin Tools Hub is fully functional with:
- ✅ Image storage analytics
- ✅ SEO management per community
- ✅ Push notification statistics
- ✅ Push notification testing
- ✅ Push notification configuration

---

## Post-Implementation Checklist

Before marking complete:
- [ ] All database migrations applied successfully
- [ ] All API routes tested and working
- [ ] All UI components render correctly
- [ ] Mobile responsive design verified
- [ ] RLS policies tested (community admin vs super admin)
- [ ] Rate limiting tested and working
- [ ] Error handling tested (offline, failures, etc.)
- [ ] Documentation updated
- [ ] Git history clean with descriptive commits
- [ ] No console errors or warnings
- [ ] Performance acceptable (< 2s page loads)

---

## Known Limitations & Future Enhancements

**Current Limitations:**
- Storage sync does not track actual file sizes (Supabase Storage API limitation)
- Storage trends require daily cron job to accumulate historical data
- No webhook for real-time storage updates
- SEO metadata injection requires server restart to clear cache
- Push notification click tracking not yet implemented

**Future Enhancements (Out of Scope):**
- Image compression and optimization
- Core Web Vitals tracking
- Advanced SEO features (structured data editor, sitemap)
- Notification scheduling and segmentation
- A/B testing for notifications

---

**End of Implementation Plan**

Total estimated time: 6-8 weeks
- Phase 1: 2-3 weeks
- Phase 2: 2-3 weeks
- Phase 3: 1-2 weeks
