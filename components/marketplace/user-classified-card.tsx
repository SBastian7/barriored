'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  RotateCcw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { ClassifiedStatusBadge } from './classified-status-badge'
import {
  deleteClassifiedAction,
  markAsSoldAction,
  reactivateClassifiedAction
} from '@/app/actions/classified-actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { Database } from '@/lib/types/database'

type Classified = Database['public']['Tables']['classifieds']['Row']

interface UserClassifiedCardProps {
  classified: Classified
  communitySlug: string
}

export function UserClassifiedCard({
  classified,
  communitySlug
}: UserClassifiedCardProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  const thumbnail = classified.images?.[0] || '/placeholder-classified.png'
  const timeAgo = new Date(classified.created_at).toLocaleDateString('es-CO')

  const handleMarkSold = async () => {
    setIsUpdating(true)
    const result = await markAsSoldAction(classified.id)

    if (result.success) {
      toast.success('Marcado como vendido')
      router.refresh()
    } else {
      toast.error('Error', { description: result.error })
    }
    setIsUpdating(false)
  }

  const handleReactivate = async () => {
    setIsUpdating(true)
    const result = await reactivateClassifiedAction(classified.id)

    if (result.success) {
      toast.success('Clasificado reactivado')
      router.refresh()
    } else {
      toast.error('Error', { description: result.error })
    }
    setIsUpdating(false)
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    const result = await deleteClassifiedAction(classified.id)

    if (result.success) {
      toast.success('Clasificado eliminado')
      router.refresh()
    } else {
      toast.error('Error', { description: result.error })
      setIsDeleting(false)
    }
  }

  const isActive = classified.status === 'active'
  const isSold = classified.status === 'sold'
  const isArchived = classified.status === 'archived'

  return (
    <div className={cn(
      'brutalist-card p-4 flex gap-4',
      (isSold || isArchived) && 'opacity-60'
    )}>
      {/* Thumbnail */}
      <div className="relative w-24 h-24 flex-shrink-0 border-2 border-black overflow-hidden">
        <Image
          src={thumbnail}
          alt={classified.title}
          fill
          className="object-cover"
        />
        <div className="absolute top-1 left-1">
          <ClassifiedStatusBadge status={classified.status} size="sm" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-sm line-clamp-1">
            {classified.title}
          </h3>
          <p className="text-lg font-heading font-black text-primary">
            {classified.price || 'Sin precio'}
          </p>
          <p className="text-xs text-black/60">
            Publicado: {timeAgo}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-2 flex-wrap">
          <Link href={`/${communitySlug}/marketplace/${classified.id}`}>
            <Button
              size="sm"
              variant="outline"
              className="brutalist-button text-xs"
            >
              <Eye className="h-3 w-3" />
              Ver
            </Button>
          </Link>

          <Link href={`/dashboard/marketplace/${classified.id}/edit`}>
            <Button
              size="sm"
              variant="outline"
              className="brutalist-button text-xs"
            >
              <Edit className="h-3 w-3" />
              Editar
            </Button>
          </Link>

          {isActive && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleMarkSold}
              disabled={isUpdating}
              className="brutalist-button text-xs"
            >
              <CheckCircle className="h-3 w-3" />
              Vendido
            </Button>
          )}

          {(isSold || isArchived) && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleReactivate}
              disabled={isUpdating}
              className="brutalist-button text-xs"
            >
              <RotateCcw className="h-3 w-3" />
              Reactivar
            </Button>
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                disabled={isDeleting}
                className="brutalist-button text-xs"
              >
                <Trash2 className="h-3 w-3" />
                Eliminar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="brutalist-card">
              <AlertDialogHeader>
                <AlertDialogTitle className="font-heading font-black uppercase">
                  ¿Eliminar Clasificado?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción no se puede deshacer. Tu clasificado será eliminado permanentemente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="brutalist-button">
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="brutalist-button bg-primary text-primary-foreground"
                >
                  Sí, Eliminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  )
}
