# Community Moderation Panel Enhancement - Design Document

**Date:** 2026-03-02
**Status:** Approved
**Approach:** Enhanced Existing Pages

---

## Executive Summary

Enhance the existing admin moderation panel to provide comprehensive community content management capabilities. This includes advanced filtering, full CRUD operations on community posts, alert editing with expiration dates, and improved navigation.

### Key Deliverables
1. Enhanced navigation with Community, Reports, Services links
2. Community posts filtering by type and status
3. Full post moderation (edit, delete, pin/unpin)
4. Alert editing with expiration date support
5. Auto-deactivation of expired alerts

---

## Current State Analysis

### ✅ Already Implemented
- Community posts moderation page (`/admin/community`)
- Individual post review with approve/reject (`/admin/community/[id]`)
- Alerts management with create/delete/toggle (`/admin/alerts`)
- Content reports dashboard and detail pages (`/admin/reports`)
- Push notifications for alerts

### ❌ Missing Features
- Filter posts by type (announcement/event/job) and status
- Edit and delete community posts
- Pin/unpin posts from admin panel
- Edit existing alerts
- Set alert expiration dates
- Navigation links for Community, Reports, Services

---

## Design Sections

## 1. Navigation Updates

### File: `components/admin/collapsible-sidebar.tsx`

**Current navItems:**
```typescript
const navItems = [
  { href: '/admin', label: 'Panel', icon: BarChart3 },
  { href: '/admin/businesses', label: 'Negocios', icon: Building2 },
  { href: '/admin/users', label: 'Usuarios', icon: Users },
  { href: '/admin/categories', label: 'Categorías', icon: FolderTree },
  { href: '/admin/alerts', label: 'Alertas', icon: Bell },
  { href: '/admin/statistics', label: 'Estadísticas', icon: BarChart3 },
]
```

**Updated navItems:**
```typescript
import { MessageSquare, Flag, Briefcase } from 'lucide-react'

const navItems = [
  { href: '/admin', label: 'Panel', icon: BarChart3 },
  { href: '/admin/businesses', label: 'Negocios', icon: Building2 },
  { href: '/admin/users', label: 'Usuarios', icon: Users },
  { href: '/admin/categories', label: 'Categorías', icon: FolderTree },
  { href: '/admin/community', label: 'Comunidad', icon: MessageSquare },    // NEW
  { href: '/admin/alerts', label: 'Alertas', icon: Bell },
  { href: '/admin/reports', label: 'Reportes', icon: Flag },              // NEW
  { href: '/admin/services', label: 'Servicios', icon: Briefcase },       // NEW
  { href: '/admin/statistics', label: 'Estadísticas', icon: BarChart3 },
]
```

---

## 2. Community Posts Moderation

### 2A. Advanced Filtering UI

**File:** `app/admin/community/page.tsx`

**UI Structure:**
```
┌─────────────────────────────────────────────────────────────┐
│  Moderación de COMUNIDAD                                    │
├─────────────────────────────────────────────────────────────┤
│  [Filtros]  Tipo: [Todos▼] Estado: [Todos▼] [Limpiar]     │
├─────────────────────────────────────────────────────────────┤
│  ⏰ Pendientes de Revisión (5)                              │
│  [Posts filtered by selected criteria...]                   │
└─────────────────────────────────────────────────────────────┘
```

**Implementation:**
- Convert page to client component (`'use client'`)
- Add `useState` for filter values:
  ```typescript
  const [filters, setFilters] = useState({
    type: 'all', // all | announcement | event | job
    status: 'all' // all | pending | approved | rejected
  })
  ```
- Two Select dropdowns using Radix UI
- Filter logic applies to posts before rendering sections
- "Limpiar Filtros" button resets to defaults
- Show filtered count: "Mostrando X de Y publicaciones"

**Filter Options:**
- **Tipo:** Todos, Anuncios, Eventos, Empleos
- **Estado:** Todos, Pendiente, Aprobado, Rechazado

---

### 2B. Post Detail Actions

**File:** `app/admin/community/[id]/page.tsx`

**New Action Buttons** (in sidebar below Approve/Reject):

