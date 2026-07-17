# Marketplace User Features Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable registered neighbor users to create, manage, and favorite classified listings in the BarrioRed marketplace.

**Architecture:** Server Actions + Server Components pattern. All mutations via Server Actions in `app/actions/classified-actions.ts`, data fetching via Server Components, client components only for interactive UI. Unified dashboard with tabs for businesses and classifieds. RLS enforces all permissions at database level.

**Tech Stack:** Next.js 16 App Router, React 19, Supabase (PostgreSQL + RLS), TypeScript, Tailwind CSS, Radix UI, Server Actions

---

## Task 1: Database Migration - Favorites Table

**Files:**
- Create: `supabase/migrations/20260312000000_add_classified_favorites.sql`

**Step 1: Create migration file**

```sql
-- Migration: Add Classified Favorites
-- Date: 2026-03-12
-- Description: Enable users to save/bookmark classifieds

-- ============================================================================
-- CLASSIFIED_FAVORITES: Users can bookmark classifieds
-- ============================================================================

CREATE TABLE classified_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  classified_id UUID NOT NULL REFERENCES classifieds(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate favorites
  UNIQUE(user_id, classified_id)
);

COMMENT ON TABLE classified_favorites IS
  'User bookmarks/favorites for marketplace classifieds';

-- Indexes for performance
CREATE INDEX idx_favorites_user ON classified_favorites(user_id, created_at DESC);
CREATE INDEX idx_favorites_classified ON classified_favorites(classified_id);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE classified_favorites ENABLE ROW LEVEL SECURITY;

-- Users can view only their own favorites
CREATE POLICY "favorites_select_own"
  ON classified_favorites FOR SELECT
  USING (user_id = auth.uid());

-- Users can add favorites
CREATE POLICY "favorites_insert_own"
  ON classified_favorites FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can remove only their own favorites
CREATE POLICY "favorites_delete_own"
  ON classified_favorites FOR DELETE
  USING (user_id = auth.uid());
```

**Step 2: Run migration**

Run: `npx supabase db push`
Expected: "Migration applied successfully"

**Step 3: Verify table created**

Check in Supabase Studio or run:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_name = 'classified_favorites';
```
Expected: Table exists with correct schema

**Step 4: Test RLS policies**

In Supabase SQL Editor, test as authenticated user:
```sql
-- Should work (own favorites)
INSERT INTO classified_favorites (user_id, classified_id)
VALUES (auth.uid(), 'some-classified-uuid');

-- Should fail (other user's favorites)
INSERT INTO classified_favorites (user_id, classified_id)
VALUES ('other-user-uuid', 'some-classified-uuid');
```
Expected: First succeeds, second blocked by RLS

**Step 5: Update TypeScript types**

Run: `npx supabase gen types typescript --local > lib/types/database.ts`
Expected: Types updated with classified_favorites table

**Step 6: Commit**

```bash
git add supabase/migrations/20260312000000_add_classified_favorites.sql lib/types/database.ts
git commit -m "feat(db): add classified_favorites table with RLS policies

- Allow users to bookmark classifieds
- RLS ensures users only manage own favorites
- Cascade delete when user or classified deleted
- Indexed for performance

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Server Actions - Create File Structure

**Files:**
- Create: `app/actions/classified-actions.ts`

**Step 1: Create actions file with imports**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { Database } from '@/lib/types/database'

type ClassifiedInsert = Database['public']['Tables']['classifieds']['Insert']
type ClassifiedUpdate = Database['public']['Tables']['classifieds']['Update']
```

**Step 2: Add helper type for action results**

```typescript
type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string }
```

**Step 3: Commit**

```bash
git add app/actions/classified-actions.ts
git commit -m "feat(actions): create classified actions file with types

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Server Actions - Create Classified Action

**Files:**
- Modify: `app/actions/classified-actions.ts`

**Step 1: Add createClassifiedAction function**

```typescript
export async function createClassifiedAction(formData: FormData) {
  const supabase = await createClient()

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'No autenticado' }
  }

  // Get user's community_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('community_id')
    .eq('id', user.id)
    .single()

  if (!profile?.community_id) {
    return { success: false, error: 'Usuario sin comunidad asignada' }
  }

  // Check if user is banned
  const { data: ban } = await supabase
    .from('marketplace_user_bans')
    .select('reason, expires_at')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (ban && (!ban.expires_at || new Date(ban.expires_at) > new Date())) {
    return {
      success: false,
      error: `Estás suspendido del marketplace. Razón: ${ban.reason}`
    }
  }

  // Extract form data
  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const price = (formData.get('price') as string) || null
  const whatsapp = formData.get('whatsapp') as string
  const category_id = formData.get('category_id') as string
  const images = formData.getAll('images') as string[]

  // Validation
  if (!title || title.length < 10 || title.length > 100) {
    return { success: false, error: 'Título debe tener entre 10 y 100 caracteres' }
  }

  if (!description || description.length < 20 || description.length > 1000) {
    return { success: false, error: 'Descripción debe tener entre 20 y 1000 caracteres' }
  }

  if (!whatsapp || !/^\+?57[0-9]{10}$/.test(whatsapp.replace(/\s/g, ''))) {
    return { success: false, error: 'WhatsApp debe ser un número colombiano válido' }
  }

  if (!images || images.length === 0) {
    return { success: false, error: 'Debes subir al menos 1 imagen' }
  }

  if (images.length > 5) {
    return { success: false, error: 'Máximo 5 imágenes permitidas' }
  }

  if (!category_id) {
    return { success: false, error: 'Debes seleccionar una categoría' }
  }

  // Rate limiting check (max 5 per day)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { count } = await supabase
    .from('classifieds')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', today.toISOString())

  if (count && count >= 5) {
    return {
      success: false,
      error: 'Has alcanzado el límite de 5 clasificados por día. Intenta mañana.'
    }
  }

  // Insert classified
  const { data: classified, error } = await supabase
    .from('classifieds')
    .insert({
      community_id: profile.community_id,
      user_id: user.id,
      category_id,
      title,
      description,
      price,
      whatsapp,
      images,
      status: 'active'
    })
    .select()
    .single()

  if (error) {
    console.error('Insert error:', error)
    return { success: false, error: 'Error al crear clasificado' }
  }

  revalidatePath('/dashboard')
  revalidatePath('/[community]/marketplace', 'page')

  redirect('/dashboard?tab=marketplace')
}
```

**Step 2: Commit**

