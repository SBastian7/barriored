# Marketplace User Features - Design Document

**Date:** 2026-03-12
**Author:** Claude Code
**Status:** Approved
**Phase:** Phase 4 - Marketplace (Clasificados) - Registered User Features

## Executive Summary

This document outlines the design for marketplace features that enable registered neighbor users to create, manage, and interact with classified listings in BarrioRed. Building on the completed admin moderation and anonymous browsing features, this phase empowers community members to actively participate in the local marketplace economy.

## Requirements Summary

Registered users (neighbors) must be able to:
- ✅ Create new classified listings (with 1-5 images required)
- ✅ Upload photos for classifieds
- ✅ Edit own classified listings
- ✅ Delete own classified listings
- ✅ Mark own classifieds as sold
- ✅ View own classifieds list (unified dashboard)
- ✅ Save favorite classifieds (wishlist/bookmarks)
- ✅ Reactivate archived classifieds

## Key Design Decisions

### 1. Architecture Pattern
**Decision:** Server Actions + Server Components (Next.js 15+ pattern)
**Rationale:**
- Modern Next.js approach, aligns with existing codebase patterns
- Type-safe end-to-end with TypeScript
- Less code than REST APIs (no separate API routes)
- Better performance (no API serialization overhead)
- Automatic revalidation with `revalidatePath()`
- Simpler error handling (return values vs HTTP codes)

**Trade-off accepted:** Cannot test with Postman, but gain simplicity and type safety.

### 2. Dashboard Structure
**Decision:** Unified dashboard with tabs
**Rationale:**
- Users may be both business owners AND marketplace participants
- Single entry point for all user content management
- Tabs: "Mi Negocio" | "Mis Clasificados" | "Favoritos"
- Better UX than separate dashboards

### 3. Form Pattern
**Decision:** Single page form (not multi-step wizard)
**Rationale:**
- Classifieds are simpler than businesses (no map, no hours)
- Faster to complete
- All fields visible at once
- Better for quick marketplace listings

### 4. Image Requirement
**Decision:** Require at least 1 image (1-5 images)
**Rationale:**
- Listings with images perform better
- Matches marketplace best practices
- Prevents low-effort spam
- More professional appearance

### 5. Favorites Feature
**Decision:** Include in first iteration
**Rationale:**
- Provides complete user experience
- Common marketplace pattern
- Low complexity (simple join table)
- High value for users

### 6. Reactivation
**Decision:** Allow reactivating archived classifieds
**Rationale:**
- Good for seasonal items or recurring needs
- Resets 60-day auto-archive timer
- Better UX than forcing recreation

---

## Database Schema

### New Table: `classified_favorites`

Users can bookmark/save classifieds they're interested in.

```sql
CREATE TABLE classified_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  classified_id UUID NOT NULL REFERENCES classifieds(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate favorites
  UNIQUE(user_id, classified_id)
);

CREATE INDEX idx_favorites_user ON classified_favorites(user_id, created_at DESC);
CREATE INDEX idx_favorites_classified ON classified_favorites(classified_id);
```

### RLS Policies for Favorites

```sql
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

### Existing Tables

No modifications needed to `classifieds` table - already has all required fields and RLS policies from admin implementation.

---

## File Structure & Routes

### Dashboard Routes

**Modified:**
```
app/dashboard/
  └── page.tsx                          # NOW: Tab container (Business | Classifieds | Favorites)
```

**New:**
```
app/dashboard/
  └── marketplace/
      ├── new/page.tsx                  # Create new classified
      ├── [id]/edit/page.tsx            # Edit own classified
      └── favorites/page.tsx            # View saved classifieds
```

### Server Actions

```
app/actions/
  └── classified-actions.ts             # All marketplace Server Actions
      ├── createClassifiedAction()
      ├── updateClassifiedAction()
      ├── deleteClassifiedAction()
      ├── markAsSoldAction()
      ├── reactivateClassifiedAction()
      └── toggleFavoriteAction()
```

### Components

**New:**
```
components/marketplace/
  ├── classified-form.tsx               # Create/edit form
  ├── image-gallery-upload.tsx          # Multi-image upload
  ├── favorite-button.tsx               # Heart icon toggle
  └── user-classified-card.tsx          # Card with edit/delete actions

