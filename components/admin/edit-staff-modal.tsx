'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'

interface StaffMember {
  id: string
  full_name: string
  avatar_url: string | null
  role: 'admin' | 'moderator'
}

interface Props {
  communityId: string
  staffMember: StaffMember
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function EditStaffModal({
  communityId,
  staffMember,
  open,
  onOpenChange,
  onSuccess,
}: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [role, setRole] = useState<'admin' | 'moderator'>(staffMember.role)
  const [loading, setLoading] = useState(false)
  const [showRemoveDialog, setShowRemoveDialog] = useState(false)

  async function handleSave() {
    if (role === staffMember.role) {
      onOpenChange(false)
      return
    }

    setLoading(true)

    try {
      const response = await fetch(
        `/api/admin/communities/${communityId}/staff`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: staffMember.id,
            role,
          }),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al actualizar rol')
      }

      toast({
        title: 'Rol actualizado',
        description: `${staffMember.full_name} ahora es ${role}`,
      })

      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Error al actualizar rol',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleRemove() {
    setLoading(true)

    try {
      const response = await fetch(
        `/api/admin/communities/${communityId}/staff?user_id=${staffMember.id}`,
        {
          method: 'DELETE',
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al remover staff')
      }

      toast({
        title: 'Staff removido',
        description: `${staffMember.full_name} ha sido removido del staff`,
      })

      onSuccess()
      onOpenChange(false)
      setShowRemoveDialog(false)
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Error al remover staff',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="brutalist-card">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter italic">
              Editar Staff
            </DialogTitle>
            <DialogDescription>
              Cambia el rol o remueve del staff de la comunidad
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* User info */}
            <div className="brutalist-card p-6 flex items-center gap-4">
              {staffMember.avatar_url && (
                <img
                  src={staffMember.avatar_url}
                  alt={staffMember.full_name}
                  className="w-12 h-12 rounded-full border-2 border-black"
                />
              )}
              <div className="flex-1">
                <div className="font-bold text-lg">{staffMember.full_name}</div>
                <Badge
                  className={
                    staffMember.role === 'admin'
                      ? 'bg-primary'
                      : 'bg-secondary text-foreground'
                  }
                >
                  {staffMember.role === 'admin' ? 'Admin' : 'Moderador'}
                </Badge>
              </div>
            </div>

            {/* Role selection */}
            <div className="space-y-4">
              <Label className="uppercase tracking-widest font-bold text-xs">
                Cambiar Rol
              </Label>
              <RadioGroup
                value={role}
                onValueChange={(value) =>
                  setRole(value as 'admin' | 'moderator')
                }
              >
                <div className="flex items-start space-x-3 brutalist-card p-4">
                  <RadioGroupItem value="admin" id="edit-admin" />
                  <div className="flex-1">
                    <Label
                      htmlFor="edit-admin"
                      className="font-bold cursor-pointer"
                    >
                      Admin
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Control total de la comunidad
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 brutalist-card p-4">
                  <RadioGroupItem value="moderator" id="edit-moderator" />
                  <div className="flex-1">
                    <Label
                      htmlFor="edit-moderator"
                      className="font-bold cursor-pointer"
                    >
                      Moderador
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Gestión de contenido solamente
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-4 pt-4 border-t-2 border-black">
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                  className="brutalist-button flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={loading || role === staffMember.role}
                  className="brutalist-button flex-1"
                >
                  {loading ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
              </div>

              <Button
                variant="outline"
                onClick={() => setShowRemoveDialog(true)}
                disabled={loading}
                className="brutalist-button w-full border-red-500 text-red-500 hover:bg-red-50"
              >
                Remover del Staff
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove confirmation dialog */}
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent className="brutalist-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black uppercase tracking-tighter italic">
              ¿Remover del Staff?
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de remover a <strong>{staffMember.full_name}</strong>{' '}
              del staff? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="brutalist-button">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              className="brutalist-button bg-red-500 hover:bg-red-600"
            >
              {loading ? 'Removiendo...' : 'Sí, Remover'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