```bash
git add app/actions/classified-actions.ts
git commit -m "feat(actions): add createClassifiedAction with validation

- Validates all fields (title, description, images, whatsapp)
- Checks ban status
- Rate limiting (5 per day)
- Revalidates dashboard and marketplace paths
- Redirects to dashboard on success

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Server Actions - Update Classified Action

**Files:**
- Modify: `app/actions/classified-actions.ts`

**Step 1: Add updateClassifiedAction function**

```typescript
export async function updateClassifiedAction(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient()

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'No autenticado' }
  }

  // Verify ownership
  const { data: existing } = await supabase
    .from('classifieds')
    .select('user_id, community_id')
    .eq('id', id)
    .single()

  if (!existing || existing.user_id !== user.id) {
    return { success: false, error: 'No tienes permiso para modificar este clasificado' }
  }

  // Extract form data
  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const price = (formData.get('price') as string) || null
  const whatsapp = formData.get('whatsapp') as string
  const category_id = formData.get('category_id') as string
  const images = formData.getAll('images') as string[]

  // Validation (same as create)
  if (!title || title.length < 10 || title.length > 100) {
    return { success: false, error: 'Título debe tener entre 10 y 100 caracteres' }
  }

  if (!description || description.length < 20 || description.length > 1000) {
    return { success: false, error: 'Descripción debe tener entre 20 y 1000 caracteres' }
  }

  if (!whatsapp || !/^\+?57[0-9]{10}$/.test(whatsapp.replace(/\s/g, ''))) {
    return { success: false, error: 'WhatsApp debe ser un número colombiano válido' }
  }

  if (!images || images.length === 0) {
    return { success: false, error: 'Debes tener al menos 1 imagen' }
  }

  if (images.length > 5) {
    return { success: false, error: 'Máximo 5 imágenes permitidas' }
  }

  // Update classified
  const { error } = await supabase
    .from('classifieds')
    .update({
      title,
      description,
      price,
      whatsapp,
      category_id,
      images,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)

  if (error) {
    console.error('Update error:', error)
    return { success: false, error: 'Error al actualizar clasificado' }
  }

  revalidatePath('/dashboard')
  revalidatePath(`/[community]/marketplace/${id}`, 'page')

  return { success: true }
}
```

**Step 2: Commit**

```bash
git add app/actions/classified-actions.ts
git commit -m "feat(actions): add updateClassifiedAction

- Verifies ownership before update
- Same validation as create
- Updates updated_at timestamp
- Revalidates relevant paths

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Server Actions - Delete, Sold, Reactivate Actions

**Files:**
- Modify: `app/actions/classified-actions.ts`

**Step 1: Add deleteClassifiedAction**

```typescript
export async function deleteClassifiedAction(id: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'No autenticado' }
  }

  // RLS will prevent deleting if not owner, but check anyway for better error message
  const { data: existing } = await supabase
    .from('classifieds')
    .select('user_id')
    .eq('id', id)
    .single()

  if (!existing || existing.user_id !== user.id) {
    return { success: false, error: 'No tienes permiso para eliminar este clasificado' }
  }

  const { error } = await supabase
    .from('classifieds')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Delete error:', error)
    return { success: false, error: 'Error al eliminar clasificado' }
  }

  revalidatePath('/dashboard')
  revalidatePath('/[community]/marketplace', 'page')

  return { success: true }
}
```

**Step 2: Add markAsSoldAction**

```typescript
export async function markAsSoldAction(id: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'No autenticado' }
  }

  const { error } = await supabase
    .from('classifieds')
    .update({
      status: 'sold',
      sold_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Mark sold error:', error)
    return { success: false, error: 'Error al marcar como vendido' }
  }

  revalidatePath('/dashboard')
  revalidatePath('/[community]/marketplace', 'page')

  return { success: true }
}
```

**Step 3: Add reactivateClassifiedAction**

```typescript
export async function reactivateClassifiedAction(id: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'No autenticado' }
  }

  const { error } = await supabase
    .from('classifieds')
    .update({
      status: 'active',
      last_activity_at: new Date().toISOString(),
      sold_at: null,
      archived_at: null
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Reactivate error:', error)
    return { success: false, error: 'Error al reactivar clasificado' }
  }

  revalidatePath('/dashboard')
  revalidatePath('/[community]/marketplace', 'page')

  return { success: true }
}
```

**Step 4: Commit**

```bash
git add app/actions/classified-actions.ts
git commit -m "feat(actions): add delete, mark sold, and reactivate actions

- deleteClassifiedAction: hard delete with ownership check
- markAsSoldAction: set status to sold, record sold_at
- reactivateClassifiedAction: return to active, reset timestamps

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Server Actions - Toggle Favorite Action

**Files:**
- Modify: `app/actions/classified-actions.ts`

**Step 1: Add toggleFavoriteAction**

```typescript
export async function toggleFavoriteAction(
  classifiedId: string
): Promise<ActionResult<{ favorited: boolean }>> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Debes iniciar sesión para guardar favoritos' }
  }

  // Check if already favorited
  const { data: existing } = await supabase
    .from('classified_favorites')
    .select('id')
    .eq('user_id', user.id)
    .eq('classified_id', classifiedId)
    .maybeSingle()

  if (existing) {
    // Remove favorite
    const { error } = await supabase
      .from('classified_favorites')
      .delete()
      .eq('id', existing.id)

    if (error) {
      console.error('Remove favorite error:', error)
      return { success: false, error: 'Error al eliminar favorito' }
    }

    revalidatePath('/dashboard')
    return { success: true, data: { favorited: false } }
  } else {
    // Add favorite
    const { error } = await supabase
      .from('classified_favorites')
      .insert({
        user_id: user.id,
        classified_id: classifiedId
      })

    if (error) {
      console.error('Add favorite error:', error)
      return { success: false, error: 'Error al guardar favorito' }
    }

    revalidatePath('/dashboard')
    return { success: true, data: { favorited: true } }
  }
}
```

**Step 2: Commit**

```bash
git add app/actions/classified-actions.ts
git commit -m "feat(actions): add toggleFavoriteAction

- Checks if already favorited, then adds or removes
- Returns new favorited state for optimistic UI
- Revalidates dashboard path

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Dashboard Tabs Component

**Files:**
- Create: `components/dashboard/dashboard-tabs.tsx`

**Step 1: Create tabs component**

