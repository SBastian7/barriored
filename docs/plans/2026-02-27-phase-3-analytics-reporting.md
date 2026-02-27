# Phase 3: Analytics & Reporting

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build comprehensive statistics dashboard with business, user, community, and moderation metrics, plus CSV export functionality

**Architecture:** Statistics page with real-time metric cards, category breakdowns, role distributions, and CSV export API route

**Tech Stack:** Next.js 16, React 19, TypeScript, Supabase, Tailwind CSS

**Prerequisites:** Phases 1-2 must be complete (database structure and permission system in place)

---

## Task 1: Stat Card Reusable Component

**Files:**
- Create: `components/admin/stat-card.tsx`

**Step 1: Create stat card component**

```typescript
import { Card, CardContent } from '@/components/ui/card'
import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  icon: LucideIcon
  label: string
  value: number | string
  bg?: string
}

export function StatCard({ icon: Icon, label, value, bg = 'bg-white' }: StatCardProps) {
  return (
    <Card className={`brutalist-card ${bg}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 border-2 border-black bg-white">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-black">{value}</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-black/50">
              {label}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

**Step 2: Commit**

```bash
git add components/admin/stat-card.tsx
git commit -m "feat(admin): create reusable stat card component

- Display metric with icon and label
- Support background color customization
- Neo-brutalist design with border and shadow
- Compact layout for dashboard

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Statistics Page - Structure and Business Metrics

**Files:**
- Create: `app/admin/statistics/page.tsx`

**Step 1: Create statistics page with business metrics**

```typescript
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatCard } from '@/components/admin/stat-card'
import {
  Store,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  Star,
  AlertTriangle,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'

type Stats = {
  businesses: {
    total: number
    pending: number
    approved: number
    rejected: number
    byCategory: { category: string; count: number }[]
    recentRegistrations7d: number
    recentRegistrations30d: number
    featured: number
    deletionRequests: number
  }
}

export default function AdminStatisticsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'7d' | '30d'>('30d')
  const supabase = createClient()

  useEffect(() => {
    fetchStatistics()
  }, [])

  async function fetchStatistics() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('community_id, is_super_admin')
        .eq('id', user.id)
        .single()

      const now = new Date()
      const date7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const date30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      // Build base query
      let businessQuery = supabase.from('businesses').select('*', { count: 'exact' })

      // Filter by community for non-super-admins
      if (!profile?.is_super_admin && profile?.community_id) {
        businessQuery = businessQuery.eq('community_id', profile.community_id)
      }

      // Fetch business stats
      const [
        allBusinesses,
        pending,
        approved,
        rejected,
        featured,
        deletionRequests,
        recent7d,
        recent30d,
      ] = await Promise.all([
        businessQuery,
        businessQuery.eq('status', 'pending'),
        businessQuery.eq('status', 'approved'),
        businessQuery.eq('status', 'rejected'),
        businessQuery.eq('is_featured', true),
        businessQuery.eq('deletion_requested', true),
        businessQuery.gte('created_at', date7d.toISOString()),
        businessQuery.gte('created_at', date30d.toISOString()),
      ])

      // Fetch category breakdown
      let categoryQuery = supabase
        .from('businesses')
        .select('category_id, categories(name)')

      if (!profile?.is_super_admin && profile?.community_id) {
        categoryQuery = categoryQuery.eq('community_id', profile.community_id)
      }

      const { data: bizWithCategories } = await categoryQuery

      const byCategory = bizWithCategories?.reduce((acc, b: any) => {
        const cat = b.categories?.name || 'Sin categoría'
        const existing = acc.find(item => item.category === cat)
        if (existing) {
          existing.count++
        } else {
          acc.push({ category: cat, count: 1 })
        }
        return acc
      }, [] as { category: string; count: number }[]) || []

      setStats({
        businesses: {
          total: allBusinesses.count || 0,
          pending: pending.count || 0,
          approved: approved.count || 0,
          rejected: rejected.count || 0,
          byCategory: byCategory.sort((a, b) => b.count - a.count),
          recentRegistrations7d: recent7d.count || 0,
          recentRegistrations30d: recent30d.count || 0,
          featured: featured.count || 0,
          deletionRequests: deletionRequests.count || 0,
        },
      })
    } catch (error) {
      console.error('Error fetching statistics:', error)
      toast.error('Error al cargar estadísticas')
    } finally {
      setLoading(false)
    }
  }

  if (loading || !stats) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between border-b-4 border-black pb-4">
        <h1 className="text-4xl font-heading font-black uppercase italic tracking-tighter">
          Estadísticas de la <span className="text-primary italic">Plataforma</span>
        </h1>

        <div className="flex gap-2">
          <Button
            variant={period === '7d' ? 'default' : 'outline'}
            onClick={() => setPeriod('7d')}
            className="brutalist-button"
            size="sm"
          >
            7 Días
          </Button>
          <Button
            variant={period === '30d' ? 'default' : 'outline'}
            onClick={() => setPeriod('30d')}
            className="brutalist-button"
            size="sm"
          >
            30 Días
          </Button>
        </div>
      </div>

      {/* Business Stats */}
      <div>
        <h2 className="text-2xl font-black uppercase italic mb-4 flex items-center gap-2">
          <Store className="h-6 w-6" /> Negocios
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={Store}
            label="Total Negocios"
            value={stats.businesses.total}
            bg="bg-white"
          />
          <StatCard
            icon={Clock}
            label="Pendientes"
            value={stats.businesses.pending}
            bg="bg-secondary/20"
          />
          <StatCard
            icon={CheckCircle}
            label="Aprobados"
            value={stats.businesses.approved}
            bg="bg-green-50"
          />
          <StatCard
            icon={XCircle}
            label="Rechazados"
            value={stats.businesses.rejected}
            bg="bg-red-50"
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
          <StatCard
            icon={TrendingUp}
            label={`Nuevos (${period})`}
            value={
              period === '7d'
                ? stats.businesses.recentRegistrations7d
                : stats.businesses.recentRegistrations30d
            }
            bg="bg-accent/10"
          />
          <StatCard
            icon={Star}
            label="Destacados"
            value={stats.businesses.featured}
            bg="bg-yellow-50"
          />
          <StatCard
            icon={AlertTriangle}
            label="Solicitudes Eliminación"
            value={stats.businesses.deletionRequests}
            bg="bg-red-100"
          />
        </div>

        {/* By Category */}
        <Card className="brutalist-card mt-4">
          <CardHeader className="border-b-2 border-black">
            <CardTitle className="font-heading font-black uppercase italic text-lg">
              Negocios por Categoría
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-2">
              {stats.businesses.byCategory.map(({ category, count }) => (
                <div
                  key={category}
                  className="flex justify-between items-center border-b border-black/10 pb-2"
                >
                  <span className="font-bold">{category}</span>
                  <Badge className="brutalist-button">{count}</Badge>
                </div>
              ))}
              {stats.businesses.byCategory.length === 0 && (
                <p className="text-center text-black/40 py-4">No hay datos</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add app/admin/statistics/page.tsx
git commit -m "feat(admin): create statistics page with business metrics

- Display business stats (total, pending, approved, rejected)
- Show recent registrations (7d/30d toggle)
- Featured and deletion request counts
- Category breakdown table
- Community-scoped for non-super-admins

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Statistics Page - Add User Metrics

**Files:**
- Modify: `app/admin/statistics/page.tsx`

**Step 1: Update Stats type and add user metrics**

Update Stats type:
```typescript
type Stats = {
  businesses: {
    // ... existing
  }
  users: {
    total: number
    newUsers7d: number
    newUsers30d: number
    byRole: { role: string; count: number }[]
    suspended: number
  }
}
```

**Step 2: Fetch user stats in fetchStatistics**

Add after business stats fetch:
```typescript
// Fetch user stats
let userQuery = supabase.from('profiles').select('*', { count: 'exact' })

if (!profile?.is_super_admin && profile?.community_id) {
  userQuery = userQuery.eq('community_id', profile.community_id)
}

const [allUsers, newUsers7d, newUsers30d, suspended] = await Promise.all([
  userQuery,
  userQuery.gte('created_at', date7d.toISOString()),
  userQuery.gte('created_at', date30d.toISOString()),
  userQuery.eq('is_suspended', true),
])

// Role distribution
let roleQuery = supabase.from('profiles').select('role')

if (!profile?.is_super_admin && profile?.community_id) {
  roleQuery = roleQuery.eq('community_id', profile.community_id)
}

const { data: roleData } = await roleQuery

const byRole = roleData?.reduce((acc, p) => {
  const role = p.role || 'user'
  const existing = acc.find(item => item.role === role)
  if (existing) {
    existing.count++
  } else {
    acc.push({ role, count: 1 })
  }
  return acc
}, [] as { role: string; count: number }[]) || []
```

**Step 3: Update setStats to include users**

```typescript
setStats({
  businesses: { /* ... */ },
  users: {
    total: allUsers.count || 0,
    newUsers7d: newUsers7d.count || 0,
    newUsers30d: newUsers30d.count || 0,
    byRole,
    suspended: suspended.count || 0,
  },
})
```

**Step 4: Add user metrics UI**

Add after business stats section:
```typescript
{/* User Stats */}
<div>
  <h2 className="text-2xl font-black uppercase italic mb-4 flex items-center gap-2">
    <Users className="h-6 w-6" /> Usuarios
  </h2>

  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    <StatCard icon={Users} label="Total Usuarios" value={stats.users.total} bg="bg-white" />
    <StatCard
      icon={TrendingUp}
      label={`Nuevos (${period})`}
      value={period === '7d' ? stats.users.newUsers7d : stats.users.newUsers30d}
      bg="bg-accent/10"
    />
    <StatCard
      icon={Shield}
      label="Moderadores/Admins"
      value={stats.users.byRole.filter(r => r.role !== 'user').reduce((sum, r) => sum + r.count, 0)}
      bg="bg-secondary/20"
    />
    <StatCard
      icon={AlertTriangle}
      label="Suspendidos"
      value={stats.users.suspended}
      bg="bg-red-50"
    />
  </div>

  {/* By Role */}
  <Card className="brutalist-card mt-4">
    <CardHeader className="border-b-2 border-black">
      <CardTitle className="font-heading font-black uppercase italic text-lg">
        Usuarios por Rol
      </CardTitle>
    </CardHeader>
    <CardContent className="p-4">
      <div className="space-y-2">
        {stats.users.byRole.map(({ role, count }) => (
          <div key={role} className="flex justify-between items-center border-b border-black/10 pb-2">
            <span className="font-bold capitalize">{role}</span>
            <Badge className="brutalist-button">{count}</Badge>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
</div>
```

**Step 5: Import Users and Shield icons**

Update imports:
```typescript
import {
  Store,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  Star,
  AlertTriangle,
  Loader2,
  Users,
  Shield,
} from 'lucide-react'
```

**Step 6: Commit**

```bash
git add app/admin/statistics/page.tsx
git commit -m "feat(admin): add user metrics to statistics page

- Display total users and new registrations
- Show moderator/admin count
- Show suspended users count
- Role distribution breakdown
- Filter by 7d/30d period

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

---

## Task 4: Statistics Page - Add Community Engagement Metrics

**Files:**
- Modify: `app/admin/statistics/page.tsx`

**Step 1: Update Stats type for community**

Add to Stats type:
```typescript
community: {
  totalPosts: number
  announcements: number
  events: number
  jobs: number
  recentPosts7d: number
}
```

**Step 2: Fetch community stats**

Add to fetchStatistics:
```typescript
// Fetch community stats
let postsQuery = supabase.from('community_posts').select('*', { count: 'exact' })

if (!profile?.is_super_admin && profile?.community_id) {
  postsQuery = postsQuery.eq('community_id', profile.community_id)
}

const [allPosts, announcements, events, jobs, recentPosts] = await Promise.all([
  postsQuery,
  postsQuery.eq('type', 'announcement'),
  postsQuery.eq('type', 'event'),
  postsQuery.eq('type', 'job'),
  postsQuery.gte('created_at', date7d.toISOString()),
])
```

**Step 3: Add to setStats**

```typescript
community: {
  totalPosts: allPosts.count || 0,
  announcements: announcements.count || 0,
  events: events.count || 0,
  jobs: jobs.count || 0,
  recentPosts7d: recentPosts.count || 0,
}
```

**Step 4: Add community metrics UI**

Add after user stats section:
```typescript
{/* Community Engagement */}
<div>
  <h2 className="text-2xl font-black uppercase italic mb-4 flex items-center gap-2">
    <MessageSquare className="h-6 w-6" /> Comunidad
  </h2>

  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    <StatCard
      icon={MessageSquare}
      label="Total Publicaciones"
      value={stats.community.totalPosts}
      bg="bg-white"
    />
    <StatCard
      icon={Megaphone}
      label="Anuncios"
      value={stats.community.announcements}
      bg="bg-accent/10"
    />
    <StatCard
      icon={Calendar}
      label="Eventos"
      value={stats.community.events}
      bg="bg-secondary/20"
    />
    <StatCard icon={Briefcase} label="Empleos" value={stats.community.jobs} bg="bg-green-50" />
  </div>

  <div className="mt-4">
    <StatCard
      icon={TrendingUp}
      label="Publicaciones (últimos 7 días)"
      value={stats.community.recentPosts7d}
      bg="bg-primary/10"
    />
  </div>
</div>
```

**Step 5: Import community icons**

Update imports:
```typescript
import {
  Store,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  Star,
  AlertTriangle,
  Loader2,
  Users,
  Shield,
  MessageSquare,
  Megaphone,
  Calendar,
  Briefcase,
} from 'lucide-react'
```

**Step 6: Commit**

```bash
git add app/admin/statistics/page.tsx
git commit -m "feat(admin): add community engagement metrics

- Display total posts, announcements, events, jobs
- Show recent activity (last 7 days)
- Consistent stat card layout
- Community-scoped metrics

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Statistics Page - Add Moderation Stats

**Files:**
- Modify: `app/admin/statistics/page.tsx`

**Step 1: Update Stats type for moderation**

Add to Stats type:
```typescript
moderation: {
  totalReports: number
  pendingReports: number
  resolvedReports: number
}
```

**Step 2: Fetch moderation stats**

Add to fetchStatistics:
```typescript
// Fetch moderation stats
const [allReports, pendingReports, resolvedReports] = await Promise.all([
  supabase.from('content_reports').select('*', { count: 'exact' }),
  supabase.from('content_reports').select('*', { count: 'exact' }).eq('status', 'pending'),
  supabase.from('content_reports').select('*', { count: 'exact' }).eq('status', 'resolved'),
])
```

**Step 3: Add to setStats**

```typescript
moderation: {
  totalReports: allReports.count || 0,
  pendingReports: pendingReports.count || 0,
  resolvedReports: resolvedReports.count || 0,
}
```

**Step 4: Add moderation metrics UI**

Add after community stats section:
```typescript
{/* Moderation Stats */}
<div>
  <h2 className="text-2xl font-black uppercase italic mb-4 flex items-center gap-2">
    <ShieldIcon className="h-6 w-6" /> Moderación
  </h2>

  <div className="grid grid-cols-3 gap-4">
    <StatCard
      icon={Flag}
      label="Total Reportes"
      value={stats.moderation.totalReports}
      bg="bg-white"
    />
    <StatCard
      icon={Clock}
      label="Pendientes"
      value={stats.moderation.pendingReports}
      bg="bg-yellow-50"
    />
    <StatCard
      icon={CheckCircle}
      label="Resueltos"
      value={stats.moderation.resolvedReports}
      bg="bg-green-50"
    />
  </div>
</div>
```

**Step 5: Import moderation icons**

Update imports:
```typescript
import {
  Store,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  Star,
  AlertTriangle,
  Loader2,
  Users,
  Shield,
  MessageSquare,
  Megaphone,
  Calendar,
  Briefcase,
  Shield as ShieldIcon,
  Flag,
} from 'lucide-react'
```

**Step 6: Commit**

```bash
git add app/admin/statistics/page.tsx
git commit -m "feat(admin): add moderation statistics

- Display total reports, pending, resolved
- Track content moderation activity
- Consistent stat card layout

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: CSV Export API Route

**Files:**
- Create: `app/api/admin/export/businesses/route.ts`

**Step 1: Create CSV export endpoint**

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/auth/api-protection'

export async function GET(request: Request) {
  const supabase = await createClient()

  // Check permission (admins only can export)
  const auth = await requirePermission('canExportData', supabase)
  if (!auth.authorized) return auth.error

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('community_id, is_super_admin')
    .eq('id', user!.id)
    .single()

  // Build query
  let query = supabase
    .from('businesses')
    .select(`
      id,
      name,
      slug,
      status,
      created_at,
      address,
      phone,
      whatsapp,
      email,
      website,
      is_featured,
      categories(name),
      profiles!businesses_owner_id_profiles_fkey(full_name, email)
    `)
    .order('created_at', { ascending: false })

  // Filter by community for non-super-admins
  if (!profile?.is_super_admin && profile?.community_id) {
    query = query.eq('community_id', profile.community_id)
  }

  const { data: businesses, error } = await query

  if (error) {
    console.error('Error fetching businesses for export:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Generate CSV
  const headers = [
    'ID',
    'Nombre',
    'Slug',
    'Categoría',
    'Estado',
    'Fecha Creación',
    'Dirección',
    'Teléfono',
    'WhatsApp',
    'Email',
    'Sitio Web',
    'Destacado',
    'Propietario',
    'Email Propietario',
  ]

  const rows = businesses?.map(b => [
    b.id,
    b.name,
    b.slug,
    (b.categories as any)?.name || '',
    b.status || '',
    b.created_at ? new Date(b.created_at).toLocaleDateString('es-CO') : '',
    b.address || '',
    b.phone || '',
    b.whatsapp || '',
    b.email || '',
    b.website || '',
    b.is_featured ? 'Sí' : 'No',
    (b.profiles as any)?.full_name || '',
    (b.profiles as any)?.email || '',
  ]) || []

  // Escape CSV values (wrap in quotes, escape existing quotes)
  const escapeCSV = (value: string) => {
    const stringValue = String(value)
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`
    }
    return stringValue
  }

  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(escapeCSV).join(','))
  ].join('\n')

  // Add BOM for proper UTF-8 encoding in Excel
  const bom = '\uFEFF'
  const csvWithBOM = bom + csv

  // Return CSV file
  return new NextResponse(csvWithBOM, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="negocios-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  })
}
```

**Step 2: Commit**

```bash
git add app/api/admin/export/businesses/route.ts
git commit -m "feat(api): create CSV export endpoint for businesses

