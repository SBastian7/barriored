# Phase 4: UX Enhancements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement drag-and-drop category reordering and finalize admin panel navigation

**Architecture:** Uses @dnd-kit/sortable for accessible drag-and-drop with keyboard support, auto-saves sort_order on drop via API route, updates UI optimistically

**Tech Stack:** @dnd-kit (core, sortable, utilities), React 19, Next.js 16 App Router, Supabase, TypeScript

---

## Task 1: Install @dnd-kit Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install @dnd-kit packages**

Run:
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

Expected output: Successfully installed packages with peer dependencies

**Step 2: Verify installation**

Run:
```bash
npm list @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

Expected: All three packages listed with versions

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install @dnd-kit for category drag-and-drop"
```

---

## Task 2: Create Sortable Category Item Component

**Files:**
- Create: `components/admin/sortable-category-item.tsx`

**Step 1: Create component file**

```typescript
'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Edit, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Category } from '@/lib/types/database'

interface SortableCategoryItemProps {
  category: Category
  onEdit: (category: Category) => void
  onDelete: (categoryId: string) => void
}

export function SortableCategoryItem({
  category,
  onEdit,
  onDelete,
}: SortableCategoryItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`brutalist-card p-4 flex items-center gap-4 ${
        isDragging ? 'opacity-50 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]' : ''
      }`}
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-2 hover:bg-secondary/20 rounded"
        aria-label="Reordenar categoría"
      >
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </button>

      {/* Category Icon */}
      <div className="flex-shrink-0 text-2xl">{category.icon}</div>

      {/* Category Info */}
      <div className="flex-1">
        <h3 className="font-bold">{category.name}</h3>
        <p className="text-sm text-muted-foreground">
          Orden: {category.sort_order}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit(category)}
          className="brutalist-button"
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onDelete(category.id)}
          className="brutalist-button"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
```

**Step 2: Verify component structure**

Check that:
- useSortable hook is properly configured
- Drag handle has correct listeners and attributes
- Visual feedback on isDragging (opacity + larger shadow)
- Accessible with aria-label

**Step 3: Commit**

```bash
git add components/admin/sortable-category-item.tsx
git commit -m "feat: create sortable category item component with @dnd-kit"
```

---

## Task 3: Create API Route for Sort Order Update

**Files:**
- Create: `app/api/admin/categories/reorder/route.ts`

**Step 1: Create reorder API route**

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkPermission } from '@/lib/auth/api-protection'