components/dashboard/
  └── dashboard-tabs.tsx                # Tab navigation component
```

**Reused (with adaptations):**
```
components/marketplace/
  ├── classified-card.tsx               # Add 'user-dashboard' variant
  ├── classified-grid.tsx               # Reuse as-is
  └── classified-status-badge.tsx       # Reuse as-is
```

---

## Dashboard UI/UX (Neo-Brutalist Tropical)

### Main Dashboard Structure

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│ PANEL DE CONTROL (large heading)                    │
├─────────────────────────────────────────────────────┤
│ [Mi Negocio] [Mis Clasificados (3)] [Favoritos (5)] │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Tab Content Area                                    │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**Tab Design:**
- Uppercase labels, `tracking-widest`
- Active: 4px bottom border (primary color) + bold
- Inactive: `text-black/60` + hover lift
- Count badges: secondary bg, 2px border, rotated -2deg
- Mobile: horizontal scroll

### "Mis Clasificados" Tab

**Header Bar:**
- Title: "MIS CLASIFICADOS"
- Stats: "X activos · Y vendidos · Z archivados"
- CTA button: "PUBLICAR NUEVO" (primary bg, brutalist button)

**Status Filter Pills:**
- "Todos" | "Activos" | "Vendidos" | "Archivados"
- Brutalist buttons, active gets primary bg
- Show count in each pill

**Classifieds Grid:**
- Responsive: 3 cols (lg), 2 cols (md), 1 col (mobile)
- Empty state: "No tienes clasificados. ¡Publica tu primer artículo!"

### User Classified Card

**Layout:**
```
┌───────────────────────────────────────┐
│ [Thumbnail]  │ TÍTULO                 │
│ 120x120      │ $200,000               │
│ [Badge]      │ Hace 2 días            │
│              │                        │
│              │ [Ver] [Editar]         │
│              │ [Vendido] [Eliminar]   │
└───────────────────────────────────────┘
```

**Elements:**
- 2px black border, 4px shadow
- Status badge: active (green), sold (yellow), archived (gray)
- Quick actions: Icon buttons with tooltips
- Hover: lift effect
- Archived: 60% opacity

### "Favoritos" Tab

**Grid:**
- Same layout as classifieds tab
- Cards show: thumbnail, title, price, seller name
- Filled heart button (click to unfavorite)
- Empty state: "No tienes favoritos guardados. Explora el marketplace..."

---

## Create Classified Flow

### Route: `/app/dashboard/marketplace/new/page.tsx`

**Form Structure (Single Page):**

```tsx
<form action={createClassifiedAction}>
  {/* Section 1: Category */}
  <CategorySelector
    categories={marketplaceCategories}
    required
  />

  {/* Section 2: Basic Info */}
  <Input name="title" label="Título" required maxLength={100} />
  <Textarea name="description" label="Descripción" required maxLength={1000} />
  <Input name="price" label="Precio (opcional)" placeholder="$50,000 o 'Negociable'" />

  {/* Section 3: Images (REQUIRED - at least 1) */}
  <ImageGalleryUpload
    maxImages={5}
    required
    minImages={1}
    bucket="marketplace-images"
  />

  {/* Section 4: Contact */}
  <PhoneInput name="whatsapp" label="WhatsApp" required />

  {/* Submit */}
  <Button type="submit" className="brutalist-button bg-primary w-full">
    Publicar Clasificado
  </Button>