- Export essential business data fields
- Include category, owner, and contact info
- Filter by community for non-super-admins
- Proper CSV escaping and UTF-8 BOM
- Downloadable file with date in filename

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Add Export Button to Businesses Page

**Files:**
- Modify: `app/admin/businesses/page.tsx`

**Step 1: Add export function**

Add after fetchBusinesses function:
```typescript
async function handleExport() {
  try {
    const response = await fetch('/api/admin/export/businesses')

    if (!response.ok) {
      throw new Error('Error al exportar')
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `negocios-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)

    toast.success('Datos exportados exitosamente')
  } catch (error) {
    console.error('Error exporting:', error)
    toast.error('Error al exportar datos')
  }
}
```

**Step 2: Add export button UI**

After the title (around line 122), add:
```typescript
<div className="flex items-end justify-between border-b-4 border-black pb-4">
  <h1 className="text-4xl font-heading font-black uppercase italic tracking-tighter">
    Gestión de <span className="text-primary italic">Negocios</span>
  </h1>
  <Button onClick={handleExport} className="brutalist-button bg-green-600 text-white">
    <Download className="h-4 w-4 mr-2" /> Exportar a CSV
  </Button>
</div>
```

**Step 3: Import Download icon**

Update imports:
```typescript
import { Eye, Loader2, Search, Download } from 'lucide-react'
```

**Step 4: Commit**

```bash
git add app/admin/businesses/page.tsx
git commit -m "feat(admin): add CSV export button to businesses page