export async function PATCH(request: Request) {
  const supabase = await createClient()

  // Check permission
  const permissionCheck = await checkPermission(supabase, 'canManageCategories')
  if (!permissionCheck.authorized) {
    return NextResponse.json({ error: permissionCheck.error }, { status: permissionCheck.status })
  }

  try {
    const { reorderedCategories } = await request.json()

    if (!Array.isArray(reorderedCategories)) {
      return NextResponse.json(
        { error: 'reorderedCategories debe ser un array' },
        { status: 400 }
      )
    }

    // Update sort_order for each category
    const updates = reorderedCategories.map(async (item: { id: string; sort_order: number }) => {
      const { error } = await supabase
        .from('categories')
        .update({ sort_order: item.sort_order })
        .eq('id', item.id)

      if (error) throw error
    })

    await Promise.all(updates)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error reordering categories:', error)
    return NextResponse.json(
      { error: 'Error al reordenar categorías' },
      { status: 500 }
    )
  }
}
```

**Step 2: Test API route structure**

Verify:
- Permission check is first
- Request body validation
- Batch updates with Promise.all
- Error handling

**Step 3: Commit**

```bash
git add app/api/admin/categories/reorder/route.ts
git commit -m "feat: add API route for category reordering"
```

---

## Task 4: Rewrite Categories Page with Drag-and-Drop

**Files:**
- Modify: `app/admin/categories/page.tsx`

**Step 1: Update categories page with DndContext**

Replace entire file content:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SortableCategoryItem } from '@/components/admin/sortable-category-item'
import { createClient } from '@/lib/supabase/client'
import { checkClientPermission } from '@/lib/auth/permissions'
import type { Category } from '@/lib/types/database'

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [hasPermission, setHasPermission] = useState(false)
  const router = useRouter()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    checkPermissions()
    fetchCategories()
  }, [])

  async function checkPermissions() {
    const supabase = createClient()
    const canManage = await checkClientPermission(supabase, 'canManageCategories')
    setHasPermission(canManage)
    if (!canManage) {
      router.push('/admin')
    }
  }

  async function fetchCategories() {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error fetching categories:', error)
    } else {
      setCategories(data || [])
    }
    setLoading(false)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    const oldIndex = categories.findIndex((cat) => cat.id === active.id)
    const newIndex = categories.findIndex((cat) => cat.id === over.id)

    const reordered = arrayMove(categories, oldIndex, newIndex)

    // Update local state optimistically
    setCategories(reordered)

    // Update sort_order values
    const reorderedWithSortOrder = reordered.map((cat, index) => ({
      id: cat.id,
      sort_order: index + 1,
    }))

    // Persist to backend
    try {
      const response = await fetch('/api/admin/categories/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reorderedCategories: reorderedWithSortOrder }),
      })

      if (!response.ok) {
        throw new Error('Failed to reorder categories')
      }

      // Refresh to get updated sort_order from DB
      await fetchCategories()
    } catch (error) {
      console.error('Error reordering categories:', error)
      // Revert on error
      await fetchCategories()
    }
  }

  function handleEdit(category: Category) {
    // TODO: Implement edit dialog in next iteration
    console.log('Edit category:', category)
  }

  function handleDelete(categoryId: string) {
    // TODO: Implement delete confirmation in next iteration
    console.log('Delete category:', categoryId)
  }

  if (loading) {
    return (
      <div className="p-8">
        <p>Cargando categorías...</p>
      </div>
    )
  }

  if (!hasPermission) {
    return null
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter italic">
            Gestión de Categorías
          </h1>
          <p className="text-muted-foreground mt-1">
            Arrastra para reordenar las categorías
          </p>
        </div>
        <Button className="brutalist-button">
          <Plus className="h-4 w-4 mr-2" />
          Nueva Categoría
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={categories.map((cat) => cat.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {categories.map((category) => (
              <SortableCategoryItem
                key={category.id}
                category={category}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {categories.length === 0 && (
        <div className="brutalist-card p-8 text-center">
          <p className="text-muted-foreground">
            No hay categorías. Crea la primera.
          </p>
        </div>
      )}
    </div>
  )
}
```

**Step 2: Test drag-and-drop locally**

1. Run `npm run dev`
2. Navigate to `/admin/categories`
3. Try dragging a category item
4. Verify optimistic UI update
5. Check Network tab for PATCH request to `/api/admin/categories/reorder`

Expected: Categories reorder on drop, sort_order updates persist

**Step 3: Commit**

```bash
git add app/admin/categories/page.tsx
git commit -m "feat: implement drag-and-drop category reordering with @dnd-kit"
```

---

## Task 5: Add Visual Feedback and Polish

**Files:**
- Modify: `components/admin/sortable-category-item.tsx`

**Step 1: Enhance drag visual feedback**

Update the className in the root div:

```typescript
className={`brutalist-card p-4 flex items-center gap-4 transition-all ${
  isDragging
    ? 'opacity-50 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] scale-105 rotate-2'
    : 'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1'
}`}
```

**Step 2: Update drag handle hover state**

Replace the button with:

```typescript
<button
  {...attributes}
  {...listeners}
  className="cursor-grab active:cursor-grabbing p-2 hover:bg-secondary/20 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
  aria-label={`Reordenar categoría ${category.name}`}
>
  <GripVertical className="h-5 w-5 text-muted-foreground" />
</button>
```

**Step 3: Test visual feedback**

1. Hover over category cards - should lift slightly
2. Hover over drag handle - should show yellow background
3. Start dragging - should see rotation + scale + larger shadow
4. Keyboard navigation - focus ring should appear

Expected: Smooth transitions, clear visual states

**Step 4: Commit**

```bash
git add components/admin/sortable-category-item.tsx
git commit -m "feat: enhance drag-and-drop visual feedback and accessibility"
```

---

## Task 6: Update Admin Layout with Final Navigation

**Files:**
- Modify: `app/admin/layout.tsx` (if exists) or create it

**Step 1: Create/update admin layout with sidebar nav**