</form>
```

### Category Selector

**Design (Brutalist Radio Cards):**
```
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ 🛒 VENDO    │ │ 🛍️ COMPRO   │ │ 🏠 ARRIENDO │
└─────────────┘ └─────────────┘ └─────────────┘
┌─────────────┐ ┌─────────────┐
│ 🔧 SERVICIOS│ │ 💼 TRABAJO  │
└─────────────┘ └─────────────┘
```

- Large clickable cards (150px height)
- Icon + label + description
- Active: primary border (4px), shadow lift
- Inactive: black border (2px)

### Image Upload Component

**Features:**
- Drag & drop zone (brutalist border)
- Multiple file selection
- Upload up to 5 images (1 minimum required)
- Thumbnails in grid with delete buttons
- Reorder by drag & drop
- Progress indicator per image

**Validation:**
- Max 5MB per image
- Types: JPG, PNG, WebP only
- Client-side validation before upload

### Validation Rules

**Client-side:**
- Title: 10-100 characters, required
- Description: 20-1000 characters, required
- Images: 1-5 images, required (at least 1)
- WhatsApp: Valid Colombian phone format, required
- Price: Optional, alphanumeric + symbols
- Category: Required selection

**Server-side:**
- Same as client
- Check user not banned
- Sanitize HTML in description
- Verify image URLs from Supabase storage
- Rate limit: max 5 classifieds per user per day

### Success Flow

```
User fills form → Submits
  ↓
Server Action validates + inserts
  ↓
Redirect to /dashboard?tab=marketplace
  ↓
Toast: "¡Clasificado publicado!"
  ↓
Show in "Mis Clasificados" tab (status: active)
```

### Error Handling

**Banned user:**
- Show error banner with reason and expiration date
- Disable form, hide submit button

**Validation errors:**
- Inline errors below fields (red text, primary border)
- Scroll to first error
- Toast summary

**Upload errors:**
- Show error below upload zone
- Allow retry without losing form data

---

## Edit/Delete/Mark Sold Flows

### Edit Flow: `/app/dashboard/marketplace/[id]/edit/page.tsx`

**Same form as create, but:**
- Pre-filled with existing data
- Shows existing images (deletable)
- Can add more images (up to 5 total)
- Can reorder images
- Updates via `updateClassifiedAction`

**Server Action:**
```typescript
async function updateClassifiedAction(id: string, formData: FormData) {
  // Verify ownership (RLS + explicit check)
  // Validate fields
  // Update classifieds table
  // revalidatePath('/dashboard')
  // revalidatePath(`/${community}/marketplace/${id}`)
}
```

### Delete Flow

**Trigger:** Delete icon (X) on dashboard card

**Confirmation Dialog:**
```tsx
<AlertDialog>
  <AlertDialogTitle>¿Eliminar Clasificado?</AlertDialogTitle>
  <AlertDialogDescription>
    Esta acción no se puede deshacer.
  </AlertDialogDescription>
  <AlertDialogFooter>
    <AlertDialogCancel>Cancelar</AlertDialogCancel>
    <AlertDialogAction onClick={() => deleteClassifiedAction(id)}>
      Sí, Eliminar
    </AlertDialogAction>
  </AlertDialogFooter>
</AlertDialog>
```

**Server Action:**
```typescript
async function deleteClassifiedAction(id: string) {
  // Verify ownership (RLS enforces)
  // Hard delete from DB
  // CASCADE deletes related favorites
  // revalidatePath('/dashboard')
}
```

**Result:**
- Toast: "Clasificado eliminado"
- Card animates out
- Update count badge

### Mark as Sold Flow

**Trigger:** "Marcar como Vendido" button

**No confirmation needed** (reversible)

**Server Action:**
```typescript
async function markAsSoldAction(id: string) {
  // Verify ownership
  // Update: status = 'sold', sold_at = NOW()
  // revalidatePath('/dashboard')
  // revalidatePath(`/${community}/marketplace`)
}
```

**UI Changes:**
- Badge changes to "VENDIDO" (yellow)
- Moves to "Vendidos" filter
- Hidden from public marketplace
- Button changes to "Reactivar"

### Reactivate Flow

**Trigger:** "Reactivar" button on sold/archived

**Server Action:**
```typescript
async function reactivateClassifiedAction(id: string) {
  // Verify ownership
  // Update: status = 'active', last_activity_at = NOW()
  // Clear sold_at / archived_at
  // revalidatePath('/dashboard')
}
```

**Result:**
- Returns to active listings
- Visible in public marketplace again
- Resets 60-day archive timer

---

## Favorites Feature

### Favorite Button Component

**Location:** Public marketplace cards + detail page

**UI (Brutalist):**
```tsx
<button
  className={cn(
    "brutalist-button p-2",
    isFavorited ? "bg-primary text-white" : "bg-white"
  )}
