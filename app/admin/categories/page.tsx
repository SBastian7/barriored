'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SortableCategoryItem } from '@/components/admin/sortable-category-item'
import { createClient } from '@/lib/supabase/client'
import { getPermissions } from '@/lib/auth/permissions'
import type { Category } from '@/lib/types'

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
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/auth/login')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_super_admin')
      .eq('id', user.id)
      .single() as { data: { role: string; is_super_admin: boolean | null } | null }

    const permissions = getPermissions(profile?.role as any, profile?.is_super_admin)
    const canManage = permissions.canManageCategories
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
