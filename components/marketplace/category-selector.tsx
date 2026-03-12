'use client'

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