>
  <Heart className={isFavorited && "fill-current"} />
</button>
```

**States:**
- Unfavorited: empty heart, white bg
- Favorited: filled heart, primary bg
- Loading: spinner
- Not logged in: redirect to login

### Toggle Favorite Server Action

```typescript
async function toggleFavoriteAction(classifiedId: string) {
  // Check auth
  // Check if already favorited
  if (existing) {
    // Remove favorite
    await supabase.from('classified_favorites').delete().eq('id', existing.id)
    return { favorited: false }
  } else {
    // Add favorite
    await supabase.from('classified_favorites').insert(...)
    return { favorited: true }
  }
  revalidatePath('/dashboard')
}
```

### Favorites Dashboard Tab

**Server Component fetches:**
```typescript
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
  .eq('user_id', user.id)
  .order('created_at', { ascending: false })
```

**Grid:**
- Same layout as classifieds
- Shows: thumbnail, title, price, seller, date saved
- Filled heart button (click to unfavorite)

**Empty state:**
"Sin Favoritos. Guarda clasificados que te interesen..."

### Integration Points

1. **Public Marketplace Hub:** Heart button on each card (top-right)
2. **Detail Page:** Large heart button below WhatsApp
3. **Dashboard Badge:** "Favoritos (12)" count

### Edge Cases

- **Classified deleted:** Show placeholder "Ya no disponible"
- **Not logged in:** Redirect to login on click
- **Own classified:** Hide heart button

---

## Server Actions Architecture

### File: `app/actions/classified-actions.ts`

**All actions in one file:**

### 1. createClassifiedAction

```typescript
'use server'

export async function createClassifiedAction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'No autenticado' }

  // Get user's community_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('community_id')
    .eq('id', user.id)
    .single()

  // Check if banned
  const { data: ban } = await supabase
    .from('marketplace_user_bans')
    .select('reason, expires_at')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (ban && (!ban.expires_at || new Date(ban.expires_at) > new Date())) {
    return { error: `Estás suspendido. Razón: ${ban.reason}` }
  }

  // Extract form data
  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const price = formData.get('price') as string | null
  const whatsapp = formData.get('whatsapp') as string
  const category_id = formData.get('category_id') as string
  const images = formData.getAll('images') as string[]

  // Validation
  if (!title || title.length < 10 || title.length > 100) {
    return { error: 'Título debe tener entre 10 y 100 caracteres' }
  }

  if (!description || description.length < 20 || description.length > 1000) {
    return { error: 'Descripción debe tener entre 20 y 1000 caracteres' }
  }

  if (!images || images.length === 0) {
    return { error: 'Debes subir al menos 1 imagen' }
  }

  if (images.length > 5) {
    return { error: 'Máximo 5 imágenes' }
  }

  // Rate limiting check
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const { count } = await supabase
    .from('classifieds')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', today.toISOString())

  if (count && count >= 5) {
    return { error: 'Límite diario alcanzado (5 clasificados por día)' }
  }

  // Insert
  const { data, error } = await supabase
    .from('classifieds')
    .insert({
      community_id: profile.community_id,
      user_id: user.id,
      category_id,
      title,
      description,
      price: price || null,
      whatsapp,
      images,
      status: 'active'
    })
    .select()
    .single()

  if (error) {
    console.error('Insert error:', error)
    return { error: 'Error al crear clasificado' }
  }

  revalidatePath('/dashboard')
  revalidatePath('/[community]/marketplace', 'page')
  redirect('/dashboard?tab=marketplace')
}
```

### 2. updateClassifiedAction

```typescript
'use server'

export async function updateClassifiedAction(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'No autenticado' }

  // Verify ownership
  const { data: existing } = await supabase
    .from('classifieds')
    .select('user_id')
    .eq('id', id)
    .single()

  if (!existing || existing.user_id !== user.id) {
    return { error: 'No autorizado' }
  }

  // Extract and validate (same as create)
  const updates = {
    title: formData.get('title') as string,
    description: formData.get('description') as string,
    price: formData.get('price') as string | null,
    whatsapp: formData.get('whatsapp') as string,
    category_id: formData.get('category_id') as string,
    images: formData.getAll('images') as string[],
    updated_at: new Date().toISOString()
  }

  // Validate...

  const { error } = await supabase
    .from('classifieds')
    .update(updates)
    .eq('id', id)

  if (error) {
    return { error: 'Error al actualizar' }
  }

  revalidatePath('/dashboard')
  revalidatePath(`/[community]/marketplace/${id}`, 'page')

  return { success: true }
}
```

### 3. deleteClassifiedAction

```typescript
'use server'

