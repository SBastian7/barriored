# Super Admin Platform Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reach 100% completion of the Super Admin feature set — covering gap-fills in existing pages, community management additions, four new platform-wide admin pages, and cross-community analytics enhancements.

**Architecture:** Gap-fill approach on the existing Next.js App Router + Supabase stack. New platform-wide pages live under `/admin/platform/`. Broken pages are fixed in-place. Community detail page gains three new client sub-components. No new external dependencies.

**Tech Stack:** Next.js 16 App Router, React 19, Supabase (PostgreSQL + RLS), Tailwind CSS, Radix UI, lucide-react, `@dnd-kit/core` (already installed for categories drag-reorder), `next/navigation` useSearchParams for URL param reading in client components.

---

## File Map

**New files:**
- `supabase/migrations/20260511000001_super_admin_platform.sql`
- `app/api/admin/categories/route.ts` — POST (create category)
- `app/api/admin/categories/[id]/route.ts` — PATCH, DELETE
- `app/api/admin/platform/settings/route.ts` — GET, PATCH
- `app/api/admin/platform/policies/route.ts` — GET
- `app/api/admin/platform/policies/[type]/route.ts` — GET, PATCH
- `app/api/admin/platform/payments/route.ts` — GET
- `app/api/admin/platform/payments/[gateway]/route.ts` — PATCH
- `app/api/admin/platform/service-categories/route.ts` — GET, POST
- `app/api/admin/platform/service-categories/[id]/route.ts` — PATCH, DELETE
- `app/admin/platform/settings/page.tsx`
- `app/admin/platform/policies/page.tsx`
- `app/admin/platform/payments/page.tsx`
- `app/admin/platform/service-categories/page.tsx`
- `components/admin/community-quick-actions.tsx` — quick-access link card
- `components/admin/community-danger-zone.tsx` — hard delete UI
- `components/admin/community-ownership-panel.tsx` — ownership transfer UI

**Modified files:**
- `components/admin/community-form.tsx` — add cover_image_url field
- `app/admin/categories/page.tsx` — wire up create/edit/delete dialogs
- `app/admin/payments/page.tsx` — super admin cross-community support
- `app/admin/communities/[id]/page.tsx` — add quick-access, danger zone, ownership tabs
- `app/api/admin/communities/[id]/route.ts` — add permanent=true hard delete
- `app/admin/businesses/page.tsx` — respect community_id searchParam for super admin
- `app/admin/users/page.tsx` — respect community_id searchParam for super admin
- `app/admin/alerts/page.tsx` — respect community_id searchParam for super admin
- `app/admin/marketplace/page.tsx` — respect community_id searchParam for super admin
- `app/admin/statistics/page.tsx` — community selector + Comparativa tab
- `app/admin/services/page.tsx` — switch category to dynamic service_categories query
- `components/admin/collapsible-sidebar.tsx` — add Plataforma nav group
- `lib/types/index.ts` — update ServiceCategory type

---

## Task 1: DB Migration

**Files:**
- Create: `supabase/migrations/20260511000001_super_admin_platform.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- Migration: Super Admin Platform Management
-- Date: 2026-05-11

-- 1. Add primary_admin_id to communities
ALTER TABLE communities
  ADD COLUMN IF NOT EXISTS primary_admin_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- 2. Platform config (singleton)
CREATE TABLE IF NOT EXISTS platform_config (
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

-- Seed one row
INSERT INTO platform_config (platform_name)
  VALUES ('BarrioRed')
  ON CONFLICT DO NOTHING;

-- RLS
ALTER TABLE platform_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "platform_config_read" ON platform_config
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "platform_config_write" ON platform_config
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));

-- 3. Platform policies
CREATE TABLE IF NOT EXISTS platform_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES profiles(id)
);

INSERT INTO platform_policies (type, title) VALUES
  ('terms',     'Términos de Servicio'),
  ('privacy',   'Política de Privacidad'),
  ('content',   'Política de Contenido'),
  ('community', 'Normas Comunitarias')
ON CONFLICT (type) DO NOTHING;

ALTER TABLE platform_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "platform_policies_read" ON platform_policies
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "platform_policies_write" ON platform_policies
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));

-- 4. Platform payment config
CREATE TABLE IF NOT EXISTS platform_payment_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway TEXT NOT NULL UNIQUE,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  environment TEXT NOT NULL DEFAULT 'test',
  public_key TEXT,
  private_key TEXT,
  webhook_secret TEXT,
  account_identifier TEXT,
  commission_rate NUMERIC(5,4) DEFAULT 0.03,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES profiles(id)
);

INSERT INTO platform_payment_config (gateway) VALUES
  ('wompi'), ('nequi'), ('mercadopago')
ON CONFLICT (gateway) DO NOTHING;

ALTER TABLE platform_payment_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payment_config_super_admin" ON platform_payment_config
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));

-- 5. Service categories
CREATE TABLE IF NOT EXISTS service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT NOT NULL DEFAULT 'circle',
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO service_categories (name, slug, icon, sort_order) VALUES
  ('Emergencias',       'emergency',   'siren',       0),
  ('Salud',             'health',      'heart-pulse',  1),
  ('Gobierno',          'government',  'landmark',     2),
  ('Transporte',        'transport',   'bus',          3),
  ('Servicios Públicos','utilities',   'zap',          4)
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_categories_read" ON service_categories
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "service_categories_write" ON service_categories
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));

-- 6. Migrate public_services.category → service_category_id FK
ALTER TABLE public_services
  ADD COLUMN IF NOT EXISTS service_category_id UUID REFERENCES service_categories(id);

-- Backfill from text value to FK
UPDATE public_services ps
SET service_category_id = sc.id
FROM service_categories sc
WHERE ps.category = sc.slug
  AND ps.service_category_id IS NULL;

-- Note: do NOT drop public_services.category yet — verify backfill in production first.
-- Run after confirming: ALTER TABLE public_services DROP COLUMN category;
```

- [ ] **Step 2: Apply the migration**

```bash
npx supabase db push
```

Expected: migration applies without errors. If using remote Supabase, run via the Supabase dashboard SQL editor.

- [ ] **Step 3: Verify in Supabase dashboard**

Check that these tables/columns exist:
- `communities.primary_admin_id`
- `platform_config` (1 row)
- `platform_policies` (4 rows)
- `platform_payment_config` (3 rows)
- `service_categories` (5 rows)
- `public_services.service_category_id` (backfilled)

- [ ] **Step 4: Update TypeScript types**

Regenerate Supabase types:
```bash
npx supabase gen types typescript --local > lib/types/supabase.ts
```

Or if using remote: replace `--local` with `--project-id <your-project-id>`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260511000001_super_admin_platform.sql lib/types/supabase.ts
git commit -m "feat(db): add super admin platform management schema"
```

---

## Task 2: Cover Image Upload in Community Form

**Files:**
- Modify: `components/admin/community-form.tsx`

- [ ] **Step 1: Add `cover_image_url` to form state and render a second ImageUploadField**

In `components/admin/community-form.tsx`, make these changes:

Change the `formData` state initialization (line 19–26) to include `cover_image_url`:
```typescript
const [formData, setFormData] = useState({
  name: initialData?.name || '',
  slug: initialData?.slug || '',
  municipality: initialData?.municipality || '',
  department: initialData?.department || '',
  description: initialData?.description || '',
  logo_url: initialData?.logo_url || null,
  cover_image_url: initialData?.cover_image_url || null,
})
```

After the existing `ImageUploadField` for logo (after line 168), add:
```tsx
<ImageUploadField
  label="Imagen de Portada"
  value={formData.cover_image_url}
  onChange={(url) => setFormData({ ...formData, cover_image_url: url })}
  bucket="community-images"
  maxSizeMB={5}
  aspectRatio="16/9"
  maxWidth="100%"
/>
```

- [ ] **Step 2: Manual test**

Start dev server: `npm run dev`

Navigate to `/admin/communities/new` — verify a second upload field "Imagen de Portada" appears below the logo field. Upload an image and submit — verify `cover_image_url` is saved (check Supabase dashboard: communities table, cover_image_url column).

Navigate to `/admin/communities/{id}/edit` — verify existing cover image loads into the field.

- [ ] **Step 3: Commit**

```bash
git add components/admin/community-form.tsx
git commit -m "feat(admin): add cover image upload to community form"
```

---

## Task 3: Business Categories — CRUD API Routes

**Files:**
- Create: `app/api/admin/categories/route.ts`
- Create: `app/api/admin/categories/[id]/route.ts`

- [ ] **Step 1: Create POST route for new category**

Create `app/api/admin/categories/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/auth/api-protection'

