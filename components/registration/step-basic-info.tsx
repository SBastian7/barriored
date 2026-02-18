'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type Props = { form: any; update: (v: any) => void }

export function StepBasicInfo({ form, update }: Props) {
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const supabase = createClient()

  useEffect(() => {
    supabase.from('categories').select('id, name').order('sort_order').then(({ data }) => {
      if (data) setCategories(data)
    })
  }, [supabase])

  return (
    <div className="space-y-4">
      <div>
        <Label>Nombre del negocio</Label>
        <Input value={form.name} onChange={(e) => update({ name: e.target.value })} placeholder="Ej: Tienda Don Pedro" />
      </div>
      <div>
        <Label>Categoria</Label>
        <Select value={form.category_id} onValueChange={(v) => update({ category_id: v })}>
          <SelectTrigger><SelectValue placeholder="Selecciona una categoria" /></SelectTrigger>
          <SelectContent>
            {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Descripcion</Label>
        <Textarea value={form.description} onChange={(e) => update({ description: e.target.value })} placeholder="Que ofrece tu negocio?" rows={3} />
      </div>
    </div>
  )
}
