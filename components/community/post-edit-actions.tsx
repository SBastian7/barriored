'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
import { Pencil, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

type Props = {
  postId: string
  postType: 'announcement' | 'event'
  communitySlug: string
  isAuthor: boolean
  isAdmin: boolean
  onDark?: boolean
}

export function PostEditActions({ postId, postType, communitySlug, isAuthor, isAdmin, onDark = false }: Props) {
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  // Only show if user is author or admin
  if (!isAuthor && !isAdmin) {
    return null
  }

  const postTypePath = {
    announcement: 'announcements',
    event: 'events',
  }[postType] ?? 'announcements'

  const postTypeEditPath = {
    announcement: 'anuncios',
    event: 'eventos',
  }[postType] ?? 'anuncios'

  async function handleDelete() {
    setIsDeleting(true)

    try {
      const res = await fetch(`/api/community/posts/${postId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al eliminar')
      }

      toast.success('Publicación eliminada correctamente')
      router.push(`/${communitySlug}/community/${postTypePath}`)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar publicación')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex gap-3 flex-wrap">
      <Link href={`/${communitySlug}/community/${postTypeEditPath}/${postId}/edit`}>
        <Button
          variant="outline"
          size="sm"
          className={`border-2 rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all font-black uppercase tracking-widest text-xs ${onDark ? 'bg-white text-black border-white/70 hover:bg-white/90' : 'border-black'}`}
        >
          <Pencil className="mr-2 h-3.5 w-3.5" />
          Editar
        </Button>
      </Link>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="destructive"
            size="sm"
            disabled={isDeleting}
            className="border-2 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all font-black uppercase tracking-widest text-xs"
          >
            {isDeleting ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-3.5 w-3.5" />
            )}
            Eliminar
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="border-4 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading font-black uppercase italic text-2xl">
              ¿Eliminar publicación?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Esta acción no se puede deshacer. La publicación será eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-2 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-black uppercase tracking-widest text-xs">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600 border-2 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-black uppercase tracking-widest text-xs"
            >
              Sí, Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