```typescript
<div className="space-y-4 pt-6 border-t-4 border-black">
  {/* Edit Button */}
  <Button
    onClick={() => setShowEditModal(true)}
    className="w-full brutalist-button bg-accent text-white"
  >
    <Edit className="mr-2 h-5 w-5" /> Editar Publicación
  </Button>

  {/* Pin/Unpin Button */}
  <Button
    onClick={handleTogglePin}
    disabled={processing}
    className="w-full brutalist-button bg-secondary text-black"
  >
    <Pin className="mr-2 h-5 w-5" />
    {post.is_pinned ? 'Desfijar' : 'Fijar'} Publicación
  </Button>

  {/* Delete Button */}
  <Button
    onClick={handleDelete}
    disabled={processing}
    variant="destructive"
    className="w-full brutalist-button"
  >
    <Trash2 className="mr-2 h-5 w-5" /> Eliminar Publicación
  </Button>
</div>
```

**Edit Modal:**
- Dialog component with form
- Pre-filled fields: title, content, image_url, metadata
- Conditional metadata fields based on post type:
  - Event: location, date
  - Job: category, salary_range, contact_method, contact_value
- Save button calls API: `PATCH /api/community/posts/[id]/edit`

**Pin/Unpin:**
- Toggles `is_pinned` field
- API: `POST /api/community/posts/[id]/pin`
- Updates badge display

**Delete:**
- Confirmation dialog with warning
- API: `DELETE /api/community/posts/[id]/delete`
- Hard delete from database
- Redirects to `/admin/community` after deletion

---

## 3. Alerts Management Enhancement

### 3A. Add Expiration Date Field

**File:** `app/admin/alerts/page.tsx`

**Update form state:**
```typescript
const [formData, setFormData] = useState({
  community_id: '',
  type: 'general',
  title: '',
  description: '',
  severity: 'info',
  is_active: true,
  ends_at: ''  // NEW - datetime string
})
```

**New form field:**
```typescript
<div className="space-y-1">
  <Label className="text-[10px] font-black uppercase tracking-widest text-black/40">
    Fecha de Expiración (Opcional)
  </Label>
  <Input
    type="datetime-local"
    value={formData.ends_at}
    onChange={e => setFormData({ ...formData, ends_at: e.target.value })}
    className="brutalist-input"
  />
  <p className="text-[9px] text-black/40">
    Dejar vacío para alerta sin expiración
  </p>
</div>
```

---

### 3B. Edit Alert Functionality

**Add Edit Button** to each alert card:

```typescript
<button
  onClick={() => handleOpenEditModal(alert)}
  className="flex-1 flex items-center justify-center gap-2 text-[9px]
             font-black uppercase tracking-widest hover:bg-black/5
             transition-colors text-accent"
>
  <Edit className="h-3 w-3" /> Editar
</button>
```

**Edit Modal Structure:**
```typescript
const [editingAlert, setEditingAlert] = useState<Alert | null>(null)
const [editFormData, setEditFormData] = useState<AlertFormData>({...})

<Dialog open={editingAlert !== null} onOpenChange={() => setEditingAlert(null)}>
  <DialogContent className="border-4 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
    <DialogHeader>
      <DialogTitle className="font-heading font-black uppercase italic text-2xl">
        Editar Alerta
      </DialogTitle>
    </DialogHeader>

    {/* Same form fields as creation, pre-filled with current values */}

    <DialogFooter>
      <Button onClick={handleSaveEdit} className="brutalist-button">
        <Save className="h-4 w-4 mr-2" /> Guardar Cambios
      </Button>
      <Button
        variant="outline"
        onClick={() => setEditingAlert(null)}
        className="brutalist-button"
      >
        Cancelar
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Edit API call:**
```typescript
async function handleSaveEdit() {
  const response = await fetch(`/api/admin/alerts/${editingAlert.id}/edit`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(editFormData)
  })

  if (response.ok) {
    toast.success('✅ Alerta actualizada')
    setEditingAlert(null)
    fetchData()
  }
}
```

---

### 3C. Display Expiration Dates

**Update alert card** to show expiration info:

```typescript
{alert.ends_at && (
  <div className="text-[9px] font-black uppercase tracking-widest text-black/50 flex items-center gap-1">
    <Clock className="h-3 w-3" />
    Expira: {new Date(alert.ends_at).toLocaleString('es-CO', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })}
  </div>
)}