```typescript
'use client'

import { cn } from '@/lib/utils'
import { Store, ShoppingBag, Heart } from 'lucide-react'

type TabKey = 'business' | 'marketplace' | 'favorites'

interface DashboardTabsProps {
  activeTab: TabKey
  classifiedsCount?: number
  favoritesCount?: number
  onTabChange: (tab: TabKey) => void
}

export function DashboardTabs({
  activeTab,
  classifiedsCount = 0,
  favoritesCount = 0,
  onTabChange
}: DashboardTabsProps) {
  const tabs = [
    {
      key: 'business' as TabKey,
      label: 'Mi Negocio',
      icon: Store
    },
    {
      key: 'marketplace' as TabKey,
      label: 'Mis Clasificados',
      icon: ShoppingBag,
      count: classifiedsCount
    },
    {
      key: 'favorites' as TabKey,
      label: 'Favoritos',
      icon: Heart,
      count: favoritesCount
    }
  ]

  return (
    <div className="border-b-4 border-black mb-8 overflow-x-auto">
      <div className="flex gap-2 min-w-max">
        {tabs.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.key

          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={cn(
                'flex items-center gap-2 px-6 py-4 font-bold uppercase tracking-widest text-sm transition-all',
                'border-x-2 border-t-2 border-black',
                isActive
                  ? 'bg-white border-b-4 border-b-primary text-black -mb-1'
                  : 'bg-black/5 text-black/60 border-b-4 border-b-black hover:bg-black/10 -mb-1'
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={cn(
                  'px-2 py-0.5 text-xs border-2 border-black rotate-[-2deg]',
                  isActive ? 'bg-secondary' : 'bg-secondary/50'
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add components/dashboard/dashboard-tabs.tsx
git commit -m "feat(dashboard): add brutalist tabs component

- Three tabs: Business, Classifieds, Favorites
- Count badges for classifieds and favorites
- Active state with primary border
- Mobile responsive (horizontal scroll)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Update Dashboard Page with Tabs

**Files:**
- Modify: `app/dashboard/page.tsx`

**Step 1: Read current dashboard page**

Run: Read the file to understand current structure

**Step 2: Modify dashboard page to use tabs**

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardTabs } from '@/components/dashboard/dashboard-tabs'
import { Suspense } from 'react'

export default async function DashboardPage({
  searchParams
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const params = await searchParams
  const activeTab = (params.tab as 'business' | 'marketplace' | 'favorites') || 'business'

  // Fetch counts for badges
  const { count: classifiedsCount } = await supabase
    .from('classifieds')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const { count: favoritesCount } = await supabase
    .from('classified_favorites')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  // Fetch user's business
  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', user.id)
    .maybeSingle()

  return (
    <div className="space-y-8">
      <h1 className="text-4xl md:text-6xl font-heading font-black uppercase tracking-tighter italic border-b-4 border-black pb-4">
        Panel de <span className="text-primary">Control</span>
      </h1>

      <DashboardTabsClient
        activeTab={activeTab}
        classifiedsCount={classifiedsCount || 0}
        favoritesCount={favoritesCount || 0}
      />

      <Suspense fallback={<div>Cargando...</div>}>
        {activeTab === 'business' && (
          <BusinessTabContent business={business} />
        )}

        {activeTab === 'marketplace' && (
          <MarketplaceTabContent userId={user.id} />
        )}

        {activeTab === 'favorites' && (
          <FavoritesTabContent userId={user.id} />
        )}
      </Suspense>
    </div>
  )
}

// Client component for tab interaction
'use client'
function DashboardTabsClient(props: any) {
  const router = useRouter()
  const pathname = usePathname()

  const handleTabChange = (tab: string) => {
    router.push(`${pathname}?tab=${tab}`)
  }

  return <DashboardTabs {...props} onTabChange={handleTabChange} />
}

// Placeholder components (will implement later)
function BusinessTabContent({ business }: { business: any }) {
  if (!business) {
    return (
      <div className="brutalist-card p-12 text-center">
        <p className="text-black/60">No tienes negocio registrado</p>
      </div>
    )
  }
  return <div>Business content (existing implementation)</div>
}

function MarketplaceTabContent({ userId }: { userId: string }) {
  return <div>Marketplace tab (to implement)</div>
}

function FavoritesTabContent({ userId }: { userId: string }) {
  return <div>Favorites tab (to implement)</div>
}
```

**Step 3: Add missing imports**

Add at top:
```typescript
'use client' // Add this directive for useRouter
import { useRouter, usePathname } from 'next/navigation'
```

**Step 4: Test tab navigation**

Run: `npm run dev`
Navigate to: `http://localhost:3000/dashboard`
Expected: See 3 tabs, clicking changes URL query param

**Step 5: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat(dashboard): add tab navigation with counts

- Tabs for Business, Classifieds, Favorites
- Fetch counts from database for badges
- URL-based tab state (?tab=marketplace)
- Placeholder content for each tab

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Image Gallery Upload Component

**Files:**
- Create: `components/marketplace/image-gallery-upload.tsx`

**Step 1: Create component file**

```typescript
'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { X, ImagePlus, Loader2, GripVertical } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface ImageGalleryUploadProps {
  value: string[]
  onChange: (urls: string[]) => void
  maxImages?: number
  minImages?: number
  required?: boolean
  bucket?: string
}

export function ImageGalleryUpload({
  value,
  onChange,
  maxImages = 5,
  minImages = 1,
  required = false,
  bucket = 'marketplace-images'
}: ImageGalleryUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null)

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check max images
    if (value.length >= maxImages) {
      toast.error(`Máximo ${maxImages} imágenes`, {
        description: 'Elimina una imagen para subir otra'
      })
      e.target.value = ''
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagen muy grande', {
        description: 'El tamaño máximo es 5MB'
      })
      e.target.value = ''
      return
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Formato no válido', {
        description: 'Solo se permiten JPG, PNG y WebP'
      })
      e.target.value = ''
      return
    }

    setUploading(true)
    setUploadingIndex(value.length)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error('Error al subir imagen', {
          description: data.error || 'Intenta nuevamente'
        })
        return
      }

      onChange([...value, data.url])
      toast.success('Imagen subida correctamente')
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Error de conexión', {
        description: 'Verifica tu internet e intenta nuevamente'
      })
    } finally {
      setUploading(false)
      setUploadingIndex(null)
      e.target.value = ''
    }
  }, [value, onChange, maxImages])

  const handleDelete = useCallback((index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }, [value, onChange])

  const handleReorder = useCallback((fromIndex: number, toIndex: number) => {
    const newValue = [...value]
    const [removed] = newValue.splice(fromIndex, 1)
    newValue.splice(toIndex, 0, removed)
    onChange(newValue)
  }, [value, onChange])

  const canUpload = value.length < maxImages && !uploading

  return (
    <div className="space-y-2">
      <Label className="uppercase tracking-widest font-bold text-xs">
        Imágenes {required && <span className="text-primary">*</span>}
        {minImages > 0 && (
          <span className="text-black/60 font-normal ml-2">
            (mínimo {minImages}, máximo {maxImages})
          </span>
        )}
      </Label>

      {/* Image grid */}
      {value.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          {value.map((url, index) => (
            <div
              key={url}
              className="relative brutalist-card overflow-hidden aspect-square border-2 border-black group"
            >
              <Image
                src={url}
                alt={`Imagen ${index + 1}`}
                fill
                className="object-cover"
              />

              {/* Delete button */}
              <button
                type="button"
                onClick={() => handleDelete(index)}
                className="absolute top-2 right-2 brutalist-button bg-primary text-white p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Drag handle (optional, can implement later) */}
              <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 text-xs font-bold">
                {index + 1}
              </div>
            </div>
          ))}

          {/* Upload progress placeholder */}
          {uploadingIndex !== null && (
            <div className="brutalist-card aspect-square border-2 border-black flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
        </div>
      )}

      {/* Upload button */}
      {canUpload && (
        <label
          className={cn(
            'brutalist-card flex flex-col items-center justify-center cursor-pointer p-8 border-2 border-dashed border-black/30 hover:border-primary hover:bg-primary/5 transition-all',
            'min-h-[200px]'
          )}
        >
          <input
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="sr-only"
            disabled={uploading}
          />

          <ImagePlus className="h-12 w-12 text-black/30 mb-3" />
          <span className="text-xs font-bold text-black/60 uppercase tracking-widest text-center">
            {value.length === 0 ? 'Subir Imágenes' : `Agregar Imagen (${value.length}/${maxImages})`}
          </span>
          <span className="text-[10px] text-black/40 mt-1">
            JPG, PNG o WebP (máx. 5MB)
          </span>
        </label>
      )}

      {/* Validation message */}
      {required && value.length < minImages && (
        <p className="text-xs font-bold text-primary uppercase tracking-widest">
          Debes subir al menos {minImages} imagen{minImages > 1 ? 'es' : ''}
        </p>
      )}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add components/marketplace/image-gallery-upload.tsx
git commit -m "feat(marketplace): add image gallery upload component

- Upload up to 5 images (configurable)
- Drag & drop area with brutalist styling
- Image preview grid with delete buttons
- File size and type validation
- Upload progress indicator
- Numbered images for ordering

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 10: Category Selector Component

**Files:**
- Create: `components/marketplace/category-selector.tsx`

**Step 1: Create component**

```typescript
'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import {
  ShoppingCart,
  ShoppingBag,
  Home,
  Wrench,
  Briefcase,
  type LucideIcon
} from 'lucide-react'