export async function deleteClassifiedAction(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'No autenticado' }

  // RLS enforces ownership
  const { error } = await supabase
    .from('classifieds')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return { error: 'Error al eliminar' }
  }

  revalidatePath('/dashboard')
  revalidatePath('/[community]/marketplace', 'page')

  return { success: true }
}
```

### 4. markAsSoldAction

```typescript
'use server'

export async function markAsSoldAction(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase
    .from('classifieds')
    .update({
      status: 'sold',
      sold_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return { error: 'Error al marcar como vendido' }
  }

  revalidatePath('/dashboard')
  revalidatePath('/[community]/marketplace', 'page')

  return { success: true }
}
```

### 5. reactivateClassifiedAction

```typescript
'use server'

export async function reactivateClassifiedAction(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'No autenticado' }

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
    return { error: 'Error al reactivar' }
  }

  revalidatePath('/dashboard')
  revalidatePath('/[community]/marketplace', 'page')

  return { success: true }
}
```

### 6. toggleFavoriteAction

```typescript
'use server'

export async function toggleFavoriteAction(classifiedId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Debes iniciar sesión' }
  }

  // Check if already favorited
  const { data: existing } = await supabase
    .from('classified_favorites')
    .select('id')
    .eq('user_id', user.id)
    .eq('classified_id', classifiedId)
    .maybeSingle()

  if (existing) {
    // Remove
    await supabase
      .from('classified_favorites')
      .delete()
      .eq('id', existing.id)

    revalidatePath('/dashboard')
    return { favorited: false }
  } else {
    // Add
    const { error } = await supabase
      .from('classified_favorites')
      .insert({ user_id: user.id, classified_id: classifiedId })

    if (error) {
      return { error: 'Error al guardar favorito' }
    }

    revalidatePath('/dashboard')
    return { favorited: true }
  }
}
```

---

## Component Reuse Strategy

### Adapt Existing Components

**1. ClassifiedCard** - Add `variant` prop:
- `'admin'` - Admin panel actions
- `'public'` - Favorite button only
- `'user-dashboard'` - User actions (edit, delete, mark sold)

**2. ClassifiedGrid** - Reuse as-is:
- Dashboard "Mis Clasificados" tab
- Dashboard "Favoritos" tab

**3. ClassifiedStatusBadge** - Reuse as-is

### New Components

**1. ClassifiedForm** - Single form for create + edit
**2. ImageGalleryUpload** - Multi-image upload with drag & drop
**3. FavoriteButton** - Heart toggle with optimistic UI
**4. DashboardTabs** - Tab navigation with counts

---

## Validation & Error Handling

### Client-Side Validation

**Immediate feedback, prevent bad requests:**

```typescript
const [errors, setErrors] = useState<Record<string, string>>({})

function validateForm(formData: FormData): boolean {
  const newErrors: Record<string, string> = {}

  // Title
  const title = formData.get('title') as string
  if (!title || title.length < 10) {
    newErrors.title = 'Título debe tener al menos 10 caracteres'
  } else if (title.length > 100) {
    newErrors.title = 'Título no puede exceder 100 caracteres'
  }

  // Description
  const description = formData.get('description') as string
  if (!description || description.length < 20) {
    newErrors.description = 'Descripción debe tener al menos 20 caracteres'
  } else if (description.length > 1000) {
    newErrors.description = 'Descripción no puede exceder 1000 caracteres'
  }

  // Images
  const images = formData.getAll('images') as string[]
  if (images.length === 0) {
    newErrors.images = 'Debes subir al menos 1 imagen'
  } else if (images.length > 5) {
    newErrors.images = 'Máximo 5 imágenes'
  }

  // WhatsApp
  const whatsapp = formData.get('whatsapp') as string
  if (!/^\+?57[0-9]{10}$/.test(whatsapp.replace(/\s/g, ''))) {
    newErrors.whatsapp = 'WhatsApp debe ser un número colombiano válido'
  }

  setErrors(newErrors)
  return Object.keys(newErrors).length === 0
}
```

### Server-Side Validation

**Same rules, plus:**
- XSS prevention (sanitize HTML)
- Rate limiting (5 classifieds per day)
- Ban check
- Image URL verification (Supabase storage only)

### Error Display (Brutalist)

**Inline errors:**
```tsx
<Input
  name="title"
  className={cn("brutalist-input", errors.title && "border-primary bg-primary/5")}