{alert.ends_at && new Date(alert.ends_at) < new Date() && (
  <Badge className="bg-black/20 text-black border-black">
    ⏱️ EXPIRADA
  </Badge>
)}
```

---

### 3D. Auto-Deactivation Implementation

**Create API Route:** `app/api/admin/alerts/check-expired/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('community_alerts')
    .update({ is_active: false })
    .eq('is_active', true)
    .not('ends_at', 'is', null)
    .lt('ends_at', new Date().toISOString())
    .select()

  if (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }

  return Response.json({
    success: true,
    deactivated: data?.length || 0
  })
}
```

**Call on Page Load:**

```typescript
useEffect(() => {
  // Auto-deactivate expired alerts before fetching
  fetch('/api/admin/alerts/check-expired', { method: 'POST' })
    .then(() => fetchData())
    .catch(() => fetchData()) // Fetch anyway even if check fails
}, [])
```

---

## 4. Technical Implementation

### 4A. New API Routes

**1. Edit Community Post**
- **Path:** `app/api/community/posts/[id]/edit/route.ts`
- **Method:** `PATCH`
- **Body:** `{ title, content, image_url, metadata }`
- **Auth:** Admin/Moderator only
- **Response:** Updated post object

**2. Delete Community Post**
- **Path:** `app/api/community/posts/[id]/delete/route.ts`
- **Method:** `DELETE`
- **Auth:** Admin only
- **Action:** Hard delete from database
- **Response:** `{ success: true }`

**3. Pin/Unpin Community Post**
- **Path:** `app/api/community/posts/[id]/pin/route.ts`
- **Method:** `POST`
- **Action:** Toggle `is_pinned` field
- **Auth:** Admin/Moderator only
- **Response:** Updated post object

**4. Edit Alert**
- **Path:** `app/api/admin/alerts/[id]/edit/route.ts`
- **Method:** `PATCH`
- **Body:** All alert fields including `ends_at`
- **Auth:** Admin only
- **Response:** Updated alert object

**5. Check Expired Alerts**
- **Path:** `app/api/admin/alerts/check-expired/route.ts`
- **Method:** `POST`
- **Action:** Set `is_active = false` for expired alerts
- **Auth:** Admin only
- **Response:** `{ success: true, deactivated: number }`

---

### 4B. Authorization Helper

**Create:** `lib/supabase/admin.ts` (if doesn't exist)

```typescript
import { createClient } from '@/lib/supabase/server'

export async function checkModeratorAccess() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'moderator'].includes(profile.role)) {
    throw new Error('Insufficient permissions')
  }

  return { user, profile }
}

