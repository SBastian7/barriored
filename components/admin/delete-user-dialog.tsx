'use client'

import { useState } from 'react'
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
import { Button } from '@/components/ui/button'
import { Trash2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useRouter } from 'next/navigation'

interface DeleteUserDialogProps {
  userId: string
  userName: string
  businessCount: number
  postCount: number
  onSuccess?: () => void
}

export function DeleteUserDialog({
  userId,
  userName,
  businessCount,
  postCount,
  onSuccess,
}: DeleteUserDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    setLoading(true)
    try {
      // Call server-side API to delete user properly
      const response = await fetch(`/api/admin/users/${userId}/delete`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error eliminando usuario')
      }

      toast.success('Usuario eliminado exitosamente')
      setOpen(false)

      // Call success callback or navigate
      if (onSuccess) {
        onSuccess()
      } else {
        router.push('/admin/users')
        router.refresh()
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      toast.error(error instanceof Error ? error.message : 'Error al eliminar usuario')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" className="brutalist-button">
          <Trash2 className="h-4 w-4 mr-2" /> Eliminar Usuario
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent className="brutalist-card max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-heading font-black uppercase italic tracking-tighter text-xl">
            ¿Eliminar Usuario Permanentemente?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            Estás a punto de eliminar a <strong>{userName}</strong> de la plataforma.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          {/* Impact Warning */}
          <Alert className="border-2 border-black bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription>
              <p className="font-bold text-red-600 mb-2">Esta acción no se puede deshacer</p>
              <p className="text-sm">Se eliminarán permanentemente:</p>
              <ul className="text-sm mt-2 space-y-1 ml-4">
                <li>• {businessCount} negocio{businessCount !== 1 ? 's' : ''}</li>
                <li>• {postCount} publicación{postCount !== 1 ? 'es' : ''}</li>
                <li>• Todos los datos del perfil</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>

        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel className="brutalist-button">
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="brutalist-button bg-red-600 text-white hover:bg-red-700"
          >
            {loading ? 'Eliminando...' : 'Eliminar Permanentemente'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
