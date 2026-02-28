'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
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
}

export function DeleteUserDialog({
  userId,
  userName,
  businessCount,
  postCount,
}: DeleteUserDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleDelete() {
    setLoading(true)
    try {
      // Delete user's businesses first (cascade)
      const { error: businessError } = await supabase
        .from('businesses')
        .delete()
        .eq('owner_id', userId)

      if (businessError) throw businessError

      // Delete user's posts
      const { error: postsError } = await supabase
        .from('community_posts')
        .delete()
        .eq('author_id', userId)

      if (postsError) throw postsError

      // Delete user profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId)

      if (profileError) throw profileError

      toast.success('Usuario eliminado exitosamente')
      router.push('/admin/users')
    } catch (error) {
      console.error('Error deleting user:', error)
      toast.error('Error al eliminar usuario')
    } finally {
      setLoading(false)
      setOpen(false)
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