/>
{errors.title && (
  <p className="text-xs font-bold text-primary uppercase tracking-widest">
    {errors.title}
  </p>
)}
```

**Toast notifications:**
```typescript
toast.success('¡Clasificado publicado!')
toast.error('Error al publicar', { description: result.error })
toast.warning('Revisa el formulario')
```

### Image Upload Errors

- **Too large:** "Imagen muy grande (máximo 5MB)"
- **Invalid type:** "Solo JPG, PNG y WebP"
- **Upload failed:** "Error al subir. Intenta nuevamente"
- **Max exceeded:** "Límite alcanzado. Elimina una para subir otra"

### Ban Status Handling

**Check on page load:**
```tsx
if (ban && (!ban.expires_at || new Date(ban.expires_at) > new Date())) {
  return (
    <div className="brutalist-card p-8 border-primary bg-primary/5">
      <h2>Cuenta Suspendida</h2>
      <p><strong>Razón:</strong> {ban.reason}</p>
      {ban.expires_at && <p>Hasta: {date}</p>}
    </div>
  )
}
```

---

## Security & RLS

### Existing RLS Policies (No Changes Needed)

**Classifieds table:**
- ✅ Users view active/sold in their community
- ✅ Users insert if not banned (checked by RLS)
- ✅ Users update/delete only own
- ✅ Admins manage all in community

**New: Favorites table:**
- ✅ Users view only own favorites
- ✅ Users add/remove only own favorites

### Server Action Security

**All actions check:**
1. Authentication (`auth.uid()` exists)
2. Ownership (for update/delete)
3. Ban status (for create)
4. Rate limits (for create)

### Input Sanitization

**XSS Prevention:**
```typescript
import DOMPurify from 'isomorphic-dompurify'

const sanitizedDescription = DOMPurify.sanitize(description, {
  ALLOWED_TAGS: [],
  ALLOWED_ATTR: []
})
```

**Image URL Validation:**
```typescript
const SUPABASE_STORAGE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL + '/storage/v1/object/public/'

function validateImageUrls(urls: string[]): boolean {
  return urls.every(url => url.startsWith(SUPABASE_STORAGE_URL))
}
```

### Rate Limiting

**Per-user daily limit:**
```typescript
const today = new Date()
today.setHours(0, 0, 0, 0)

const { count } = await supabase
  .from('classifieds')
  .select('id', { count: 'exact', head: true })
  .eq('user_id', user.id)
  .gte('created_at', today.toISOString())