export async function checkAdminAccess() {
  const { profile } = await checkModeratorAccess()

  if (profile.role !== 'admin') {
    throw new Error('Admin access required')
  }

  return profile
}
```

Use in all API routes:
```typescript
export async function POST(request: Request) {
  try {
    await checkAdminAccess()
    // ... route logic
  } catch (error) {
    return Response.json({ error: error.message }, { status: 403 })
  }
}
```

---

### 4C. Database Schema

**No changes required** - all fields already exist:
- ✅ `community_posts.is_pinned` (boolean)
- ✅ `community_alerts.ends_at` (timestamp)
- ✅ All status fields

**Optional future enhancement:**
- Add `last_edited_by` and `last_edited_at` to `community_posts` for audit trail

---

### 4D. Error Handling & Toast Messages

**Success messages:**
- "✅ Publicación editada correctamente"
- "✅ Publicación eliminada"
- "📌 Publicación fijada" / "Publicación desfijada"
- "✅ Alerta actualizada"
- "✅ Filtros aplicados"

**Error messages:**
- "❌ Error al editar publicación"
- "❌ Error al eliminar publicación"
- "❌ Error al actualizar alerta"

**Confirmations:**
- Delete post: "⚠️ ¿Eliminar esta publicación? Esta acción no se puede deshacer."

**Loading states:**
- Disable buttons while processing
- Show spinner: `<Loader2 className="animate-spin" />`

---

## 5. Implementation Flow

### Phase 1: Foundation (30 min)
1. Update `components/admin/collapsible-sidebar.tsx` with new nav items
2. Create `app/api/admin/alerts/check-expired/route.ts`
3. Create `lib/supabase/admin.ts` with auth helpers
4. Test navigation and auto-expiration

### Phase 2: Community Posts (60 min)
1. Convert `app/admin/community/page.tsx` to client component
2. Add filter UI (Select components for type/status)
3. Implement client-side filtering logic
4. Create API routes: `edit`, `delete`, `pin`
5. Update `app/admin/community/[id]/page.tsx`:
   - Add edit modal with form
   - Add pin/unpin button
   - Add delete button with confirmation
6. Test all CRUD operations

### Phase 3: Alerts Enhancement (45 min)
1. Add `ends_at` field to alert creation form
2. Create edit alert modal component
3. Create `app/api/admin/alerts/[id]/edit/route.ts`
4. Update alert cards to show expiration dates
5. Add edit button to each alert card
6. Integrate auto-expiration check on page load
7. Test edit functionality and auto-expiration

### Phase 4: Polish & Testing (30 min)
1. Add loading states to all buttons
2. Add error handling and toast notifications
3. Test all moderation workflows end-to-end
4. Verify permissions (admin/moderator only)
5. Check mobile responsiveness
6. Review brutalist design consistency

**Total estimate: 2.5-3 hours**

---

## 6. Testing Checklist

### Navigation
- [ ] Community link appears in sidebar
- [ ] Reports link appears in sidebar
- [ ] Services link appears in sidebar
- [ ] Active state highlights correctly
- [ ] Collapsed sidebar shows only icons

### Community Posts
- [ ] Filter by type: Todos, Anuncios, Eventos, Empleos
- [ ] Filter by status: Todos, Pendiente, Aprobado, Rechazado
- [ ] Combined filters work correctly
- [ ] "Limpiar Filtros" resets to defaults
- [ ] Filtered count displays correctly
- [ ] Edit modal opens with pre-filled data
- [ ] Edit saves correctly (title, content, metadata)
- [ ] Delete shows confirmation dialog
- [ ] Delete removes post and redirects
- [ ] Pin/unpin toggles correctly
- [ ] Pinned badge shows on pinned posts
- [ ] Only admin/moderator can access actions
- [ ] Unauthorized users get 403 error

### Alerts
- [ ] Create alert with expiration date
- [ ] Create alert without expiration (null ends_at)
- [ ] Edit modal opens with pre-filled data
- [ ] Edit saves all fields correctly
- [ ] Expiration date displays on cards
- [ ] Auto-deactivation runs on page load
- [ ] Expired alerts show "EXPIRADA" badge
- [ ] Expired alerts are grayed out
- [ ] Manual notification still works
- [ ] Toggle active/inactive still works

### Permissions
- [ ] Non-admin users cannot access API routes
- [ ] Moderators can edit/delete posts
- [ ] Only admins can delete alerts
- [ ] Error messages show for unauthorized access

---

## 7. Future Enhancements (Out of Scope)

These features can be added later:

1. **Bulk actions** - Select multiple posts to approve/reject/delete at once
2. **Edit history** - Track who edited what and when with full audit trail
3. **Scheduled alerts** - Add `starts_at` field for future-scheduled alerts
4. **Email notifications** - Notify post authors when their content is approved/rejected
5. **Moderation queue metrics** - Dashboard widget showing pending items count
6. **Quick actions** - Approve/reject directly from list view without opening detail
7. **Content versioning** - Keep history of edits with ability to restore
8. **Moderation notes** - Internal admin notes on posts/alerts
9. **Auto-moderation rules** - Flag content based on keywords/patterns
10. **Scheduled expiration reminders** - Notify admins before alerts expire

---

## 8. Rollout Strategy

### Deployment
1. Test thoroughly in development environment
2. Deploy to production during low-traffic hours
3. Monitor error logs for first 24 hours
4. Notify moderators of new features via admin announcement

### Rollback Plan
- All changes are additive (no breaking changes)
- Can disable new features by reverting navigation links
- Database schema unchanged (safe to rollback)
- API routes can be individually disabled if needed

### Success Metrics
- All moderation tasks can be completed without bugs
- Admin/moderator feedback is positive
- No unauthorized access attempts succeed
- Response time for moderation actions < 2 seconds

---

## Summary

This design enhances the existing admin moderation panel with:
1. ✅ Complete navigation (Community, Reports, Services)
2. ✅ Advanced post filtering (type + status)
3. ✅ Full post CRUD (edit, delete, pin/unpin)
4. ✅ Alert editing with expiration dates
5. ✅ Automatic expiration handling

All features build on existing pages, require no schema changes, and maintain the neo-brutalist tropical brand design.

**Estimated implementation time:** 2.5-3 hours
**Risk level:** Low (additive changes only)
**Dependencies:** None (all infrastructure exists)
