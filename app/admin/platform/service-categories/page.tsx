'use client'

import { useState, useEffect } from 'react'
import * as LucideIcons from 'lucide-react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Breadcrumbs } from '@/components/shared/breadcrumbs'
import { toast } from 'sonner'

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

function toIconName(slug: string) {
  return slug.split('-').filter(Boolean).map((w: string) => w[0].toUpperCase() + w.slice(1)).join('')
}

function SortableRow({ cat, onEdit, onDelete }: { cat: ServiceCategory; onEdit: (c: ServiceCategory) => void; onDelete: (c: ServiceCategory) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: cat.id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const Icon = (LucideIcons as any)[toIconName(cat.icon)] || LucideIcons.Circle

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
    try {
      const res = await fetch('/api/admin/platform/service-categories')
      if (!res.ok) throw new Error('Error al cargar categorías')
      const json = await res.json()
      setCategories((json.categories || []).filter((c: ServiceCategory) => c.is_active))
    } catch {
      toast.error('Error al cargar categorías de servicios')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCategories() }, [])

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = categories.findIndex((c) => c.id === active.id)
    const newIdx = categories.findIndex((c) => c.id === over.id)
    const reordered = arrayMove(categories, oldIdx, newIdx)
    setCategories(reordered)
    try {
      const results = await Promise.all(reordered.map((c, i) =>
        fetch(`/api/admin/platform/service-categories/${c.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: c.name, slug: c.slug, icon: c.icon, sort_order: i + 1 }),
        })
      ))
      if (results.some((r) => !r.ok)) {
        toast.error('Error al guardar el orden')
        await fetchCategories()
      }
    } catch {
      toast.error('Error de red al reordenar')
      await fetchCategories()
    }
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
      if (!res.ok) { toast.error(json.error ?? 'Error al guardar'); return }
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
      if (!res.ok) { toast.error(json.error ?? 'Error al desactivar'); return }
      toast.success('Categoría desactivada')
      setDeleteDialogOpen(false)
      await fetchCategories()
    } finally { setSaving(false) }
  }

  const PreviewIcon = formData.icon
    ? (LucideIcons as any)[toIconName(formData.icon)] || null
    : null

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
            {categories.map((cat) => (
              <SortableRow key={cat.id} cat={cat} onEdit={openEdit} onDelete={(c) => { setDeleting(c); setDeleteDialogOpen(true) }} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="brutalist-card border-4 border-black">
          <DialogHeader><DialogTitle className="font-black uppercase tracking-tighter">{editing ? 'Editar' : 'Nueva'} Categoría</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="uppercase tracking-widest font-bold text-xs">Nombre *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value, slug: editing ? formData.slug : generateSlug(e.target.value) })}
                className="brutalist-input"
              />
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