```typescript
import { Suspense } from 'react'
import Link from 'next/link'
import { Building2, Users, BarChart3, FolderTree, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const navItems = [
    { href: '/admin', label: 'Panel', icon: BarChart3 },
    { href: '/admin/businesses', label: 'Negocios', icon: Building2 },
    { href: '/admin/users', label: 'Usuarios', icon: Users },
    { href: '/admin/categories', label: 'Categorías', icon: FolderTree },
    { href: '/admin/alerts', label: 'Alertas', icon: Bell },
    { href: '/admin/statistics', label: 'Estadísticas', icon: BarChart3 },
  ]

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r-4 border-black bg-background p-6 hidden lg:block">
        <div className="mb-8">
          <h2 className="text-2xl font-black uppercase tracking-tighter italic">
            Admin Panel
          </h2>
        </div>
        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant="ghost"
                  className="w-full justify-start brutalist-button"
                >
                  <Icon className="h-4 w-4 mr-3" />
                  {item.label}
                </Button>
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1">
        <Suspense fallback={<div className="p-8">Cargando...</div>}>
          {children}
        </Suspense>
      </main>
    </div>
  )
}
```

**Step 2: Verify navigation structure**

Check that:
- All admin pages are listed in nav
- Icons are appropriate for each section
- Layout is responsive (sidebar hidden on mobile)
- Brutalist styling is consistent

**Step 3: Commit**

```bash
git add app/admin/layout.tsx
git commit -m "feat: add admin panel sidebar navigation"
```

---

## Task 7: Create Comprehensive Testing Checklist

**Files:**
- Create: `docs/testing/admin-panel-testing-checklist.md`

**Step 1: Create testing checklist document**

```markdown
# Admin Panel Testing Checklist

## Pre-Testing Setup

- [ ] Database has migration applied (suspension, rejection tracking, sort_order)
- [ ] Test users created: super_admin, admin, moderator, regular user
- [ ] Test data: 10+ businesses in various states (pending, approved, rejected)
- [ ] Test data: 5+ users with different roles
- [ ] Test data: 5+ categories with different sort orders

## Phase 1: Business Management

### Filtering & Search
- [ ] Filter by category shows correct businesses
- [ ] Search by name/description works
- [ ] Combine category filter + search works
- [ ] Clear filters resets to all businesses

### Business Approval/Rejection
- [ ] Approve business updates status to 'approved'
- [ ] Rejection dialog shows predefined reasons
- [ ] Rejection with custom note saves correctly
- [ ] Rejected business shows reason in admin list
- [ ] Cannot approve already approved business

### Business CRUD
- [ ] Edit business page loads with current data
- [ ] Update business name/description persists
- [ ] Update business hours persists
- [ ] Update business location (map) persists
- [ ] Upload new business photos works
- [ ] Delete business with confirmation works
- [ ] Delete removes business from database
- [ ] Cannot delete business owned by another community (if super_admin)

### Authorization
- [ ] Regular user cannot access /admin routes
- [ ] Moderator can approve/reject businesses
- [ ] Moderator cannot delete businesses
- [ ] Admin can delete businesses
- [ ] Super admin can access all communities
- [ ] Non-super-admin can only see their community businesses

## Phase 2: User Management

### User List
- [ ] All users display with correct roles
- [ ] Filter by role (admin/moderator/user) works
- [ ] Search by name/email works
- [ ] Pagination works for 50+ users

### Role Assignment
- [ ] Assign admin role to user works
- [ ] Assign moderator role to user works
- [ ] Demote admin to user works
- [ ] Permission preview shows correct permissions
- [ ] Cannot change own role
- [ ] Moderator cannot assign roles (only admin/super_admin)

### User Suspension
- [ ] Suspend user with reason works
- [ ] Suspended user cannot login
- [ ] Suspended user redirected to /suspended page
- [ ] Unsuspend user restores access
- [ ] Suspension reason displays in user detail
- [ ] Cannot suspend own account

### User Deletion
- [ ] Delete user with confirmation works
- [ ] Cascade warning shows related data (businesses, etc.)
- [ ] Deleted user removed from database
- [ ] Cannot delete own account
- [ ] Cannot delete super_admin accounts (unless you are super_admin)

### User Detail Page
- [ ] Profile tab shows user info
- [ ] Businesses tab shows user's businesses
- [ ] Activity tab shows recent actions
- [ ] Edit profile button works (for user's own profile)

## Phase 3: Analytics & Reporting

### Statistics Dashboard
- [ ] Business metrics display correctly
- [ ] User metrics display correctly
- [ ] Community metrics display correctly
- [ ] Moderation metrics display correctly
- [ ] Toggle 7d/30d period updates charts
- [ ] Stats refresh on navigation back

### CSV Export
- [ ] Export all businesses generates CSV
- [ ] CSV has correct headers
- [ ] CSV data matches database
- [ ] CSV opens correctly in Excel (UTF-8 BOM)
- [ ] Special characters (tildes, ñ) display correctly
- [ ] Commas in descriptions are escaped

## Phase 4: UX Enhancements

### Category Drag-and-Drop
- [ ] Drag category updates sort order
- [ ] Visual feedback during drag (opacity, shadow, rotation)
- [ ] Drop persists new order to database
- [ ] Keyboard navigation works (arrow keys + space)
- [ ] Focus ring visible for accessibility
- [ ] Optimistic update reverts on API error

### Admin Navigation
- [ ] Sidebar shows all admin sections
- [ ] Active route highlighted
- [ ] Mobile: sidebar hidden, menu button works
- [ ] All nav links lead to correct pages

## Cross-Cutting Concerns

### Security
- [ ] All API routes check permissions
- [ ] RLS policies enforce community scoping
- [ ] Suspended users blocked at middleware
- [ ] CSRF protection enabled
- [ ] SQL injection prevented (parameterized queries)

### Performance
- [ ] Business list pagination (20 per page)
- [ ] User list pagination (50 per page)
- [ ] Image upload max 5MB enforced
- [ ] Debounced search input (300ms)
- [ ] Optimistic UI updates feel instant

### Accessibility
- [ ] All buttons have accessible labels
- [ ] Form inputs have proper labels
- [ ] Focus states visible
- [ ] Keyboard navigation works throughout
- [ ] Screen reader friendly

### Error Handling
- [ ] API errors show user-friendly messages
- [ ] Network errors have retry mechanism
- [ ] Form validation errors display inline
- [ ] Toast notifications for success/error
- [ ] Loading states prevent double-clicks

## Browser Testing

- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

## Regression Testing

- [ ] Existing directory pages still work
- [ ] Business profiles still display
- [ ] User registration still works
- [ ] Merchant dashboard still works
- [ ] Community pages still work
```

