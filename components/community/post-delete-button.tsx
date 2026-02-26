'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

type Props = {
  postId: string
  postTitle: string
}

export function PostDeleteButton({ postId, postTitle }: Props) {
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

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
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar publicación')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          disabled={isDeleting}
          className="h-12 w-12 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-red-50 hover:border-red-500 hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all rounded-none"
        >
          {isDeleting ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Trash2 className="h-5 w-5" />
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="border-4 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-heading font-black uppercase italic text-2xl">
            ¿Eliminar publicación?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            Esta acción no se puede deshacer. La publicación <span className="font-bold text-black">"{postTitle}"</span> será eliminada permanentemente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="border-2 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-black uppercase tracking-widest text-xs">
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-red-500 hover:bg-red-600 text-white border-2 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-black uppercase tracking-widest text-xs"
          >
            Sí, Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
