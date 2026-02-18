'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Edit, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { slugify } from '@/lib/utils'

export default function AdminCategoriesPage() {
  const supabase = createClient()
  const [categories, setCategories] = useState<any[]>([])
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  async function load() {
    const { data } = await supabase.from('categories').select('*').order('sort_order')
    if (data) setCategories(data)
  }

  useEffect(() => { load() }, [])

  async function handleSave() {
    const slug = slugify(name)
    if (editId) {
      await supabase.from('categories').update({ name, slug, icon }).eq('id', editId)
      toast.success('Categoria actualizada')
    } else {
      await supabase.from('categories').insert({ name, slug, icon, sort_order: categories.length })
      toast.success('Categoria creada')
    }
    setName(''); setIcon(''); setEditId(null); setOpen(false)
    load()
  }

  async function handleDelete(id: string) {
    await supabase.from('categories').delete().eq('id', id)
    toast.success('Categoria eliminada')
    load()
  }

  function openEdit(cat: any) {
    setName(cat.name); setIcon(cat.icon ?? ''); setEditId(cat.id); setOpen(true)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Categorias</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setName(''); setIcon(''); setEditId(null) }}>
              <Plus className="h-4 w-4 mr-2" /> Nueva
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? 'Editar' : 'Nueva'} categoria</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Nombre</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div><Label>Icono (nombre lucide)</Label><Input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="Store, Utensils, Scissors..." /></div>
              <Button onClick={handleSave} className="w-full">Guardar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {categories.map((cat) => (
          <Card key={cat.id}>
            <CardContent className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium">{cat.name}</p>
                <p className="text-xs text-gray-500">/{cat.slug} - icono: {cat.icon ?? 'ninguno'}</p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => openEdit(cat)}><Edit className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(cat.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