**Step 2: Verify checklist completeness**

Check that:
- All features from all 4 phases are covered
- Security, performance, accessibility included
- Browser and regression testing included

**Step 3: Commit**

```bash
git add docs/testing/admin-panel-testing-checklist.md
git commit -m "docs: create comprehensive admin panel testing checklist"
```

---

## Task 8: Final Integration and Documentation

**Files:**
- Modify: `docs/plans/2026-02-27-admin-panel-enhancements-design.md` (add implementation notes)
- Create: `docs/admin-panel-user-guide.md`

**Step 1: Add implementation completion notes to design doc**

Append to bottom of design doc:

```markdown
---

## Implementation Notes

**Status:** ✅ Complete (Phase 1-4)

**Implementation Date:** 2026-02-27

**Breaking Changes:** None (backward compatible migration)

**Dependencies Added:**
- @dnd-kit/core
- @dnd-kit/sortable
- @dnd-kit/utilities

**Migration Applied:** Yes (20260227_admin_panel_enhancements.sql)

**Testing Checklist:** docs/testing/admin-panel-testing-checklist.md

**User Guide:** docs/admin-panel-user-guide.md

**Known Issues:** None

**Future Enhancements:**
- Category edit dialog
- Category delete with business reassignment
- Bulk business actions
- Advanced analytics charts
```

**Step 2: Create user guide for admins**