if (count && count >= 5) {
  return { error: 'Límite diario alcanzado (5 por día)' }
}
```

### Authorization Matrix

| Operation | Anonymous | Auth User | Owner | Admin |
|-----------|-----------|-----------|-------|-------|
| View active/sold | ✅ | ✅ | ✅ | ✅ |
| View flagged | ❌ | ❌ | ❌ | ✅ |
| Create | ❌ | ✅ (not banned) | - | ✅ |
| Edit | ❌ | ❌ | ✅ | ✅ |
| Delete | ❌ | ❌ | ✅ | ✅ |
| Mark sold | ❌ | ❌ | ✅ | ✅ |
| Favorite | ❌ | ✅ | ✅ | ✅ |

### Defense in Depth

**Multiple security layers:**
1. Client validation (UX feedback)
2. Server Action validation (business logic)
3. RLS policies (database enforcement)
4. Type safety (TypeScript)

---

## Migration Strategy

### Phase 1: Database (Day 1)
1. Create migration: `20260312_add_classified_favorites.sql`
2. Create `classified_favorites` table
3. Add RLS policies
4. Add indexes
5. Test policies with SQL queries

### Phase 2: Server Actions (Day 2)
1. Create `app/actions/classified-actions.ts`
2. Implement all 6 actions
3. Add validation, error handling, rate limiting
4. Test with manual calls

### Phase 3: Dashboard Structure (Day 3)
1. Modify `app/dashboard/page.tsx` to tab container
2. Create `DashboardTabs` component
3. Add status filter pills
4. Test tab navigation

### Phase 4: Create Flow (Day 4-5)
1. Create `app/dashboard/marketplace/new/page.tsx`
2. Build `ClassifiedForm` component
3. Build `ImageGalleryUpload` component
4. Build `CategorySelector` component
5. Wire up to `createClassifiedAction`
6. Test complete create flow

### Phase 5: Edit/Delete/Sold (Day 6)
1. Create `app/dashboard/marketplace/[id]/edit/page.tsx`
2. Adapt form for edit mode
3. Add delete confirmation dialog
4. Add mark sold button
5. Add reactivate button
6. Test all flows

### Phase 6: Favorites (Day 7)
1. Create `app/dashboard/marketplace/favorites/page.tsx`
2. Build `FavoriteButton` component
3. Add to public marketplace cards
4. Add to detail page
5. Wire up to `toggleFavoriteAction`
6. Test favorites tab

### Phase 7: Component Adaptation (Day 8)
1. Add `variant` prop to `ClassifiedCard`
2. Implement user-dashboard variant logic
3. Build `UserClassifiedCard` if needed
4. Test all card variants

### Phase 8: Integration & Polish (Day 9-10)
1. End-to-end testing all flows
2. Mobile responsiveness check
3. Error handling verification
4. Security audit
5. Performance testing
6. Documentation updates

---

## Success Metrics

### MVP Completion Criteria

- ✅ Users can create classifieds with 1-5 images
- ✅ Users can edit own classifieds
- ✅ Users can delete own classifieds (with confirmation)
- ✅ Users can mark as sold (reversible)
- ✅ Users can reactivate archived listings
- ✅ Users can favorite/unfavorite classifieds
- ✅ Unified dashboard with 3 tabs working
- ✅ Banned users blocked from creating
- ✅ Rate limiting prevents spam (5/day)
- ✅ All validation working (client + server)
- ✅ Mobile responsive
- ✅ No TypeScript errors (no `any` types)
- ✅ Neo-brutalist design consistent

### Performance Targets

- Dashboard loads in < 2 seconds
- Form submission responds in < 1 second
- Image upload < 3 seconds per image
- Tab switching instant (client-side)
- Favorite toggle instant (optimistic UI)

### Quality Targets

- TypeScript strict mode (no `any`)
- Proper types from database schema
- All Server Actions have error handling
- Spanish error messages
- Brutalist design throughout
- Accessibility (ARIA labels)

---

## Future Enhancements (Out of Scope)

### Phase 2: Monetization
- Featured classifieds (paid promotion)
- Boost/bump listings (paid visibility)
- Analytics dashboard (views, WhatsApp clicks)

### Phase 3: Social Features
- Share on social media
- Report inappropriate content (users)
- User ratings/reputation
- Private messaging

### Phase 4: Advanced Features
- Price range filter
- Sort options (newest, price)
- Server-side pagination (if > 100 classifieds)
- Saved searches with alerts
- Duplicate detection

---

## Conclusion

This design provides a complete marketplace experience for registered users, empowering community members to actively participate in the local economy. By using Server Actions, we achieve:

1. **Simplicity:** Less code, single source of truth
2. **Type Safety:** End-to-end TypeScript
3. **Performance:** No extra API layer
4. **Security:** RLS + validation + rate limiting
5. **UX:** Optimistic updates, instant feedback

The unified dashboard approach recognizes that users may be both business owners and marketplace participants, providing a cohesive content management experience.

The favorites feature adds a complete marketplace UX, allowing users to curate their own shopping lists and follow up with sellers when ready to purchase.

**Next Steps:** Proceed to implementation planning using the writing-plans skill.