interface Category {
  id: string
  name: string
  slug: string
  icon: string
  description: string | null
}

interface CategorySelectorProps {
  categories: Category[]
  value: string | null
  onChange: (categoryId: string) => void
  required?: boolean
}

const iconMap: Record<string, LucideIcon> = {
  'ShoppingCart': ShoppingCart,
  'ShoppingBag': ShoppingBag,
  'Home': Home,
  'Wrench': Wrench,
  'Briefcase': Briefcase
}

export function CategorySelector({
  categories,
  value,
  onChange,
  required = false
}: CategorySelectorProps) {
  return (
    <div className="space-y-2">
      <Label className="uppercase tracking-widest font-bold text-xs">
        Categoría {required && <span className="text-primary">*</span>}
      </Label>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {categories.map(category => {
          const Icon = iconMap[category.icon] || ShoppingCart
          const isActive = value === category.id

          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onChange(category.id)}
              className={cn(
                'brutalist-card p-6 flex flex-col items-center gap-3 text-center transition-all',
                'hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-1 hover:-translate-y-1',
                isActive && 'border-4 border-primary shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]'
              )}
            >
              <Icon className={cn(
                'h-10 w-10',
                isActive ? 'text-primary' : 'text-black/60'
              )} />

              <div>
                <p className={cn(
                  'font-heading font-black uppercase text-sm tracking-tight',
                  isActive ? 'text-primary' : 'text-black'
                )}>
                  {category.name}
                </p>
                {category.description && (
                  <p className="text-[10px] text-black/60 mt-1">
                    {category.description}
                  </p>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {required && !value && (
        <p className="text-xs font-bold text-primary uppercase tracking-widest">
          Debes seleccionar una categoría
        </p>
      )}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add components/marketplace/category-selector.tsx
git commit -m "feat(marketplace): add category selector component

- Large brutalist card buttons for each category
- Icon mapping from database icon names
- Active state with primary border and shadow
- Responsive grid layout
- Required validation message

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 11: Classified Form Component (Part 1 - Structure)

**Files:**
- Create: `components/marketplace/classified-form.tsx`

**Step 1: Create form component with structure**

```typescript
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { PhoneInput } from '@/components/ui/phone-input'
import { CategorySelector } from './category-selector'
import { ImageGalleryUpload } from './image-gallery-upload'
import { createClassifiedAction, updateClassifiedAction } from '@/app/actions/classified-actions'
import { toast } from 'sonner'
import { Loader2, Send } from 'lucide-react'
import type { Database } from '@/lib/types/database'

type MarketplaceCategory = Database['public']['Tables']['marketplace_categories']['Row']
type Classified = Database['public']['Tables']['classifieds']['Row']

interface ClassifiedFormProps {
  mode: 'create' | 'edit'
  initialData?: Classified
  categories: MarketplaceCategory[]
}

export function ClassifiedForm({
  mode,
  initialData,
  categories
}: ClassifiedFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Form state
  const [categoryId, setCategoryId] = useState(initialData?.category_id || '')
  const [title, setTitle] = useState(initialData?.title || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [price, setPrice] = useState(initialData?.price || '')
  const [whatsapp, setWhatsapp] = useState(initialData?.whatsapp || '')
  const [images, setImages] = useState<string[]>(initialData?.images || [])

  // Error state
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!categoryId) {
      newErrors.category = 'Debes seleccionar una categoría'
    }

    if (!title || title.length < 10) {
      newErrors.title = 'Título debe tener al menos 10 caracteres'
    } else if (title.length > 100) {
      newErrors.title = 'Título no puede exceder 100 caracteres'
    }

    if (!description || description.length < 20) {
      newErrors.description = 'Descripción debe tener al menos 20 caracteres'
    } else if (description.length > 1000) {
      newErrors.description = 'Descripción no puede exceder 1000 caracteres'
    }

    if (!whatsapp) {
      newErrors.whatsapp = 'WhatsApp es requerido'
    }

    if (images.length === 0) {
      newErrors.images = 'Debes subir al menos 1 imagen'
    } else if (images.length > 5) {
      newErrors.images = 'Máximo 5 imágenes'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      toast.error('Formulario incompleto', {
        description: 'Revisa los campos marcados en rojo'
      })
      return
    }

    const formData = new FormData()
    formData.append('category_id', categoryId)
    formData.append('title', title)
    formData.append('description', description)
    formData.append('price', price)
    formData.append('whatsapp', whatsapp)
    images.forEach(img => formData.append('images', img))

    startTransition(async () => {
      try {
        if (mode === 'create') {
          await createClassifiedAction(formData)
          // Will redirect on success
        } else if (mode === 'edit' && initialData) {
          const result = await updateClassifiedAction(initialData.id, formData)
          if (result.success) {
            toast.success('Clasificado actualizado correctamente')
            router.push('/dashboard?tab=marketplace')
          } else {
            toast.error('Error al actualizar', {
              description: result.error
            })
          }
        }
      } catch (error) {
        console.error('Form submission error:', error)
        toast.error('Error al enviar formulario')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl">
      {/* Category */}
      <CategorySelector
        categories={categories}
        value={categoryId}
        onChange={setCategoryId}
        required
      />
      {errors.category && (
        <p className="text-xs font-bold text-primary uppercase tracking-widest -mt-6">
          {errors.category}
        </p>
      )}

      {/* Title */}
      <div className="space-y-2">
        <Label className="uppercase tracking-widest font-bold text-xs">
          Título <span className="text-primary">*</span>
        </Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej: Bicicleta de montaña en excelente estado"
          className={errors.title && "border-primary bg-primary/5"}
          maxLength={100}
        />
        <p className="text-xs text-black/60">
          {title.length}/100 caracteres
        </p>
        {errors.title && (
          <p className="text-xs font-bold text-primary uppercase tracking-widest">
            {errors.title}
          </p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label className="uppercase tracking-widest font-bold text-xs">
          Descripción <span className="text-primary">*</span>
        </Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe tu artículo en detalle: estado, características, razón de venta..."
          rows={6}
          className={errors.description && "border-primary bg-primary/5"}
          maxLength={1000}
        />
        <p className="text-xs text-black/60">
          {description.length}/1000 caracteres
        </p>
        {errors.description && (
          <p className="text-xs font-bold text-primary uppercase tracking-widest">
            {errors.description}
          </p>
        )}
      </div>

      {/* Price */}
      <div className="space-y-2">
        <Label className="uppercase tracking-widest font-bold text-xs">
          Precio <span className="text-black/60">(opcional)</span>
        </Label>
        <Input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="$50,000 o 'Negociable' o 'Gratis'"
        />
        <p className="text-xs text-black/60">
          Puedes dejar en blanco, poner un precio, o escribir "Negociable"
        </p>
      </div>

      {/* Images */}
      <ImageGalleryUpload
        value={images}
        onChange={setImages}
        maxImages={5}
        minImages={1}
        required
      />
      {errors.images && (
        <p className="text-xs font-bold text-primary uppercase tracking-widest -mt-6">
          {errors.images}
        </p>
      )}

      {/* WhatsApp */}
      <div className="space-y-2">
        <Label className="uppercase tracking-widest font-bold text-xs">
          WhatsApp <span className="text-primary">*</span>
        </Label>
        <PhoneInput
          value={whatsapp}
          onChange={setWhatsapp}
          placeholder="+57 300 123 4567"
          className={errors.whatsapp && "border-primary bg-primary/5"}
        />
        <p className="text-xs text-black/60">
          Los interesados te contactarán por WhatsApp
        </p>
        {errors.whatsapp && (
          <p className="text-xs font-bold text-primary uppercase tracking-widest">
            {errors.whatsapp}
          </p>
        )}
      </div>

      {/* Submit */}
      <div className="flex gap-4 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isPending}
          className="brutalist-button"
        >
          Cancelar
        </Button>

        <Button
          type="submit"
          disabled={isPending}
          className="brutalist-button bg-primary text-primary-foreground flex-1"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {mode === 'create' ? 'Publicando...' : 'Actualizando...'}
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              {mode === 'create' ? 'Publicar Clasificado' : 'Guardar Cambios'}
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
```

**Step 2: Commit**

```bash
git add components/marketplace/classified-form.tsx
git commit -m "feat(marketplace): add classified form component

- Single-page form for create and edit modes
- All fields with validation and error display
- Character counters for title and description
- Integrates CategorySelector and ImageGalleryUpload
- Loading state with disabled submit
- Uses Server Actions for submission

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 12: Create Classified Page

**Files:**
- Create: `app/dashboard/marketplace/new/page.tsx`

**Step 1: Create new classified page**

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Breadcrumbs } from '@/components/shared/breadcrumbs'
import { ClassifiedForm } from '@/components/marketplace/classified-form'

export const metadata = {
  title: 'Publicar Clasificado | BarrioRed',
  description: 'Publica tu clasificado en el marketplace de tu comunidad'
}

export default async function NewClassifiedPage() {
  const supabase = await createClient()

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/login?redirect=/dashboard/marketplace/new')
  }

  // Check if banned
  const { data: ban } = await supabase
    .from('marketplace_user_bans')
    .select('reason, expires_at')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (ban && (!ban.expires_at || new Date(ban.expires_at) > new Date())) {
    return (
      <div className="space-y-8">
        <Breadcrumbs
          items={[
            { label: 'Panel de Control', href: '/dashboard' },
            { label: 'Marketplace', href: '/dashboard?tab=marketplace' },
            { label: 'Publicar', active: true }
          ]}
        />

        <div className="brutalist-card p-8 border-primary bg-primary/5 max-w-2xl">
          <h2 className="font-heading font-black uppercase text-2xl mb-4">
            Cuenta Suspendida
          </h2>
          <p className="text-black/80 mb-2">
            <strong>Razón:</strong> {ban.reason}
          </p>
          {ban.expires_at ? (
            <p className="text-black/60 text-sm">
              Suspensión válida hasta: {new Date(ban.expires_at).toLocaleDateString('es-CO')}
            </p>
          ) : (
            <p className="text-black/60 text-sm">
              Suspensión permanente
            </p>
          )}
        </div>
      </div>
    )
  }

  // Fetch marketplace categories
  const { data: categories } = await supabase
    .from('marketplace_categories')
    .select('*')
    .eq('is_active', true)
    .order('display_order')

  return (
    <div className="space-y-8">
      <Breadcrumbs
        items={[
          { label: 'Panel de Control', href: '/dashboard' },
          { label: 'Marketplace', href: '/dashboard?tab=marketplace' },
          { label: 'Publicar', active: true }
        ]}
      />

      <div>
        <h1 className="text-4xl md:text-6xl font-heading font-black uppercase tracking-tighter italic mb-2">
          Publicar <span className="text-primary">Clasificado</span>
        </h1>
        <p className="text-sm text-black/60 uppercase tracking-widest">
          Completa el formulario para publicar tu artículo
        </p>
      </div>

      <ClassifiedForm
        mode="create"
        categories={categories || []}
      />
    </div>
  )
}
```

**Step 2: Test create flow**

Run: `npm run dev`
Navigate to: `http://localhost:3000/dashboard/marketplace/new`
Expected: See form with all fields, category selector, image upload

**Step 3: Commit**

```bash
git add app/dashboard/marketplace/new/page.tsx
git commit -m "feat(marketplace): add create classified page

- Checks authentication and ban status
- Shows ban message if user suspended
- Fetches marketplace categories
- Renders ClassifiedForm in create mode
- Breadcrumbs navigation

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 13: Edit Classified Page

**Files:**
- Create: `app/dashboard/marketplace/[id]/edit/page.tsx`

**Step 1: Create edit page**

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Breadcrumbs } from '@/components/shared/breadcrumbs'
import { ClassifiedForm } from '@/components/marketplace/classified-form'

export const metadata = {
  title: 'Editar Clasificado | BarrioRed',
  description: 'Edita tu clasificado en el marketplace'
}

export default async function EditClassifiedPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/auth/login?redirect=/dashboard/marketplace/${id}/edit`)
  }

  // Fetch classified (RLS ensures user owns it)
  const { data: classified } = await supabase
    .from('classifieds')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!classified) {
    notFound()
  }

  // Fetch marketplace categories
  const { data: categories } = await supabase
    .from('marketplace_categories')
    .select('*')
    .eq('is_active', true)
    .order('display_order')

  return (
    <div className="space-y-8">
      <Breadcrumbs
        items={[
          { label: 'Panel de Control', href: '/dashboard' },
          { label: 'Marketplace', href: '/dashboard?tab=marketplace' },
          { label: 'Editar', active: true }
        ]}
      />

      <div>
        <h1 className="text-4xl md:text-6xl font-heading font-black uppercase tracking-tighter italic mb-2">
          Editar <span className="text-primary">Clasificado</span>
        </h1>
        <p className="text-sm text-black/60 uppercase tracking-widest">
          {classified.title}
        </p>
      </div>

      <ClassifiedForm
        mode="edit"
        initialData={classified}
        categories={categories || []}
      />
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add app/dashboard/marketplace/[id]/edit/page.tsx
git commit -m "feat(marketplace): add edit classified page

- Fetches classified with ownership check via RLS
- Pre-fills form with existing data
- Uses same ClassifiedForm in edit mode
- Shows 404 if not found or not owner

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 14: Favorite Button Component

**Files:**
- Create: `components/marketplace/favorite-button.tsx`

**Step 1: Create favorite button**

```typescript
'use client'

import { useState, useTransition } from 'react'
import { Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toggleFavoriteAction } from '@/app/actions/classified-actions'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface FavoriteButtonProps {
  classifiedId: string
  initialFavorited: boolean
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  userId?: string | null
}

export function FavoriteButton({
  classifiedId,
  initialFavorited,
  size = 'md',
  showLabel = false,
  userId
}: FavoriteButtonProps) {
  const router = useRouter()
  const [favorited, setFavorited] = useState(initialFavorited)
  const [isPending, startTransition] = useTransition()

  const handleToggle = () => {
    // Redirect to login if not authenticated
    if (!userId) {
      router.push('/auth/login')
      return
    }

    // Optimistic update
    setFavorited(!favorited)

    startTransition(async () => {
      const result = await toggleFavoriteAction(classifiedId)

      if (result.success && result.data) {
        // Update with server response
        setFavorited(result.data.favorited)
        toast.success(
          result.data.favorited
            ? 'Agregado a favoritos'
            : 'Eliminado de favoritos'
        )
      } else {
        // Revert optimistic update on error
        setFavorited(favorited)
        toast.error('Error', {
          description: result.error || 'Intenta nuevamente'
        })
      }
    })
  }

  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3'
  }

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  }

  return (
    <Button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      className={cn(
        'brutalist-button transition-all',
        sizeClasses[size],
        favorited
          ? 'bg-primary text-white hover:bg-primary/90'
          : 'bg-white hover:bg-black/5',
        showLabel && 'gap-2 px-4'
      )}
      aria-label={favorited ? 'Quitar de favoritos' : 'Agregar a favoritos'}
    >
      <Heart
        className={cn(
          iconSizes[size],
          favorited && 'fill-current'
        )}
      />
      {showLabel && (
        <span className="uppercase tracking-widest font-bold text-xs">
          {favorited ? 'Guardado' : 'Guardar'}
        </span>
      )}
    </Button>
  )
}
```

**Step 2: Commit**

```bash
git add components/marketplace/favorite-button.tsx
git commit -m "feat(marketplace): add favorite button component

- Heart icon with filled state when favorited
- Optimistic UI (instant feedback)
- Size variants (sm, md, lg)
- Optional label display
- Redirects to login if not authenticated
- Toast notifications

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 15: User Classified Card Component

**Files:**
- Create: `components/marketplace/user-classified-card.tsx`

**Step 1: Create user classified card**

```typescript
'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  RotateCcw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { ClassifiedStatusBadge } from './classified-status-badge'
import {
  deleteClassifiedAction,
  markAsSoldAction,
  reactivateClassifiedAction
} from '@/app/actions/classified-actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { Database } from '@/lib/types/database'

type Classified = Database['public']['Tables']['classifieds']['Row']

interface UserClassifiedCardProps {
  classified: Classified
  communitySlug: string
}

export function UserClassifiedCard({
  classified,
  communitySlug
}: UserClassifiedCardProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  const thumbnail = classified.images?.[0] || '/placeholder-classified.png'
  const timeAgo = new Date(classified.created_at).toLocaleDateString('es-CO')

  const handleMarkSold = async () => {
    setIsUpdating(true)
    const result = await markAsSoldAction(classified.id)

    if (result.success) {
      toast.success('Marcado como vendido')
      router.refresh()
    } else {
      toast.error('Error', { description: result.error })
    }
    setIsUpdating(false)
  }

  const handleReactivate = async () => {
    setIsUpdating(true)
    const result = await reactivateClassifiedAction(classified.id)

    if (result.success) {
      toast.success('Clasificado reactivado')
      router.refresh()
    } else {
      toast.error('Error', { description: result.error })
    }
    setIsUpdating(false)
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    const result = await deleteClassifiedAction(classified.id)

    if (result.success) {
      toast.success('Clasificado eliminado')
      router.refresh()
    } else {
      toast.error('Error', { description: result.error })
      setIsDeleting(false)
    }
  }

  const isActive = classified.status === 'active'
  const isSold = classified.status === 'sold'
  const isArchived = classified.status === 'archived'

  return (
    <div className={cn(
      'brutalist-card p-4 flex gap-4',
      (isSold || isArchived) && 'opacity-60'
    )}>
      {/* Thumbnail */}
      <div className="relative w-24 h-24 flex-shrink-0 border-2 border-black overflow-hidden">
        <Image
          src={thumbnail}
          alt={classified.title}
          fill
          className="object-cover"
        />
        <div className="absolute top-1 left-1">
          <ClassifiedStatusBadge status={classified.status} size="sm" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-sm line-clamp-1">
            {classified.title}
          </h3>
          <p className="text-lg font-heading font-black text-primary">
            {classified.price || 'Sin precio'}
          </p>
          <p className="text-xs text-black/60">
            Publicado: {timeAgo}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-2 flex-wrap">
          <Link href={`/${communitySlug}/marketplace/${classified.id}`}>
            <Button
              size="sm"
              variant="outline"
              className="brutalist-button text-xs"
            >
              <Eye className="h-3 w-3" />
              Ver
            </Button>
          </Link>

          <Link href={`/dashboard/marketplace/${classified.id}/edit`}>
            <Button
              size="sm"
              variant="outline"
              className="brutalist-button text-xs"
            >
              <Edit className="h-3 w-3" />
              Editar
            </Button>
          </Link>

          {isActive && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleMarkSold}
              disabled={isUpdating}
              className="brutalist-button text-xs"
            >
              <CheckCircle className="h-3 w-3" />
              Vendido
            </Button>
          )}

          {(isSold || isArchived) && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleReactivate}
              disabled={isUpdating}
              className="brutalist-button text-xs"
            >
              <RotateCcw className="h-3 w-3" />
              Reactivar
            </Button>
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                disabled={isDeleting}
                className="brutalist-button text-xs"
              >
                <Trash2 className="h-3 w-3" />
                Eliminar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="brutalist-card">
              <AlertDialogHeader>
                <AlertDialogTitle className="font-heading font-black uppercase">
                  ¿Eliminar Clasificado?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción no se puede deshacer. Tu clasificado será eliminado permanentemente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="brutalist-button">
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="brutalist-button bg-primary text-primary-foreground"
                >
                  Sí, Eliminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add components/marketplace/user-classified-card.tsx
git commit -m "feat(marketplace): add user classified card component

- Thumbnail with status badge overlay
- Quick actions: View, Edit, Mark Sold, Reactivate, Delete
- Confirmation dialog for delete
- Reduced opacity for sold/archived items
- Loading states for all actions
- Responsive button layout

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 16: Marketplace Tab Content

**Files:**
- Modify: `app/dashboard/page.tsx`

**Step 1: Add marketplace tab implementation**

Add after imports:
```typescript
import { UserClassifiedCard } from '@/components/marketplace/user-classified-card'
import { Plus } from 'lucide-react'
import Link from 'next/link'
```

Replace `MarketplaceTabContent` function with:
```typescript
async function MarketplaceTabContent({
  userId,
  communitySlug
}: {
  userId: string
  communitySlug: string
}) {
  const supabase = await createClient()

  // Fetch user's classifieds
  const { data: classifieds } = await supabase
    .from('classifieds')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  const activeCount = classifieds?.filter(c => c.status === 'active').length || 0
  const soldCount = classifieds?.filter(c => c.status === 'sold').length || 0
  const archivedCount = classifieds?.filter(c => c.status === 'archived').length || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="font-heading font-black uppercase text-2xl mb-2">
            Mis Clasificados
          </h2>
          <p className="text-sm text-black/60 uppercase tracking-widest">
            {activeCount} activos · {soldCount} vendidos · {archivedCount} archivados
          </p>
        </div>

        <Link href="/dashboard/marketplace/new">
          <Button className="brutalist-button bg-primary text-primary-foreground gap-2">
            <Plus className="h-4 w-4" />
            Publicar Nuevo
          </Button>
        </Link>
      </div>

      {/* Classifieds grid */}
      {classifieds && classifieds.length > 0 ? (
        <div className="grid gap-4">
          {classifieds.map(classified => (
            <UserClassifiedCard
              key={classified.id}
              classified={classified}
              communitySlug={communitySlug}
            />
          ))}
        </div>
      ) : (
        <div className="brutalist-card p-12 text-center space-y-4">
          <ShoppingBag className="h-16 w-16 mx-auto text-black/20" />
          <h3 className="font-heading font-black uppercase text-2xl">
            Sin Clasificados
          </h3>
          <p className="text-black/60">
            ¡Publica tu primer artículo en el marketplace!
          </p>
          <Link href="/dashboard/marketplace/new">
            <Button className="brutalist-button bg-primary inline-flex gap-2">
              <Plus className="h-4 w-4" />
              Publicar Ahora
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
```

**Step 2: Update main page to pass community slug**

In the main function, fetch community slug:
```typescript
// After fetching user
const { data: profile } = await supabase
  .from('profiles')
  .select('community_id, communities(slug)')
  .eq('id', user.id)
  .single()

const communitySlug = profile?.communities?.slug || 'parqueindustrial'
```

Update MarketplaceTabContent call:
```typescript
{activeTab === 'marketplace' && (
  <MarketplaceTabContent
    userId={user.id}
    communitySlug={communitySlug}
  />
)}
```

**Step 3: Test marketplace tab**

Run: `npm run dev`
Navigate to: `http://localhost:3000/dashboard?tab=marketplace`
Expected: See user's classifieds or empty state

**Step 4: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat(dashboard): implement marketplace tab content

- Displays user's classifieds in grid
- Shows counts (active, sold, archived)
- Empty state with call-to-action
- Link to create new classified
- Uses UserClassifiedCard component

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 17: Favorites Tab Content

**Files:**
- Modify: `app/dashboard/page.tsx`

**Step 1: Update favorites tab implementation**

Add after other imports:
```typescript
import { ClassifiedCard } from '@/components/marketplace/classified-card'
```

Replace `FavoritesTabContent` function with:
```typescript
async function FavoritesTabContent({
  userId,
  communitySlug
}: {
  userId: string
  communitySlug: string
}) {
  const supabase = await createClient()

  // Fetch user's favorites
  const { data: favorites } = await supabase
    .from('classified_favorites')
    .select(`
      id,
      created_at,
      classifieds (
        *,
        profiles (full_name, avatar_url),
        marketplace_categories (name, slug, icon)
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  const classifieds = favorites?.map(f => f.classifieds).filter(Boolean) || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-heading font-black uppercase text-2xl mb-2">
          Favoritos
        </h2>
        <p className="text-sm text-black/60 uppercase tracking-widest">
          {classifieds.length} clasificados guardados
        </p>
      </div>

      {/* Favorites grid */}
      {classifieds.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classifieds.map((classified: any) => (
            <ClassifiedCard
              key={classified.id}
              classified={{
                ...classified,
                marketplace_categories: classified.marketplace_categories,
                profiles: classified.profiles
              }}
              variant="public"
              communitySlug={communitySlug}
            />
          ))}
        </div>
      ) : (
        <div className="brutalist-card p-12 text-center space-y-4">
          <Heart className="h-16 w-16 mx-auto text-black/20" />
          <h3 className="font-heading font-black uppercase text-2xl">
            Sin Favoritos
          </h3>
          <p className="text-black/60">
            Guarda clasificados que te interesen para encontrarlos fácilmente después
          </p>
          <Link href={`/${communitySlug}/marketplace`}>
            <Button className="brutalist-button bg-primary inline-flex gap-2">
              <ShoppingBag className="h-4 w-4" />
              Explorar Marketplace
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
```

**Step 2: Update FavoritesTabContent call**

```typescript
{activeTab === 'favorites' && (
  <FavoritesTabContent
    userId={user.id}
    communitySlug={communitySlug}
  />
)}
```

**Step 3: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat(dashboard): implement favorites tab content

- Displays user's favorited classifieds
- Uses ClassifiedCard in public variant
- Empty state with link to marketplace
- Shows count of saved items

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 18: Add Favorite Button to Public Marketplace Cards

**Files:**
- Modify: `components/marketplace/classified-card.tsx`

**Step 1: Read current classified card**

Run: Check if variant prop already exists

**Step 2: Add favorite button to public variant**

In the card component, add favorite button when variant is 'public':
```typescript
{variant === 'public' && userId && (
  <div className="absolute top-2 right-2">
    <FavoriteButton
      classifiedId={classified.id}
      initialFavorited={isFavorited}
      size="sm"
      userId={userId}
    />
  </div>
)}
```

Add props:
```typescript
interface ClassifiedCardProps {
  // ... existing props
  variant?: 'admin' | 'public' | 'user-dashboard'
  userId?: string | null
  isFavorited?: boolean
}
```

**Step 3: Update marketplace hub to pass favorite state**

Modify `app/[community]/marketplace/page.tsx`:

```typescript
// Check which classifieds user has favorited
let favoritedIds: string[] = []
if (user) {
  const { data: favorites } = await supabase
    .from('classified_favorites')
    .select('classified_id')
    .eq('user_id', user.id)

  favoritedIds = favorites?.map(f => f.classified_id) || []
}

// Pass to component
<MarketplaceHub
  classifieds={classifieds || []}
  communitySlug={community.slug}
  userId={user?.id}
  favoritedIds={favoritedIds}
/>
```

**Step 4: Commit**

```bash
git add components/marketplace/classified-card.tsx app/[community]/marketplace/page.tsx
git commit -m "feat(marketplace): add favorite button to public cards

- Heart button in top-right corner of cards
- Shows filled state if already favorited
- Only visible to authenticated users
- Fetches user's favorites to show initial state

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 19: Add Favorite Button to Detail Page

**Files:**
- Modify: `app/[community]/marketplace/[id]/page.tsx`
- Modify: `components/marketplace/classified-detail-view.tsx`

**Step 1: Update detail page to fetch favorite status**

In `app/[community]/marketplace/[id]/page.tsx`:
```typescript
// Check if user has favorited
let isFavorited = false
if (user) {
  const { data: favorite } = await supabase
    .from('classified_favorites')
    .select('id')
    .eq('user_id', user.id)
    .eq('classified_id', classified.id)
    .maybeSingle()

  isFavorited = !!favorite
}

// Pass to component
<ClassifiedDetailView
  classified={classified}
  userId={user?.id}
  isFavorited={isFavorited}
/>
```

**Step 2: Update detail view component**

In `components/marketplace/classified-detail-view.tsx`, add favorite button:
```typescript
interface ClassifiedDetailViewProps {
  classified: ClassifiedWithRelations
  userId?: string | null
  isFavorited?: boolean
}

// In the details card, below WhatsApp button:
{userId && (
  <FavoriteButton
    classifiedId={classified.id}
    initialFavorited={isFavorited || false}
    size="lg"
    showLabel
    userId={userId}
  />
)}
```

**Step 3: Commit**

```bash
git add app/[community]/marketplace/[id]/page.tsx components/marketplace/classified-detail-view.tsx
git commit -m "feat(marketplace): add favorite button to detail page

- Large favorite button with label below WhatsApp CTA
- Shows initial favorited state from database
- Only visible to authenticated users

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 20: Integration Testing & Bug Fixes

**Files:**
- Various (as needed)

**Step 1: Test complete flow**

Manual testing checklist:
1. Create new classified
   - [ ] Form validation works
   - [ ] Image upload works (1-5 images)
   - [ ] Category selection required
   - [ ] WhatsApp validation
   - [ ] Redirects to dashboard on success
2. Edit classified
   - [ ] Pre-fills with existing data
   - [ ] Can update all fields
   - [ ] Can add/remove images
   - [ ] Saves correctly
3. Mark as sold
   - [ ] Changes status badge
   - [ ] Removes from public marketplace
   - [ ] Shows in "Vendidos" filter
4. Reactivate
   - [ ] Returns to active
   - [ ] Visible in marketplace again
5. Delete
   - [ ] Shows confirmation dialog
   - [ ] Removes completely
   - [ ] Cascades to favorites
6. Favorites
   - [ ] Toggle works on cards
   - [ ] Toggle works on detail
   - [ ] Shows in favorites tab
   - [ ] Unfavorite removes from tab
7. Dashboard tabs
   - [ ] Counts are accurate
   - [ ] Tab switching works
   - [ ] URL updates

**Step 2: Fix any bugs found**

Create commits for each bug fix with clear description

**Step 3: Performance check**

Run: `npm run build`
Check for:
- TypeScript errors
- Build warnings
- Bundle size

**Step 4: Final commit**

```bash
git add .
git commit -m "test(marketplace): complete integration testing

- Verified all user flows end-to-end
- Fixed [list any bugs found]
- Confirmed TypeScript strict mode compliance
- No console errors in production build

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 21: Documentation Updates

**Files:**
- Modify: `CLAUDE.md`
- Modify: `USE-CASES-BY-ROLE.md`

**Step 1: Update CLAUDE.md**

Update Phase 4 section:
```markdown
### Phase 4: Marketplace (Clasificados - COMPLETE)
- [x] Database schema (marketplace_categories, classifieds, marketplace_user_bans, classified_favorites)
- [x] RLS policies for community isolation
- [x] Admin moderation panel with full CRUD
- [x] Public marketplace hub (browse, filter, search, detail view)
- [x] **User CRUD operations (create, edit, delete, mark sold, reactivate)**
- [x] **Unified dashboard with tabs (Business | Classifieds | Favorites)**
- [x] **Favorites/wishlist system**
- [x] **Image gallery upload (1-5 images required)**
- [x] **Single-page form with validation**
- [x] **Server Actions architecture (Next.js 15+ pattern)**
- [ ] **Next:** Featured classified listings (paid monetization)
```

**Step 2: Update USE-CASES-BY-ROLE.md**

Mark user features as complete:
```markdown
### Phase 4: Marketplace (Clasificados)
- [x] Create new classified listing
- [x] Upload photos for classified
- [x] Edit own classified listing
- [x] Delete own classified listing
- [x] Mark own classified as sold
- [x] View own classifieds list
- [x] Save favorite classifieds
```

**Step 3: Commit**

```bash
git add CLAUDE.md USE-CASES-BY-ROLE.md
git commit -m "docs: update marketplace user features as complete

Phase 4 marketplace user features fully implemented:
- Complete CRUD for classifieds
- Favorites system
- Unified dashboard
- Server Actions pattern

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Summary

**Total Tasks:** 21
**Estimated Time:** 8-10 days (assuming 1 developer working full-time)

**Key Deliverables:**
1. ✅ Database migration for favorites
2. ✅ 6 Server Actions (create, update, delete, sold, reactivate, favorite)
3. ✅ Unified dashboard with 3 tabs
4. ✅ Complete create/edit form with image upload
5. ✅ User classified card with all actions
6. ✅ Favorites system integrated
7. ✅ All validations and error handling
8. ✅ Integration testing completed
9. ✅ Documentation updated

**Architecture Highlights:**
- Server Actions for all mutations (type-safe, performant)
- RLS enforces permissions at database level
- Optimistic UI for favorites (instant feedback)
- Single-page form (faster UX than multi-step)
- Reusable components (DRY principle)
- Rate limiting prevents spam (5/day)
- Image validation (size, type, count)

**Security:**
- All actions check authentication
- Ownership verified before update/delete
- Ban status checked on create
- XSS prevention via DOMPurify
- RLS policies enforce community isolation
- Image URLs validated (Supabase storage only)

**Next Phase:**
- Featured classifieds (monetization)
- Analytics dashboard (views, clicks)
- Enhanced search with filters
- Server-side pagination (if > 100 classifieds)