```markdown
# Admin Panel User Guide

## Overview

The BarrioRed Admin Panel provides comprehensive tools for managing businesses, users, categories, and community content.

## Access Levels

### Super Admin
- Full access to all communities
- Manage all users and roles
- Access all features

### Admin (Community-scoped)
- Manage businesses in their community
- Manage users in their community
- View statistics for their community
- Manage categories

### Moderator (Community-scoped)
- Approve/reject business applications
- View businesses and users (read-only)
- Cannot delete or assign roles

## Features

### Business Management

**Filtering & Search**
1. Navigate to Admin > Negocios
2. Use category dropdown to filter by type
3. Use search box to find by name/description
4. Results update automatically

**Approve Business**
1. Find pending business
2. Click "Aprobar" button
3. Business status changes to approved
4. Business appears in public directory

**Reject Business**
1. Find pending business
2. Click "Rechazar" button
3. Select predefined reason or enter custom note
4. Click "Confirmar Rechazo"
5. Business owner can see rejection reason

**Edit Business**
1. Click business name or "Editar" button
2. Update any field (name, description, hours, photos, location)
3. Click "Guardar Cambios"
4. Changes reflect immediately

**Delete Business**
1. Click "Eliminar" button
2. Confirm deletion in dialog
3. Business permanently removed (cannot be undone)

### User Management

**View Users**
- Navigate to Admin > Usuarios
- See all users with roles and status
- Filter by role (admin/moderator/user)
- Search by name or email

**Assign Roles**
1. Click user's current role badge
2. Select new role from dropdown
3. Review permission preview
4. Click "Asignar Rol"
5. Changes take effect immediately

**Suspend User**
1. Find user in list
2. Click "Suspender" button
3. Enter suspension reason
4. Click "Suspender Usuario"
5. User cannot login until unsuspended

**Unsuspend User**
1. Find suspended user
2. Click "Activar" button
3. User can login again immediately

**Delete User**
1. Click "Eliminar" button on user row
2. Review cascade warning (related businesses, etc.)
3. Confirm deletion
4. User permanently removed

### Category Management

**Reorder Categories**
1. Navigate to Admin > Categorías
2. Click and drag grip icon (⋮⋮) to reorder
3. Release to save new order
4. Order persists automatically
5. Directory reflects new category order

**Add Category** (Coming soon)
- Click "Nueva Categoría"
- Enter name and icon
- Select sort order
- Save

### Statistics & Reporting

**View Statistics**
1. Navigate to Admin > Estadísticas
2. Toggle between 7d/30d periods
3. View metrics:
   - Total businesses (by status)
   - Total users (by role)
   - Community engagement
   - Moderation activity

**Export Data**
1. Navigate to Admin > Negocios
2. Apply filters if needed
3. Click "Exportar CSV" button
4. Download opens in Excel
5. File includes all visible businesses

## Best Practices

### Business Approval
- Review business name, description, photos before approving
- Check location pin is accurate
- Verify WhatsApp number format
- Use rejection reasons to guide business owners

### User Role Assignment
- Assign moderator role to trusted community members
- Reserve admin role for primary community managers
- Document role changes in notes

### Category Management
- Keep most popular categories at top
- Group similar categories together
- Test order on mobile view

### Data Export
- Export regularly for backup
- Filter before export for specific reports
- Use 7d period for weekly reviews, 30d for monthly

## Troubleshooting

**Cannot access admin panel**
- Check if user has admin/moderator role
- Check if account is suspended
- Try logging out and back in

**Changes not saving**
- Check internet connection
- Look for error toast notification
- Refresh page and try again
- Contact super admin if persists

**Drag-and-drop not working**
- Try keyboard navigation (Tab + Arrow keys + Space)
- Clear browser cache
- Try different browser
- Report bug if persists

## Support

For technical issues or feature requests, contact the BarrioRed development team.
```

**Step 3: Commit all documentation**

```bash
git add docs/plans/2026-02-27-admin-panel-enhancements-design.md docs/admin-panel-user-guide.md
git commit -m "docs: finalize admin panel documentation and user guide"
```

---

## Final Verification Steps

**Before marking Phase 4 complete:**

1. **Code Review Checklist**
   - [ ] All imports are correct
   - [ ] TypeScript types are properly defined
   - [ ] Permission checks are in place
   - [ ] Error handling is comprehensive
   - [ ] Brutalist design classes are used consistently

2. **Functionality Testing**
   - [ ] Drag-and-drop works smoothly
   - [ ] Keyboard navigation works
   - [ ] API persists changes
   - [ ] Optimistic updates work
   - [ ] Visual feedback is clear

3. **Documentation**
   - [ ] Implementation plans are complete (Phase 1-4)
   - [ ] Testing checklist is comprehensive
   - [ ] User guide covers all features
   - [ ] Design doc has completion notes

4. **Git Hygiene**
   - [ ] All changes committed with clear messages
   - [ ] No uncommitted files
   - [ ] No merge conflicts
   - [ ] Branch is up to date with main

**After Phase 4 completion:**
- Move to execution phase (use superpowers:executing-plans skill)
- Start with Phase 1 implementation
- Complete phases sequentially
- Run testing checklist after each phase

---

## Notes for Implementer

- @dnd-kit provides excellent accessibility out of the box
- Test keyboard navigation thoroughly (critical for accessibility)
- Optimistic updates improve UX but require error handling
- Visual feedback makes drag-and-drop feel natural
- Admin sidebar should be sticky for easy navigation
- Consider loading states for all async operations

**Total Tasks in Phase 4:** 8 tasks
**Estimated Time:** 2-3 hours for experienced developer
**Dependencies:** Phases 1-3 must be complete first
