'use client'

import { useState, useTransition } from 'react'
import { Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toggleFavoriteAction } from '@/app/actions/classified-actions'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface FavoriteButtonProps {
  classifiedId: string
  initialFavorited: boolean
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  userId?: string | null
}

export function FavoriteButton({
  classifiedId,
  initialFavorited,
  size = 'md',
  showLabel = false,
  userId
}: FavoriteButtonProps) {
  const router = useRouter()
  const [favorited, setFavorited] = useState(initialFavorited)
  const [isPending, startTransition] = useTransition()

  const handleToggle = () => {
    // Redirect to login if not authenticated
    if (!userId) {
      router.push('/auth/login')
      return
    }

    // Optimistic update
    setFavorited(!favorited)

    startTransition(async () => {
      const result = await toggleFavoriteAction(classifiedId)

      if (result.success && result.data) {
        // Update with server response
        setFavorited(result.data.favorited)
        toast.success(
          result.data.favorited
            ? 'Agregado a favoritos'
            : 'Eliminado de favoritos'
        )
      } else {
        // Revert optimistic update on error
        setFavorited(favorited)
        toast.error('Error', {
          description: result.error || 'Intenta nuevamente'
        })
      }
    })
  }

  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3'
  }

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  }

  return (
    <Button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      className={cn(
        'brutalist-button transition-all',
        sizeClasses[size],
        favorited
          ? 'bg-primary text-white hover:bg-primary/90'
          : 'bg-white hover:bg-black/5',
        showLabel && 'gap-2 px-4'
      )}
      aria-label={favorited ? 'Quitar de favoritos' : 'Agregar a favoritos'}
    >
      <Heart
        className={cn(
          iconSizes[size],
          favorited && 'fill-current'
        )}
      />
      {showLabel && (
        <span className="uppercase tracking-widest font-bold text-xs">
          {favorited ? 'Guardado' : 'Guardar'}
        </span>
      )}
    </Button>
  )
}