export async function POST(request: Request) {
  const supabase = await createClient()
  const permissionCheck = await requirePermission('canManageCategories', supabase)
  if (!permissionCheck.authorized) return permissionCheck.error

  const { name, slug, icon, sort_order } = await request.json()

  if (!name || !slug) {
    return NextResponse.json({ error: 'name y slug son requeridos' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('categories')
    .insert({ name, slug, icon: icon || 'tag', sort_order: sort_order ?? 99 })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ category: data }, { status: 201 })
}
```

- [ ] **Step 2: Create PATCH and DELETE routes for existing category**

Create `app/api/admin/categories/[id]/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/auth/api-protection'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const permissionCheck = await requirePermission('canManageCategories', supabase)
  if (!permissionCheck.authorized) return permissionCheck.error

  const { name, slug, icon } = await request.json()

  const { data, error } = await supabase
    .from('categories')
    .update({ name, slug, icon })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ category: data })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const permissionCheck = await requirePermission('canManageCategories', supabase)
  if (!permissionCheck.authorized) return permissionCheck.error

  // Block delete if businesses reference this category
  const { count } = await supabase
    .from('businesses')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', id)

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: `No se puede eliminar: ${count} negocio(s) usan esta categoría` },
      { status: 409 }
    )
  }

  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 3: Manual test via curl**

```bash
# POST - create
curl -X POST http://localhost:3000/api/admin/categories \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","slug":"test","icon":"tag","sort_order":99}' \
  -b "<your-session-cookie>"
# Expected: {"category":{"id":"...","name":"Test",...}}

# DELETE - should 409 if category has businesses, 200 otherwise
```

- [ ] **Step 4: Commit**

```bash
git add app/api/admin/categories/
git commit -m "feat(api): add CRUD routes for business categories"
```

---

## Task 4: Business Categories — CRUD UI Dialogs

**Files:**
- Modify: `app/admin/categories/page.tsx`

- [ ] **Step 1: Add create/edit/delete dialog state and handlers to the categories page**

Replace the entire `app/admin/categories/page.tsx` with:

```typescript
// @ts-nocheck - Pre-existing admin file with type inference issues
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { SortableCategoryItem } from '@/components/admin/sortable-category-item'
import { createClient } from '@/lib/supabase/client'
import { getPermissions } from '@/lib/auth/permissions'
import { toast } from 'sonner'
import type { Category } from '@/lib/types'

function generateSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [hasPermission, setHasPermission] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null)
  const [formData, setFormData] = useState({ name: '', slug: '', icon: 'tag' })
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  useEffect(() => {
    checkPermissions()
    fetchCategories()
  }, [])

  async function checkPermissions() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }
    const { data: profile } = await supabase
      .from('profiles').select('role, is_super_admin').eq('id', user.id).single()
    const permissions = getPermissions(profile?.role, profile?.is_super_admin)
    setHasPermission(permissions.canManageCategories)
    if (!permissions.canManageCategories) router.push('/admin')
  }

  async function fetchCategories() {
    const supabase = createClient()
    const { data } = await supabase.from('categories').select('*').order('sort_order', { ascending: true })
    setCategories(data || [])
    setLoading(false)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = categories.findIndex((c) => c.id === active.id)
    const newIndex = categories.findIndex((c) => c.id === over.id)
    const reordered = arrayMove(categories, oldIndex, newIndex)
    setCategories(reordered)
    try {
      const res = await fetch('/api/admin/categories/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reorderedCategories: reordered.map((c, i) => ({ id: c.id, sort_order: i + 1 })) }),
      })
      if (!res.ok) throw new Error()
      await fetchCategories()
    } catch {
      toast.error('Error al reordenar')
      await fetchCategories()
    }
  }

  function openCreate() {
    setEditingCategory(null)
    setFormData({ name: '', slug: '', icon: 'tag' })
    setDialogOpen(true)
  }

  function openEdit(category: Category) {
    setEditingCategory(category)
    setFormData({ name: category.name, slug: category.slug, icon: category.icon || 'tag' })
    setDialogOpen(true)
  }

  function openDelete(category: Category) {
    setDeletingCategory(category)
    setDeleteDialogOpen(true)
  }

  async function handleSave() {
    if (!formData.name || !formData.slug) { toast.error('Nombre y slug son requeridos'); return }
    setSaving(true)
    try {
      const url = editingCategory ? `/api/admin/categories/${editingCategory.id}` : '/api/admin/categories'
      const method = editingCategory ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error); return }
      toast.success(editingCategory ? 'Categoría actualizada' : 'Categoría creada')
      setDialogOpen(false)
      await fetchCategories()
    } catch {
      toast.error('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deletingCategory) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/categories/${deletingCategory.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error); return }
      toast.success('Categoría eliminada')
      setDeleteDialogOpen(false)
      await fetchCategories()
    } catch {
      toast.error('Error al eliminar')
    } finally {
      setSaving(false)
    }
  }

  // Preview lucide icon
  const PreviewIcon = formData.icon ? (LucideIcons as any)[
    formData.icon.split('-').map((w: string) => w[0].toUpperCase() + w.slice(1)).join('')
  ] : null

  if (loading) return <div className="p-8"><p>Cargando categorías...</p></div>
  if (!hasPermission) return null

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter italic">Gestión de Categorías</h1>
          <p className="text-muted-foreground mt-1">Arrastra para reordenar las categorías</p>
        </div>
        <Button className="brutalist-button" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Categoría
        </Button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={categories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {categories.map((category) => (
              <SortableCategoryItem key={category.id} category={category} onEdit={openEdit} onDelete={openDelete} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {categories.length === 0 && (
        <div className="brutalist-card p-8 text-center">
          <p className="text-muted-foreground">No hay categorías. Crea la primera.</p>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="brutalist-card border-4 border-black">
          <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-tighter">
              {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="uppercase tracking-widest font-bold text-xs">Nombre *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value, slug: generateSlug(e.target.value) })}
                placeholder="Restaurantes"
                className="brutalist-input"
              />
            </div>
            <div className="space-y-2">
              <Label className="uppercase tracking-widest font-bold text-xs">Slug *</Label>
              <Input
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="restaurantes"
                className="brutalist-input"
              />
            </div>
            <div className="space-y-2">
              <Label className="uppercase tracking-widest font-bold text-xs">Ícono (nombre lucide-react)</Label>
              <div className="flex gap-2 items-center">
                <Input
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  placeholder="utensils"
                  className="brutalist-input"
                />
                {PreviewIcon && <PreviewIcon className="h-6 w-6 shrink-0" />}
              </div>
              <p className="text-xs text-muted-foreground">Ver nombres en lucide.dev</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="brutalist-button">Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="brutalist-button">
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="brutalist-card border-4 border-black">
          <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-tighter">Eliminar Categoría</DialogTitle>
          </DialogHeader>
          <p>¿Eliminar <strong>{deletingCategory?.name}</strong>? Esta acción no se puede deshacer.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} className="brutalist-button">Cancelar</Button>
            <Button onClick={handleDelete} disabled={saving} className="brutalist-button bg-destructive text-white">
              {saving ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 2: Manual test**

Navigate to `/admin/categories`:
- Click "Nueva Categoría" → dialog opens → fill name (slug auto-generates) → "Guardar" → category appears in list
- Click edit button on a category → dialog opens pre-filled → change name → "Guardar" → updated in list
- Click delete on a category with no businesses → confirms → deleted from list
- Click delete on a category with businesses → toast error "X negocio(s) usan esta categoría"

- [ ] **Step 3: Commit**

```bash
git add app/admin/categories/page.tsx
git commit -m "feat(admin): implement categories create/edit/delete dialogs"
```

---

## Task 5: Payments Page — Super Admin Cross-Community Fix

**Files:**
- Modify: `app/admin/payments/page.tsx`

- [ ] **Step 1: Refactor checkAccessAndFetch to support super admin**

Replace the `useEffect` and `fetchPayments` function logic. The key change: when `is_super_admin`, show a community selector and allow null community (= all communities).

Replace lines 54–84 (the `useEffect` block) with:

```typescript
const [isSuperAdmin, setIsSuperAdmin] = useState(false)
const [communities, setCommunities] = useState<{ id: string; name: string }[]>([])
const [selectedCommunityId, setSelectedCommunityId] = useState<string | 'all'>('all')
```

Replace the `useEffect` at lines 54–84 with:

```typescript
useEffect(() => {
  async function checkAccessAndFetch() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { redirect('/auth/login'); return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_super_admin, community_id')
      .eq('id', user.id)
      .single<{ role: string | null; is_super_admin: boolean | null; community_id: string | null }>()

    if (!profile?.is_super_admin && profile?.role !== 'admin') { redirect('/'); return }

    if (profile.is_super_admin) {
      setIsSuperAdmin(true)
      const { data: comms } = await supabase.from('communities').select('id, name').eq('is_active', true).order('name')
      setCommunities(comms || [])
      await fetchPayments(null) // null = all communities
    } else {
      setCommunityId(profile.community_id)
      await fetchPayments(profile.community_id)
    }
    setLoading(false)
  }
  checkAccessAndFetch()
}, [])
```

Replace the `fetchPayments` signature and community filter logic. In `fetchPayments(commId: string)`, change the signature to `fetchPayments(commId: string | null)` and wrap the `.eq('community_id', commId)` calls:

```typescript
async function fetchPayments(commId: string | null) {
  try {
    let subQuery = supabase
      .from('subscription_payments')
      .select(`
        id, amount, payment_method, transaction_id, payment_date, subscription_id,
        business_subscriptions!inner(
          business_id,
          businesses!inner(
            name, community_id, owner_id,
            profiles!businesses_owner_id_profiles_fkey(full_name)
          )
        )
      `)
      .order('payment_date', { ascending: false })

    if (commId) {
      subQuery = subQuery.eq('business_subscriptions.businesses.community_id', commId)
    }

    let bannerQuery = supabase
      .from('banner_ads')
      .select(`
        id, amount_paid, payment_method, approved_at, business_id,
        businesses!inner(
          name, community_id, owner_id,
          profiles!businesses_owner_id_profiles_fkey(full_name)
        )
      `)
      .eq('status', 'approved')
      .not('amount_paid', 'is', null)
      .order('approved_at', { ascending: false })

    if (commId) {
      bannerQuery = bannerQuery.eq('businesses.community_id', commId)
    }

    const [{ data: subPayments }, { data: bannerPayments }] = await Promise.all([subQuery, bannerQuery])

    // ... rest of transform logic unchanged (lines 133–178 of original)
```

Also update the second `useEffect` (filters re-fetch, line 185–189):
```typescript
useEffect(() => {
  const commId = isSuperAdmin ? (selectedCommunityId === 'all' ? null : selectedCommunityId) : communityId
  if (commId !== undefined) {
    fetchPayments(commId)
  }
}, [typeFilter, methodFilter, searchQuery, communityId, selectedCommunityId])
```

- [ ] **Step 2: Add community selector UI for super admin**

After the `<h1>` in the return JSX, add:
```tsx
{isSuperAdmin && (
  <div className="mb-6">
    <Select value={selectedCommunityId} onValueChange={(v) => setSelectedCommunityId(v)}>
      <SelectTrigger className="brutalist-input w-[280px]">
        <SelectValue placeholder="Comunidad" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todas las comunidades</SelectItem>
        {communities.map((c) => (
          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
)}
```

- [ ] **Step 3: Manual test**

Log in as super admin → navigate to `/admin/payments` → verify payments from all communities appear. Select a specific community from the dropdown → verify payments filter to that community. Stats cards update accordingly.

- [ ] **Step 4: Commit**

```bash
git add app/admin/payments/page.tsx
git commit -m "fix(admin): super admin cross-community payments view"
```

---

## Task 6: Transfer Community Ownership

**Files:**
- Create: `components/admin/community-ownership-panel.tsx`
- Modify: `app/admin/communities/[id]/page.tsx`

- [ ] **Step 1: Create the ownership panel client component**

Create `components/admin/community-ownership-panel.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { Crown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface StaffMember {
  id: string
  full_name: string | null
  avatar_url: string | null
  role: string | null
  created_at: string | null
}

interface Props {
  communityId: string
  staff: StaffMember[]
  primaryAdminId: string | null
}

export function CommunityOwnershipPanel({ communityId, staff, primaryAdminId }: Props) {
  const [currentPrimaryId, setCurrentPrimaryId] = useState<string | null>(primaryAdminId)
  const [loading, setLoading] = useState<string | null>(null)

  const admins = staff.filter((s) => s.role === 'admin')

  async function designateOwner(profileId: string) {
    setLoading(profileId)
    try {
      const res = await fetch(`/api/admin/communities/${communityId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ primary_admin_id: profileId }),
      })
      if (!res.ok) {
        const json = await res.json()
        toast.error(json.error || 'Error al designar propietario')
        return
      }
      setCurrentPrimaryId(profileId)
      toast.success('Propietario designado correctamente')
    } finally {
      setLoading(null)
    }
  }

  if (admins.length === 0) {
    return (
      <div className="brutalist-card p-6 text-center text-muted-foreground">
        No hay administradores en esta comunidad para designar como propietario.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground uppercase tracking-widest font-bold">
        Designar propietario principal
      </p>
      {admins.map((admin) => {
        const isPrimary = admin.id === currentPrimaryId
        return (
          <div key={admin.id} className="brutalist-card p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isPrimary && <Crown className="h-4 w-4 text-yellow-500" />}
              <div>
                <p className="font-bold">{admin.full_name || 'Sin nombre'}</p>
                <Badge variant="outline" className="text-xs uppercase tracking-widest">admin</Badge>
              </div>
            </div>
            {isPrimary ? (
              <Badge className="bg-yellow-500 text-black uppercase tracking-widest text-xs">Propietario</Badge>
            ) : (
              <Button
                size="sm"
                className="brutalist-button"
                disabled={loading === admin.id}
                onClick={() => designateOwner(admin.id)}
              >
                {loading === admin.id ? 'Designando...' : 'Designar Propietario'}
              </Button>
            )}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Add "Propietario" tab to community detail page**

In `app/admin/communities/[id]/page.tsx`, update the data fetch to include `primary_admin_id`:

```typescript
// Change the select on communities (line 42-46) to:
const { data: rawData, error } = await (supabase
  .from('communities')
  .select('*, primary_admin_id')
  .eq('id', id)
  .single() as any)
```

Add import:
```typescript
import { CommunityOwnershipPanel } from '@/components/admin/community-ownership-panel'
```

Add to the `community` object (after `created_at`):
```typescript
primary_admin_id: communityData.primary_admin_id || null,
```

Add a third tab in the `<TabsList>`:
```tsx
<TabsTrigger value="ownership" className="uppercase tracking-widest font-bold text-xs">
  Propietario
</TabsTrigger>
```

Add its content after the staff `<TabsContent>`:
```tsx
<TabsContent value="ownership">
  <CommunityOwnershipPanel
    communityId={id}
    staff={community.staff}
    primaryAdminId={community.primary_admin_id}
  />
</TabsContent>
```

- [ ] **Step 3: Manual test**

Navigate to `/admin/communities/{id}` → click "Propietario" tab → see list of admins → click "Designar Propietario" on one → crown badge appears and button changes to "Propietario" badge. Refresh page — state persists.

- [ ] **Step 4: Commit**

```bash
git add components/admin/community-ownership-panel.tsx app/admin/communities/\[id\]/page.tsx
git commit -m "feat(admin): transfer community ownership designation"
```

---

## Task 7: Hard Delete Communities

**Files:**
- Modify: `app/api/admin/communities/[id]/route.ts`
- Create: `components/admin/community-danger-zone.tsx`
- Modify: `app/admin/communities/[id]/page.tsx`

- [ ] **Step 1: Extend DELETE endpoint to support permanent deletion**

In `app/api/admin/communities/[id]/route.ts`, replace the `DELETE` handler with:

```typescript
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('is_super_admin').eq('id', user.id).single<{ is_super_admin: boolean }>()

  if (!profile?.is_super_admin) {
    return NextResponse.json({ error: 'Forbidden - Super admin only' }, { status: 403 })
  }

  const url = new URL(request.url)
  const permanent = url.searchParams.get('permanent') === 'true'

  if (permanent) {
    // Safety check: block if community has associated data
    const [{ count: bizCount }, { count: userCount }, { count: postCount }] = await Promise.all([
      supabase.from('businesses').select('id', { count: 'exact', head: true }).eq('community_id', id),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('community_id', id),
      supabase.from('community_posts').select('id', { count: 'exact', head: true }).eq('community_id', id),
    ])

    if ((bizCount ?? 0) > 0 || (userCount ?? 0) > 0 || (postCount ?? 0) > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar: ${bizCount} negocio(s), ${userCount} usuario(s), ${postCount} publicación(es)` },
        { status: 409 }
      )
    }

    const { error } = await supabase.from('communities').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await logAuditAction({ action: 'delete_community', entityType: 'community', entityId: id })
    return NextResponse.json({ success: true })
  }

  // Soft delete (existing behavior)
  const { error } = await (supabase as any).from('communities').update({ is_active: false }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await logAuditAction({ action: 'archive_community', entityType: 'community', entityId: id })
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: Create the danger zone client component**

Create `components/admin/community-danger-zone.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'

interface Props {
  communityId: string
  communitySlug: string
  isActive: boolean
}

export function CommunityDangerZone({ communityId, communitySlug, isActive }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [confirmSlug, setConfirmSlug] = useState('')
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  if (isActive) return null

  async function handlePermanentDelete() {
    if (confirmSlug !== communitySlug) {
      toast.error('El slug no coincide')
      return
    }
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/communities/${communityId}?permanent=true`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error); return }
      toast.success('Comunidad eliminada permanentemente')
      router.push('/admin/communities')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="brutalist-card border-destructive p-6 space-y-4">
      <h3 className="font-black uppercase tracking-tighter text-destructive">Zona de Peligro</h3>
      <p className="text-sm text-muted-foreground">
        Esta comunidad está archivada. Puedes eliminarla permanentemente si no tiene datos asociados.
      </p>
      <Button
        variant="destructive"
        className="brutalist-button"
        onClick={() => setDialogOpen(true)}
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Eliminar Permanentemente
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="brutalist-card border-4 border-destructive">
          <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-tighter text-destructive">
              Confirmar Eliminación
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm">
            Esta acción es <strong>irreversible</strong>. Escribe el slug <code className="font-mono bg-muted px-1">{communitySlug}</code> para confirmar.
          </p>
          <Input
            value={confirmSlug}
            onChange={(e) => setConfirmSlug(e.target.value)}
            placeholder={communitySlug}
            className="brutalist-input font-mono"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="brutalist-button">Cancelar</Button>
            <Button
              variant="destructive"
              className="brutalist-button"
              disabled={confirmSlug !== communitySlug || deleting}
              onClick={handlePermanentDelete}
            >
              {deleting ? 'Eliminando...' : 'Eliminar Para Siempre'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 3: Add CommunityDangerZone to community detail page**

In `app/admin/communities/[id]/page.tsx`, add import:
```typescript
import { CommunityDangerZone } from '@/components/admin/community-danger-zone'
```

After the closing `</Tabs>` tag, add:
```tsx
<CommunityDangerZone
  communityId={id}
  communitySlug={community.slug}
  isActive={community.is_active ?? false}
/>
```

- [ ] **Step 4: Manual test**

Archive a test community (set `is_active = false` in Supabase dashboard). Navigate to its detail page → "Zona de Peligro" section appears → click "Eliminar Permanentemente" → dialog opens → type wrong slug → button stays disabled → type correct slug → button enables → click → redirected to communities list.

For a community with data: the API should return the 409 error with a count message.

- [ ] **Step 5: Commit**

```bash
git add app/api/admin/communities/\[id\]/route.ts components/admin/community-danger-zone.tsx app/admin/communities/\[id\]/page.tsx
git commit -m "feat(admin): hard delete archived communities with safety check"
```

---

## Task 8: Quick-Access Links + community_id Filtering

**Files:**
- Create: `components/admin/community-quick-actions.tsx`
- Modify: `app/admin/communities/[id]/page.tsx`
- Modify: `app/admin/businesses/page.tsx`
- Modify: `app/admin/users/page.tsx`
- Modify: `app/admin/alerts/page.tsx`
- Modify: `app/admin/marketplace/page.tsx`

- [ ] **Step 1: Create the quick-actions card component**

Create `components/admin/community-quick-actions.tsx`:

```typescript
import Link from 'next/link'
import { Building2, Users, Bell, ShoppingBag, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  communityId: string
}

const actions = [
  { label: 'Ver Negocios',    href: '/admin/businesses',  icon: Building2 },
  { label: 'Ver Usuarios',    href: '/admin/users',       icon: Users },
  { label: 'Ver Alertas',     href: '/admin/alerts',      icon: Bell },
  { label: 'Ver Marketplace', href: '/admin/marketplace', icon: ShoppingBag },
  { label: 'Ver Estadísticas',href: '/admin/statistics',  icon: BarChart3 },
]

export function CommunityQuickActions({ communityId }: Props) {
  return (
    <div className="brutalist-card p-6 space-y-4">
      <h3 className="font-black uppercase tracking-widest text-xs">Acceso Rápido</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {actions.map(({ label, href, icon: Icon }) => (
          <Link key={href} href={`${href}?community_id=${communityId}`}>
            <Button variant="outline" className="brutalist-button w-full justify-start gap-2">
              <Icon className="h-4 w-4" />
              <span className="uppercase tracking-widest text-xs font-bold">{label}</span>
            </Button>
          </Link>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add to community detail page**

In `app/admin/communities/[id]/page.tsx`, add import:
```typescript
import { CommunityQuickActions } from '@/components/admin/community-quick-actions'
```

Add before the `<Tabs>` block:
```tsx
<CommunityQuickActions communityId={id} />
```

- [ ] **Step 3: Update businesses page to respect community_id searchParam**

In `app/admin/businesses/page.tsx`, add the `useSearchParams` import and hook:
```typescript
import { useSearchParams } from 'next/navigation'
// inside component:
const searchParams = useSearchParams()
const communityIdParam = searchParams.get('community_id')
```

In `fetchBusinesses`, replace the profile community_id guard (lines 46–54) with:
```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('community_id, is_super_admin')
  .eq('id', user.id)
  .single<{ community_id: string | null; is_super_admin: boolean | null }>()

// Determine which community to filter by
const effectiveCommunityId = profile?.is_super_admin
  ? communityIdParam  // null = all, string = filtered
  : profile?.community_id

let query = supabase
  .from('businesses')
  .select('id, name, status, created_at, featured_requested, deletion_requested, deletion_reason, categories(name), profiles!businesses_owner_id_profiles_fkey(full_name)')
  .order('created_at', { ascending: false })

if (effectiveCommunityId) {
  query = query.eq('community_id', effectiveCommunityId)
}
```

Remove the early return that blocks when `!profile?.community_id`.

- [ ] **Step 4: Update users page to respect community_id searchParam**

In `app/admin/users/page.tsx`, add `useSearchParams` and apply the same pattern:
```typescript
import { useSearchParams } from 'next/navigation'
const searchParams = useSearchParams()
const communityIdParam = searchParams.get('community_id')
```

In the user fetch logic, find where `community_id` filter is applied and update to:
```typescript
// If super admin with a community_id param, scope to that community
if (!currentProfile?.is_super_admin && currentProfile?.community_id) {
  query = query.eq('community_id', currentProfile.community_id)
} else if (currentProfile?.is_super_admin && communityIdParam) {
  query = query.eq('community_id', communityIdParam)
}
```

- [ ] **Step 5: Update alerts page to respect community_id searchParam**

In `app/admin/alerts/page.tsx`, the `fetchData` function fetches all alerts for all communities already. Add scoping for super admin with param:

At the top of the component:
```typescript
import { useSearchParams } from 'next/navigation'
const searchParams = useSearchParams()
const communityIdParam = searchParams.get('community_id')
```

In `fetchData`, add a filter to the `public_services` fetch:
```typescript
let alertQuery = supabase.from('community_alerts').select('*, communities(name, slug)').order('created_at', { ascending: false })
if (communityIdParam) {
  alertQuery = alertQuery.eq('community_id', communityIdParam)
}
const alertsRes = await alertQuery
```

(Apply the same pattern to the communities dropdown pre-selection if communityIdParam is set.)

- [ ] **Step 6: Update marketplace page to respect community_id searchParam**

In `app/admin/marketplace/page.tsx`, apply the same `useSearchParams` + `communityIdParam` filter pattern on the classifieds query.

- [ ] **Step 7: Manual test**

Navigate to `/admin/communities/{id}` → click "Ver Negocios" → businesses page loads filtered to that community (URL shows `?community_id={id}`). Verify same for Users, Alerts, Marketplace, Statistics links.

- [ ] **Step 8: Commit**

```bash
git add components/admin/community-quick-actions.tsx app/admin/communities/\[id\]/page.tsx app/admin/businesses/page.tsx app/admin/users/page.tsx app/admin/alerts/page.tsx app/admin/marketplace/page.tsx
git commit -m "feat(admin): community quick-access links + community_id filter on admin pages"
```

---

## Task 9: Platform Settings Page

**Files:**
- Create: `app/api/admin/platform/settings/route.ts`
- Create: `app/admin/platform/settings/page.tsx`

- [ ] **Step 1: Create the API route**

Create `app/api/admin/platform/settings/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function requireSuperAdmin(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const { data: profile } = await supabase.from('profiles').select('is_super_admin').eq('id', user.id).single()
  if (!profile?.is_super_admin) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  return { userId: user.id }
}

export async function GET() {
  const supabase = await createClient()
  const check = await requireSuperAdmin(supabase)
  if (check.error) return check.error

  const { data, error } = await supabase.from('platform_config').select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ config: data })
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const check = await requireSuperAdmin(supabase)
  if (check.error) return check.error

  const body = await request.json()
  const allowed = ['platform_name', 'support_email', 'support_phone', 'marketplace_enabled', 'community_posts_enabled', 'new_registrations_open', 'max_businesses_per_community']
  const updates: Record<string, any> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }
  updates.updated_at = new Date().toISOString()
  updates.updated_by = check.userId

  const { data, error } = await supabase.from('platform_config').update(updates).neq('id', '').select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ config: data })
}
```

- [ ] **Step 2: Create the settings page**

Create `app/admin/platform/settings/page.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Breadcrumbs } from '@/components/shared/breadcrumbs'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface PlatformConfig {
  id: string
  platform_name: string
  support_email: string | null
  support_phone: string | null
  marketplace_enabled: boolean
  community_posts_enabled: boolean
  new_registrations_open: boolean
  max_businesses_per_community: number | null
  updated_at: string | null
}

export default function PlatformSettingsPage() {
  const [config, setConfig] = useState<PlatformConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/admin/platform/settings')
      .then((r) => r.json())
      .then(({ config }) => { setConfig(config); setLoading(false) })
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!config) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/platform/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error); return }
      setConfig(json.config)
      toast.success('Configuración guardada')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8" /></div>
  if (!config) return null

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-8">
      <Breadcrumbs items={[{ label: 'Admin', href: '/admin' }, { label: 'Plataforma' }, { label: 'Configuración', active: true }]} />
      <h1 className="text-3xl font-black uppercase tracking-tighter italic">Configuración de la Plataforma</h1>

      <form onSubmit={handleSave} className="brutalist-card p-8 space-y-6">
        <div className="space-y-2">
          <Label className="uppercase tracking-widest font-bold text-xs">Nombre de la Plataforma</Label>
          <Input value={config.platform_name} onChange={(e) => setConfig({ ...config, platform_name: e.target.value })} className="brutalist-input" />
        </div>
        <div className="space-y-2">
          <Label className="uppercase tracking-widest font-bold text-xs">Email de Soporte</Label>
          <Input type="email" value={config.support_email || ''} onChange={(e) => setConfig({ ...config, support_email: e.target.value })} className="brutalist-input" />
        </div>
        <div className="space-y-2">
          <Label className="uppercase tracking-widest font-bold text-xs">Teléfono de Soporte</Label>
          <Input value={config.support_phone || ''} onChange={(e) => setConfig({ ...config, support_phone: e.target.value })} className="brutalist-input" />
        </div>
        <div className="space-y-2">
          <Label className="uppercase tracking-widest font-bold text-xs">Máx. Negocios por Comunidad</Label>
          <Input type="number" value={config.max_businesses_per_community ?? ''} onChange={(e) => setConfig({ ...config, max_businesses_per_community: e.target.value ? parseInt(e.target.value) : null })} className="brutalist-input" placeholder="Sin límite" />
        </div>

        <div className="border-t-2 border-black pt-4 space-y-4">
          <p className="uppercase tracking-widest font-black text-xs">Funciones Activas</p>
          {[
            { key: 'marketplace_enabled', label: 'Marketplace' },
            { key: 'community_posts_enabled', label: 'Publicaciones Comunitarias' },
            { key: 'new_registrations_open', label: 'Registro de Nuevos Negocios' },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <Label className="uppercase tracking-widest font-bold text-xs">{label}</Label>
              <Switch
                checked={(config as any)[key]}
                onCheckedChange={(v) => setConfig({ ...config, [key]: v })}
              />
            </div>
          ))}
        </div>

        {config.updated_at && (
          <p className="text-xs text-muted-foreground">Última actualización: {new Date(config.updated_at).toLocaleString('es-CO')}</p>
        )}

        <Button type="submit" disabled={saving} className="brutalist-button w-full">
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: Manual test**

Navigate to `/admin/platform/settings` → form loads with current config → change platform name → Save → toast appears → refresh → name persists.

- [ ] **Step 4: Commit**

```bash
git add app/api/admin/platform/settings/ app/admin/platform/settings/
git commit -m "feat(admin): platform-wide settings page"
```

---

## Task 10: Platform Policies Page

**Files:**
- Create: `app/api/admin/platform/policies/route.ts`
- Create: `app/api/admin/platform/policies/[type]/route.ts`
- Create: `app/admin/platform/policies/page.tsx`

- [ ] **Step 1: Create API routes**

Create `app/api/admin/platform/policies/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase.from('platform_policies').select('*').order('type')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ policies: data })
}
```

Create `app/api/admin/platform/policies/[type]/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('is_super_admin').eq('id', user.id).single()
  if (!profile?.is_super_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { content } = await request.json()
  const { data, error } = await supabase
    .from('platform_policies')
    .update({ content, updated_at: new Date().toISOString(), updated_by: user.id })
    .eq('type', type)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ policy: data })
}
```

- [ ] **Step 2: Create the policies page**

Create `app/admin/platform/policies/page.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Breadcrumbs } from '@/components/shared/breadcrumbs'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface Policy {
  id: string
  type: string
  title: string
  content: string
  updated_at: string | null
}

export default function PlatformPoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, string>>({})

  useEffect(() => {
    fetch('/api/admin/platform/policies')
      .then((r) => r.json())
      .then(({ policies }) => {
        setPolicies(policies || [])
        const initial: Record<string, string> = {}
        for (const p of policies || []) initial[p.type] = p.content
        setDrafts(initial)
        setLoading(false)
      })
  }, [])

  async function handleSave(type: string) {
    setSaving(type)
    try {
      const res = await fetch(`/api/admin/platform/policies/${type}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: drafts[type] }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error); return }
      setPolicies((prev) => prev.map((p) => p.type === type ? { ...p, ...json.policy } : p))
      toast.success('Política guardada')
    } finally {
      setSaving(null)
    }
  }

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8" /></div>

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <Breadcrumbs items={[{ label: 'Admin', href: '/admin' }, { label: 'Plataforma' }, { label: 'Políticas', active: true }]} />
      <h1 className="text-3xl font-black uppercase tracking-tighter italic">Políticas de la Plataforma</h1>

      <Tabs defaultValue={policies[0]?.type}>
        <TabsList className="brutalist-card inline-flex flex-wrap">
          {policies.map((p) => (
            <TabsTrigger key={p.type} value={p.type} className="uppercase tracking-widest font-bold text-xs">
              {p.title}
            </TabsTrigger>
          ))}
        </TabsList>

        {policies.map((policy) => (
          <TabsContent key={policy.type} value={policy.type} className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-3">
                <p className="uppercase tracking-widest font-bold text-xs">Editor (Markdown)</p>
                <Textarea
                  value={drafts[policy.type] || ''}
                  onChange={(e) => setDrafts({ ...drafts, [policy.type]: e.target.value })}
                  rows={20}
                  className="brutalist-input font-mono text-sm"
                  placeholder="Escribe el contenido en markdown..."
                />
                {policy.updated_at && (
                  <p className="text-xs text-muted-foreground">
                    Última actualización: {new Date(policy.updated_at).toLocaleString('es-CO')}
                  </p>
                )}
                <Button
                  onClick={() => handleSave(policy.type)}
                  disabled={saving === policy.type}
                  className="brutalist-button w-full"
                >
                  {saving === policy.type ? 'Guardando...' : 'Guardar'}
                </Button>
              </div>
              <div className="space-y-3">
                <p className="uppercase tracking-widest font-bold text-xs">Vista Previa</p>
                <div className="brutalist-card p-4 prose prose-sm max-w-none min-h-[200px] overflow-auto">
                  <pre className="whitespace-pre-wrap text-sm font-sans">{drafts[policy.type] || <span className="text-muted-foreground italic">Sin contenido</span>}</pre>
                </div>
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
```

- [ ] **Step 3: Manual test**

Navigate to `/admin/platform/policies` → 4 tabs appear (Términos, Privacidad, Contenido, Normas) → type in the editor → preview updates → click Guardar → toast → refresh → content persists.

- [ ] **Step 4: Commit**

```bash
git add app/api/admin/platform/policies/ app/admin/platform/policies/
git commit -m "feat(admin): platform policies editor page"
```

---

## Task 11: Platform Payment Settings Page

**Files:**
- Create: `app/api/admin/platform/payments/route.ts`
- Create: `app/api/admin/platform/payments/[gateway]/route.ts`
- Create: `app/admin/platform/payments/page.tsx`

- [ ] **Step 1: Create API routes**

Create `app/api/admin/platform/payments/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('is_super_admin').eq('id', user.id).single()
  if (!profile?.is_super_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supabase.from('platform_payment_config').select('*').order('gateway')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Mask sensitive keys before sending to client
  const masked = (data || []).map((g) => ({
    ...g,
    private_key: g.private_key ? `...${g.private_key.slice(-4)}` : null,
    webhook_secret: g.webhook_secret ? `...${g.webhook_secret.slice(-4)}` : null,
  }))
  return NextResponse.json({ gateways: masked })
}
```

Create `app/api/admin/platform/payments/[gateway]/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ gateway: string }> }
) {
  const { gateway } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('is_super_admin').eq('id', user.id).single()
  if (!profile?.is_super_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const allowed = ['is_enabled', 'environment', 'public_key', 'private_key', 'webhook_secret', 'account_identifier', 'commission_rate']
  const updates: Record<string, any> = { updated_at: new Date().toISOString(), updated_by: user.id }

  for (const key of allowed) {
    if (key in body) {
      // Skip masked placeholder values (user didn't change the secret)
      if (typeof body[key] === 'string' && body[key].startsWith('...')) continue
      updates[key] = body[key]
    }
  }

  const { data, error } = await supabase
    .from('platform_payment_config')
    .update(updates)
    .eq('gateway', gateway)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ gateway: data })
}
```

- [ ] **Step 2: Create the payment settings page**

Create `app/admin/platform/payments/page.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Breadcrumbs } from '@/components/shared/breadcrumbs'
import { toast } from 'sonner'
import { Loader2, AlertTriangle } from 'lucide-react'

interface GatewayConfig {
  id: string
  gateway: string
  is_enabled: boolean
  environment: string
  public_key: string | null
  private_key: string | null
  webhook_secret: string | null
  account_identifier: string | null
  commission_rate: number
  updated_at: string | null
}

const GATEWAY_LABELS: Record<string, string> = {
  wompi: 'Wompi',
  nequi: 'Nequi',
  mercadopago: 'MercadoPago',
}

export default function PlatformPaymentsPage() {
  const [gateways, setGateways] = useState<GatewayConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [drafts, setDrafts] = useState<Record<string, Partial<GatewayConfig>>>({})
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/platform/payments')
      .then((r) => r.json())
      .then(({ gateways }) => {
        setGateways(gateways || [])
        const initial: Record<string, Partial<GatewayConfig>> = {}
        for (const g of gateways || []) initial[g.gateway] = { ...g }
        setDrafts(initial)
        setLoading(false)
      })
  }, [])

  function updateDraft(gateway: string, field: string, value: any) {
    setDrafts((prev) => ({ ...prev, [gateway]: { ...prev[gateway], [field]: value } }))
  }

  async function handleSave(gateway: string) {
    setSaving(gateway)
    try {
      const res = await fetch(`/api/admin/platform/payments/${gateway}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(drafts[gateway]),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error); return }
      toast.success(`${GATEWAY_LABELS[gateway]} actualizado`)
    } finally {
      setSaving(null)
    }
  }

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8" /></div>

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8">
      <Breadcrumbs items={[{ label: 'Admin', href: '/admin' }, { label: 'Plataforma' }, { label: 'Pagos', active: true }]} />
      <h1 className="text-3xl font-black uppercase tracking-tighter italic">Pasarelas de Pago</h1>

      <div className="brutalist-card p-4 flex gap-3 border-yellow-500 bg-yellow-50">
        <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
        <p className="text-sm text-yellow-800">
          Las claves privadas se almacenan en la base de datos con RLS. Para producción, migrar a Supabase Vault.
        </p>
      </div>

      <Tabs defaultValue={gateways[0]?.gateway}>
        <TabsList className="brutalist-card inline-flex">
          {gateways.map((g) => (
            <TabsTrigger key={g.gateway} value={g.gateway} className="uppercase tracking-widest font-bold text-xs">
              {GATEWAY_LABELS[g.gateway]}
              {drafts[g.gateway]?.is_enabled && <Badge className="ml-2 bg-green-500 text-white text-[10px]">ON</Badge>}
            </TabsTrigger>
          ))}
        </TabsList>

        {gateways.map((g) => {
          const d = drafts[g.gateway] || g
          return (
            <TabsContent key={g.gateway} value={g.gateway}>
              <div className="brutalist-card p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <Label className="uppercase tracking-widest font-bold text-xs">Habilitado</Label>
                  <Switch checked={!!d.is_enabled} onCheckedChange={(v) => updateDraft(g.gateway, 'is_enabled', v)} />
                </div>

                <div className="space-y-2">
                  <Label className="uppercase tracking-widest font-bold text-xs">Entorno</Label>
                  <Select value={d.environment || 'test'} onValueChange={(v) => updateDraft(g.gateway, 'environment', v)}>
                    <SelectTrigger className="brutalist-input"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="test">Test</SelectItem>
                      <SelectItem value="production">Producción</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {g.gateway !== 'nequi' && (
                  <div className="space-y-2">
                    <Label className="uppercase tracking-widest font-bold text-xs">Clave Pública</Label>
                    <Input value={d.public_key || ''} onChange={(e) => updateDraft(g.gateway, 'public_key', e.target.value)} className="brutalist-input font-mono" />
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="uppercase tracking-widest font-bold text-xs">
                    {g.gateway === 'nequi' ? 'Número de Cuenta' : 'Clave Privada'}
                  </Label>
                  <Input
                    value={g.gateway === 'nequi' ? (d.account_identifier || '') : (d.private_key || '')}
                    onChange={(e) => updateDraft(g.gateway, g.gateway === 'nequi' ? 'account_identifier' : 'private_key', e.target.value)}
                    className="brutalist-input font-mono"
                    placeholder={g.gateway === 'nequi' ? '+57 300...' : '••••••••'}
                  />
                </div>

                {g.gateway !== 'nequi' && (
                  <div className="space-y-2">
                    <Label className="uppercase tracking-widest font-bold text-xs">Webhook Secret</Label>
                    <Input value={d.webhook_secret || ''} onChange={(e) => updateDraft(g.gateway, 'webhook_secret', e.target.value)} className="brutalist-input font-mono" />
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="uppercase tracking-widest font-bold text-xs">Tasa de Comisión (%)</Label>
                  <Input
                    type="number" step="0.01" min="0" max="100"
                    value={d.commission_rate ? (Number(d.commission_rate) * 100).toFixed(2) : '3.00'}
                    onChange={(e) => updateDraft(g.gateway, 'commission_rate', parseFloat(e.target.value) / 100)}
                    className="brutalist-input"
                  />
                </div>

                {g.updated_at && (
                  <p className="text-xs text-muted-foreground">Actualizado: {new Date(g.updated_at).toLocaleString('es-CO')}</p>
                )}

                <Button onClick={() => handleSave(g.gateway)} disabled={saving === g.gateway} className="brutalist-button w-full">
                  {saving === g.gateway ? 'Guardando...' : `Guardar ${GATEWAY_LABELS[g.gateway]}`}
                </Button>
              </div>
            </TabsContent>
          )
        })}
      </Tabs>
    </div>
  )
}
```

- [ ] **Step 3: Manual test**

Navigate to `/admin/platform/payments` → 3 gateway tabs → toggle Wompi enabled → enter a test public key → Save → toast. Refresh → enabled toggle persists. Private key shows masked value from DB (`...XXXX`).

- [ ] **Step 4: Commit**

```bash
git add app/api/admin/platform/payments/ app/admin/platform/payments/
git commit -m "feat(admin): platform payment gateway settings page"
```

---

## Task 12: Service Categories Management + Services Form Update

**Files:**
- Create: `app/api/admin/platform/service-categories/route.ts`
- Create: `app/api/admin/platform/service-categories/[id]/route.ts`
- Create: `app/admin/platform/service-categories/page.tsx`
- Modify: `app/admin/services/page.tsx`
- Modify: `lib/types/index.ts`

- [ ] **Step 1: Create API routes**

Create `app/api/admin/platform/service-categories/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function requireSuperAdmin(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const { data: p } = await supabase.from('profiles').select('is_super_admin').eq('id', user.id).single()
  if (!p?.is_super_admin) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  return { userId: user.id }
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase.from('service_categories').select('*').order('sort_order')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ categories: data })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const check = await requireSuperAdmin(supabase)
  if (check.error) return check.error

  const { name, slug, icon, sort_order } = await request.json()
  if (!name || !slug) return NextResponse.json({ error: 'name y slug son requeridos' }, { status: 400 })

  const { data, error } = await supabase
    .from('service_categories')
    .insert({ name, slug, icon: icon || 'circle', sort_order: sort_order ?? 99 })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ category: data }, { status: 201 })
}
```

Create `app/api/admin/platform/service-categories/[id]/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: p } = await supabase.from('profiles').select('is_super_admin').eq('id', user.id).single()
  if (!p?.is_super_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name, slug, icon, sort_order } = await request.json()
  const { data, error } = await supabase
    .from('service_categories').update({ name, slug, icon, sort_order }).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ category: data })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: p } = await supabase.from('profiles').select('is_super_admin').eq('id', user.id).single()
  if (!p?.is_super_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { count } = await supabase
    .from('public_services').select('id', { count: 'exact', head: true }).eq('service_category_id', id)

  if ((count ?? 0) > 0) {
    return NextResponse.json({ error: `No se puede eliminar: ${count} servicio(s) usan esta categoría` }, { status: 409 })
  }

  const { error } = await supabase.from('service_categories').update({ is_active: false }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: Create the service categories management page**

Create `app/admin/platform/service-categories/page.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import * as LucideIcons from 'lucide-react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Breadcrumbs } from '@/components/shared/breadcrumbs'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface ServiceCategory {
  id: string
  name: string
  slug: string
  icon: string
  sort_order: number
  is_active: boolean
}

function generateSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function SortableRow({ cat, onEdit, onDelete }: { cat: ServiceCategory; onEdit: (c: ServiceCategory) => void; onDelete: (c: ServiceCategory) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: cat.id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const Icon = (LucideIcons as any)[cat.icon.split('-').map((w: string) => w[0].toUpperCase() + w.slice(1)).join('')] || LucideIcons.Circle

  return (
    <div ref={setNodeRef} style={style} className="brutalist-card p-4 flex items-center gap-3">
      <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground">
        <GripVertical className="h-4 w-4" />
      </button>
      <Icon className="h-5 w-5 shrink-0" />
      <div className="flex-1">
        <p className="font-bold uppercase tracking-wider text-sm">{cat.name}</p>
        <p className="text-xs text-muted-foreground font-mono">{cat.slug}</p>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="brutalist-button" onClick={() => onEdit(cat)}><Pencil className="h-3 w-3" /></Button>
        <Button size="sm" variant="outline" className="brutalist-button text-destructive" onClick={() => onDelete(cat)}><Trash2 className="h-3 w-3" /></Button>
      </div>
    </div>
  )
}

export default function ServiceCategoriesPage() {
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ServiceCategory | null>(null)
  const [deleting, setDeleting] = useState<ServiceCategory | null>(null)
  const [formData, setFormData] = useState({ name: '', slug: '', icon: 'circle' })
  const [saving, setSaving] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  async function fetchCategories() {
    const res = await fetch('/api/admin/platform/service-categories')
    const { categories } = await res.json()
    setCategories((categories || []).filter((c: ServiceCategory) => c.is_active))
    setLoading(false)
  }

  useEffect(() => { fetchCategories() }, [])

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = categories.findIndex((c) => c.id === active.id)
    const newIdx = categories.findIndex((c) => c.id === over.id)
    const reordered = arrayMove(categories, oldIdx, newIdx)
    setCategories(reordered)
    // Persist sort_order via batch PATCH
    await Promise.all(reordered.map((c, i) =>
      fetch(`/api/admin/platform/service-categories/${c.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...c, sort_order: i + 1 }),
      })
    ))
  }

  function openCreate() {
    setEditing(null)
    setFormData({ name: '', slug: '', icon: 'circle' })
    setDialogOpen(true)
  }

  function openEdit(cat: ServiceCategory) {
    setEditing(cat)
    setFormData({ name: cat.name, slug: cat.slug, icon: cat.icon })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!formData.name || !formData.slug) { toast.error('Nombre y slug son requeridos'); return }
    setSaving(true)
    try {
      const url = editing ? `/api/admin/platform/service-categories/${editing.id}` : '/api/admin/platform/service-categories'
      const method = editing ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error); return }
      toast.success(editing ? 'Categoría actualizada' : 'Categoría creada')
      setDialogOpen(false)
      await fetchCategories()
    } finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!deleting) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/platform/service-categories/${deleting.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error); return }
      toast.success('Categoría desactivada')
      setDeleteDialogOpen(false)
      await fetchCategories()
    } finally { setSaving(false) }
  }

  const PreviewIcon = formData.icon ? (LucideIcons as any)[formData.icon.split('-').map((w: string) => w[0].toUpperCase() + w.slice(1)).join('')] : null

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8" /></div>

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8">
      <Breadcrumbs items={[{ label: 'Admin', href: '/admin' }, { label: 'Plataforma' }, { label: 'Cat. Servicios', active: true }]} />
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-black uppercase tracking-tighter italic">Categorías de Servicios</h1>
        <Button className="brutalist-button" onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Nueva</Button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={categories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {categories.map((cat) => <SortableRow key={cat.id} cat={cat} onEdit={openEdit} onDelete={(c) => { setDeleting(c); setDeleteDialogOpen(true) }} />)}
          </div>
        </SortableContext>
      </DndContext>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="brutalist-card border-4 border-black">
          <DialogHeader><DialogTitle className="font-black uppercase tracking-tighter">{editing ? 'Editar' : 'Nueva'} Categoría</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="uppercase tracking-widest font-bold text-xs">Nombre *</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value, slug: generateSlug(e.target.value) })} className="brutalist-input" />
            </div>
            <div className="space-y-2">
              <Label className="uppercase tracking-widest font-bold text-xs">Slug *</Label>
              <Input value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} className="brutalist-input" />
            </div>
            <div className="space-y-2">
              <Label className="uppercase tracking-widest font-bold text-xs">Ícono (lucide-react)</Label>
              <div className="flex gap-2 items-center">
                <Input value={formData.icon} onChange={(e) => setFormData({ ...formData, icon: e.target.value })} placeholder="siren" className="brutalist-input" />
                {PreviewIcon && <PreviewIcon className="h-6 w-6 shrink-0" />}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="brutalist-button">Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="brutalist-button">{saving ? 'Guardando...' : 'Guardar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="brutalist-card border-4 border-black">
          <DialogHeader><DialogTitle className="font-black uppercase tracking-tighter">Desactivar Categoría</DialogTitle></DialogHeader>
          <p>¿Desactivar <strong>{deleting?.name}</strong>? Los servicios existentes mantendrán su categoría.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} className="brutalist-button">Cancelar</Button>
            <Button onClick={handleDelete} disabled={saving} className="brutalist-button bg-destructive text-white">{saving ? 'Desactivando...' : 'Desactivar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 3: Update services form to use dynamic service categories**

In `app/admin/services/page.tsx`, the form state uses `category: 'emergency' as ServiceCategory`. Update to use a dynamic list.

Add state:
```typescript
const [serviceCategories, setServiceCategories] = useState<{ id: string; name: string; slug: string }[]>([])
```

In `fetchData()`, add:
```typescript
const { data: cats } = await supabase.from('service_categories').select('id, name, slug').eq('is_active', true).order('sort_order')
setServiceCategories(cats || [])
```

Update form state initial value:
```typescript
const [formData, setFormData] = useState({
  community_id: '',
  service_category_id: '',  // replaces category
  name: '',
  description: '',
  phone: '',
  address: '',
  hours: '',
  is_active: true,
  sort_order: 10
})
```

Replace the hardcoded category `<Select>` in the form with:
```tsx
<Select value={formData.service_category_id} onValueChange={(v) => setFormData({ ...formData, service_category_id: v })}>
  <SelectTrigger className="brutalist-input w-full">
    <SelectValue placeholder="Seleccionar categoría" />
  </SelectTrigger>
  <SelectContent>
    {serviceCategories.map((cat) => (
      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
    ))}
  </SelectContent>
</Select>
```

Update the submit body to use `service_category_id` instead of `category`.

- [ ] **Step 4: Update ServiceCategory type in lib/types/index.ts**

In `lib/types/index.ts`, replace the `ServiceCategory` type:
```typescript
// Old: export type ServiceCategory = 'emergency' | 'health' | 'government' | 'transport' | 'utilities'
// New: dynamic from service_categories table — keep string for backward compat:
export type ServiceCategory = string
```

- [ ] **Step 5: Manual test**

Navigate to `/admin/platform/service-categories` → 5 categories loaded → drag to reorder → add new one → edit → soft-delete with confirmation. Navigate to `/admin/services` → category dropdown shows categories from DB (not hardcoded).

- [ ] **Step 6: Commit**

```bash
git add app/api/admin/platform/service-categories/ app/admin/platform/service-categories/ app/admin/services/page.tsx lib/types/index.ts
git commit -m "feat(admin): global service categories management + dynamic services form"
```

---

## Task 13: Statistics — Community Selector + Comparativa Tab

**Files:**
- Modify: `app/admin/statistics/page.tsx`

- [ ] **Step 1: Add community selector state and communities fetch**

In `app/admin/statistics/page.tsx`, add after the existing state declarations:

```typescript
const [isSuperAdmin, setIsSuperAdmin] = useState(false)
const [communities, setCommunities] = useState<{ id: string; name: string }[]>([])
const [selectedCommunityId, setSelectedCommunityId] = useState<string | 'all'>('all')
const [communityStats, setCommunityStats] = useState<any[]>([])
```

In the `fetchStatistics` function, after the profile fetch, add:
```typescript
if (profile?.is_super_admin) {
  setIsSuperAdmin(true)
  const { data: comms } = await supabase.from('communities').select('id, name').eq('is_active', true).order('name')
  setCommunities(comms || [])
}
```

- [ ] **Step 2: Scope all stats queries to selected community when super admin**

In `fetchStatistics`, find the conditional community_id filter block and update:
```typescript
// Existing check: if (!profile?.is_super_admin && profile?.community_id)
// Replace with:
const effectiveCommunityId = profile?.is_super_admin
  ? (selectedCommunityId === 'all' ? null : selectedCommunityId)
  : profile?.community_id

if (effectiveCommunityId) {
  query = query.eq('community_id', effectiveCommunityId)
}
```

Add `selectedCommunityId` to the `useEffect` dependency array so stats re-fetch on community change.

- [ ] **Step 3: Add community selector UI and Comparativa tab**

At the top of the return JSX (before stats cards), add:
```tsx
{isSuperAdmin && (
  <div className="mb-6 flex gap-4 items-center">
    <Select value={selectedCommunityId} onValueChange={(v) => setSelectedCommunityId(v)}>
      <SelectTrigger className="brutalist-input w-[280px]">
        <SelectValue placeholder="Comunidad" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todas las comunidades</SelectItem>
        {communities.map((c) => (
          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
    {selectedCommunityId !== 'all' && (
      <Button variant="outline" size="sm" className="brutalist-button" onClick={() => setSelectedCommunityId('all')}>
        Ver todas
      </Button>
    )}
  </div>
)}
```

Add a "Comparativa" tab for super admin. After fetching stats, add a `fetchComparativeStats` function:
```typescript
async function fetchComparativeStats() {
  if (!isSuperAdmin) return
  const { data: comms } = await supabase.from('communities').select('id, name').eq('is_active', true)
  if (!comms) return

  const statsPerCommunity = await Promise.all(
    comms.map(async (c) => {
      const { data: s } = await (supabase as any).rpc('get_community_stats', { community_uuid: c.id })
      return { community: c.name, ...(s?.[0] || {}) }
    })
  )
  setCommunityStats(statsPerCommunity)
}
```

Call `fetchComparativeStats()` inside the `useEffect` when `isSuperAdmin` is true.

Add the Comparativa tab content (wrap existing content in a tab, and add a new tab):
```tsx
{isSuperAdmin && (
  <Tabs defaultValue="overview" className="mt-6">
    <TabsList className="brutalist-card inline-flex">
      <TabsTrigger value="overview" className="uppercase tracking-widest font-bold text-xs">Resumen</TabsTrigger>
      <TabsTrigger value="comparativa" className="uppercase tracking-widest font-bold text-xs">Comparativa</TabsTrigger>
    </TabsList>

    <TabsContent value="overview">
      {/* existing stats cards here */}
    </TabsContent>

    <TabsContent value="comparativa">
      <div className="brutalist-card overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-black">
              {['Comunidad','Negocios','Usuarios','Posts','Alertas'].map((h) => (
                <th key={h} className="px-4 py-3 text-left uppercase tracking-widest font-black text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {communityStats.map((row, i) => (
              <tr key={i} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="px-4 py-3 font-bold">{row.community}</td>
                <td className="px-4 py-3">{row.businesses_count ?? 0}</td>
                <td className="px-4 py-3">{row.users_count ?? 0}</td>
                <td className="px-4 py-3">{row.posts_count ?? 0}</td>
                <td className="px-4 py-3">{row.alerts_count ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </TabsContent>
  </Tabs>
)}
```

- [ ] **Step 4: Manual test**

Navigate to `/admin/statistics` as super admin → community selector appears → "Todas las comunidades" selected → stats show aggregated data → select specific community → stats scope to that community. Click "Comparativa" tab → table shows one row per community with key metrics.

- [ ] **Step 5: Commit**

```bash
git add app/admin/statistics/page.tsx
git commit -m "feat(admin): community selector and comparativa tab in statistics"
```

---

## Task 14: Sidebar — Add Plataforma Nav Section

**Files:**
- Modify: `components/admin/collapsible-sidebar.tsx`

- [ ] **Step 1: Add Plataforma nav items**

In `components/admin/collapsible-sidebar.tsx`, add the required imports:
```typescript
import { Sliders } from 'lucide-react' // already has Settings, add Sliders if not present
```

Add four new entries to the `navItems` array after the `communities` entry:

```typescript
{ href: '/admin/platform/settings', label: 'Config. Plataforma', icon: Settings, roles: ['super_admin'], section: 'platform' },
{ href: '/admin/platform/policies', label: 'Políticas', icon: FileText, roles: ['super_admin'], section: 'platform' },
{ href: '/admin/platform/payments', label: 'Pasarelas Pago', icon: DollarSign, roles: ['super_admin'], section: 'platform' },
{ href: '/admin/platform/service-categories', label: 'Cat. Servicios', icon: Briefcase, roles: ['super_admin'], section: 'platform', divider: false },
```

Update the section label rendering to handle the `platform` section. Find the block rendering `showSectionLabel` and update:
```typescript
const sectionLabels: Record<string, string> = {
  monetization: 'Monetización',
  platform: 'Plataforma',
}

{showSectionLabel && !isCollapsed && (
  <div className="px-3 py-2">
    <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">
      {sectionLabels[item.section!] || item.section}
    </h3>
  </div>
)}
```

Also add a `divider: true` to the first platform item so there's a visual separator:
```typescript
{ href: '/admin/platform/settings', label: 'Config. Plataforma', icon: Settings, roles: ['super_admin'], section: 'platform', divider: true },
```

- [ ] **Step 2: Manual test**

Log in as super admin → admin sidebar shows a "Plataforma" section below "Comunidades" with 4 items: Config. Plataforma, Políticas, Pasarelas Pago, Cat. Servicios. Log in as regular admin → Plataforma section does not appear.

- [ ] **Step 3: Commit**

```bash
git add components/admin/collapsible-sidebar.tsx
git commit -m "feat(admin): add Plataforma nav section to super admin sidebar"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] Create/configure/describe community — already done, no tasks needed
- [x] Geographic boundaries — already done
- [x] Upload community logo/branding — Task 2 (cover image)
- [x] Assign community administrators — already done
- [x] Transfer community ownership — Task 6
- [x] Archive inactive communities — already done
- [x] Delete communities — Task 7
- [x] View all communities dashboard — already done
- [x] View cross-community analytics — Task 13
- [x] Manage platform-wide settings — Task 9
- [x] Manage global category templates — Task 3 + 4
- [x] Manage global service categories — Task 12
- [x] Set platform-wide policies — Task 10
- [x] Manage platform-wide payment settings — Task 11
- [x] View consolidated revenue across communities — Task 5
- [x] Manage platform-wide user accounts — already works for super admin
- [x] Access all community admin panels — Task 8
- [x] Override community-level settings — addressed via community edit (already works)

**Type consistency check:**
- `ServiceCategory` type changed to `string` in Task 12 Step 4 — used in `app/admin/services/page.tsx` formData which is updated in the same task ✓
- `primary_admin_id` passed to `CommunityOwnershipPanel` as `string | null` — matches prop type ✓
- `fetchPayments(commId: string | null)` — all call sites updated in Task 5 ✓

---

**Plan complete and saved to `docs/superpowers/plans/2026-05-11-super-admin-platform-management.md`.**

**Two execution options:**

**1. Subagent-Driven (recommended)** — Fresh subagent per task, review between tasks, fast parallel iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