- Add export button next to page title
- Download CSV file with current date
- Show success/error toasts
- Trigger browser download

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Add Statistics Link to Admin Navigation

**Files:**
- Modify: `app/admin/layout.tsx`

**Step 1: Add Statistics nav link**

After Users link, add:
```typescript
<Link href="/admin/statistics">
  <Button variant="ghost" size="sm" className="font-black uppercase tracking-widest text-[10px] hover:bg-primary/10 transition-colors">
    <BarChart3 className="h-4 w-4 mr-1" /> Estadísticas
  </Button>
</Link>
```

**Step 2: Import BarChart3 icon**

Update imports:
```typescript
import { ArrowLeft, Store, Tag, Users, AlertTriangle, Siren, BarChart3 } from 'lucide-react'
```

**Step 3: Commit**

```bash
git add app/admin/layout.tsx
git commit -m "feat(admin): add statistics link to navigation

- Add Estadísticas nav button
- Import BarChart3 icon
- Consistent styling with other nav items

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Phase 3 Complete! ✅

**What we built:**
- ✅ Reusable stat card component
- ✅ Statistics dashboard page
- ✅ Business metrics (total, by status, by category, growth)
- ✅ User metrics (total, new, by role, suspended)
- ✅ Community engagement metrics (posts, announcements, events, jobs)
- ✅ Moderation statistics (reports)
- ✅ CSV export API route
- ✅ Export button on businesses page
- ✅ Statistics navigation link

**Next Steps:**
- See `2026-02-27-phase-4-ux-enhancements.md` for Category Drag-and-Drop Reordering

---

## Execution

Ready to implement! Use with `@superpowers:executing-plans` or `@superpowers:subagent-driven-development`.