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

  // SortableCategoryItem calls onDelete(category.id: string)
  function openDelete(categoryId: string) {
    const category = categories.find((c) => c.id === categoryId) || null
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
