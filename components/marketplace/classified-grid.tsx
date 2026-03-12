'use client'

import { ClassifiedCard } from './classified-card'
import { ShoppingBag } from 'lucide-react'
import type { ClassifiedWithRelations } from '@/lib/types/database'

interface ClassifiedGridProps {
  classifieds: ClassifiedWithRelations[]
  communitySlug: string
}

export function ClassifiedGrid({ classifieds, communitySlug }: ClassifiedGridProps) {
  if (classifieds.length === 0) {
    return (
      <div className="brutalist-card p-12 text-center space-y-4">
        <ShoppingBag className="h-16 w-16 mx-auto text-black/20" />
        <h3 className="font-heading font-black uppercase text-2xl">
          Sin clasificados aún
        </h3>
        <p className="text-black/60">
          No se encontraron clasificados que coincidan con tu búsqueda
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      {classifieds.map((classified) => (
        <ClassifiedCard
          key={classified.id}
          classified={classified}
          variant="public"
        />
      ))}
    </div>
  )
}
