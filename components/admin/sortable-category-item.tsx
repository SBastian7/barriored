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
      className={`brutalist-card p-4 flex items-center gap-4 transition-all ${
        isDragging
          ? 'opacity-50 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] scale-105 rotate-2'
          : 'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1'
      }`}
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-2 hover:bg-secondary/20 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
        aria-label={`Reordenar categoría ${category.name}`}
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
