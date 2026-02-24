'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { ChevronRight } from 'lucide-react'

type Category = { id: string; name: string; parent_id: string | null }
type Props = { form: any; update: (v: any) => void; errors?: Record<string, string> }

export function StepBasicInfo({ form, update, errors }: Props) {
  const [categories, setCategories] = useState<Category[]>([])
  const supabase = createClient()

  useEffect(() => {
    supabase.from('categories').select('id, name, parent_id').order('sort_order').then(({ data }) => {
      if (data) setCategories(data)
    })
  }, [supabase])

  const parentCategories = categories.filter(c => !c.parent_id)
  const subcategories = categories.filter(c => c.parent_id === form.category_id)
  const hasSubcategories = subcategories.length > 0

  return (
    <div className="space-y-6">
      {/* Business name */}
      <div>
        <Label className="text-xs font-black uppercase tracking-widest text-black/60 mb-2 block">
          Nombre del negocio *
        </Label>
        <Input
          value={form.name}
          onChange={(e) => update({ name: e.target.value })}
          placeholder="Ej: Tienda Don Pedro"
          className={cn(errors?.name && 'border-red-500')}
        />
        {errors?.name && <p className="text-xs font-bold text-red-500 mt-1">{errors.name}</p>}
      </div>

      {/* Category selection - chip style */}
      <div>
        <Label className="text-xs font-black uppercase tracking-widest text-black/60 mb-3 block">
          Categoria *
        </Label>
        <div className="flex flex-wrap gap-2">
          {parentCategories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => update({ category_id: c.id, subcategory_id: '' })}
              className={cn(
                'px-4 py-2 text-sm font-bold border-2 border-black transition-all uppercase tracking-wider',
                form.category_id === c.id
                  ? 'bg-primary text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] translate-x-[-1px] translate-y-[-1px]'
                  : 'bg-white hover:bg-black/5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
        {errors?.category_id && <p className="text-xs font-bold text-red-500 mt-2">{errors.category_id}</p>}
      </div>

      {/* Subcategory selection */}
      {hasSubcategories && (
        <div>
          <Label className="text-xs font-black uppercase tracking-widest text-black/60 mb-3 flex items-center gap-1">
            <ChevronRight className="h-3 w-3" /> Subcategoria
          </Label>
          <div className="flex flex-wrap gap-2">
            {subcategories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => update({ subcategory_id: c.id })}
                className={cn(
                  'px-3 py-1.5 text-xs font-bold border-2 border-black transition-all uppercase tracking-wider',
                  form.subcategory_id === c.id
                    ? 'bg-secondary text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                    : 'bg-white hover:bg-black/5 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Description */}
      <div>
        <Label className="text-xs font-black uppercase tracking-widest text-black/60 mb-2 block">
          Descripcion *
        </Label>
        <Textarea
          value={form.description}
          onChange={(e) => update({ description: e.target.value })}
          placeholder="Que ofrece tu negocio? Cuentale a tus vecinos..."
          rows={3}
          className={cn(errors?.description && 'border-red-500')}
        />
        <div className="flex justify-between mt-1">
          {errors?.description && <p className="text-xs font-bold text-red-500">{errors.description}</p>}
          <p className="text-xs text-black/30 font-bold ml-auto">{form.description?.length ?? 0}/500</p>
        </div>
      </div>
    </div>
  )
}
