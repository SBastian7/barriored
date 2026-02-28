'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AlertTriangle, Ban, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface SuspendUserDialogProps {
  userId: string
  userName: string
  isSuspended: boolean | null
  onSuccess: () => void
}

export function SuspendUserDialog({
  userId,
  userName,
  isSuspended,
  onSuccess,
}: SuspendUserDialogProps) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleToggleSuspension() {
    if (!isSuspended && !reason.trim()) {
      toast.error('Debes proporcionar una razón para la suspensión')
      return
    }

    setLoading(true)
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()

      const update = isSuspended
        ? {
            is_suspended: false,
            suspended_at: null,
            suspended_by: null,
            suspension_reason: null,
          }
        : {
            is_suspended: true,
            suspended_at: new Date().toISOString(),
            suspended_by: currentUser!.id,
            suspension_reason: reason.trim(),
          }

      const { error } = await supabase
        .from('profiles')
        .update(update)
        .eq('id', userId)

      if (error) throw error

      toast.success(isSuspended ? 'Usuario reactivado' : 'Usuario suspendido')
      setOpen(false)
      setReason('')
      onSuccess()
    } catch (error) {
      console.error('Error toggling suspension:', error)
      toast.error('Error al actualizar estado de suspensión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={isSuspended ? 'outline' : 'destructive'}
          className="brutalist-button"
        >
          {isSuspended ? (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" /> Reactivar Usuario
            </>
          ) : (
            <>
              <Ban className="h-4 w-4 mr-2" /> Suspender Usuario
            </>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="brutalist-card max-w-md">
        <DialogHeader className="border-b-2 border-black pb-4">
          <DialogTitle className="font-heading font-black uppercase italic tracking-tighter text-xl">
            {isSuspended ? 'Reactivar' : 'Suspender'}: {userName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {!isSuspended ? (
            <>
              {/* Suspension Reason */}
              <div>
                <Label className="text-xs font-black uppercase tracking-widest text-black/60">
                  Razón de Suspensión *
                </Label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explica por qué se suspende esta cuenta..."
                  className="brutalist-input mt-2"
                  rows={4}
                />
              </div>

              {/* Warning */}
              <Alert className="border-2 border-black bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-sm">
                  <strong>Atención:</strong> El usuario no podrá iniciar sesión mientras esté suspendido. Verá la razón de suspensión al intentar acceder.
                </AlertDescription>
              </Alert>
            </>
          ) : (
            <>
              {/* Reactivation Confirmation */}
              <Alert className="border-2 border-black bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-sm">
                  <strong>Reactivar cuenta:</strong> El usuario podrá volver a iniciar sesión y usar la plataforma normalmente.
                </AlertDescription>
              </Alert>

              <p className="text-sm text-black/60">
                ¿Estás seguro que quieres reactivar esta cuenta?
              </p>
            </>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleToggleSuspension}
              disabled={loading || (!isSuspended && !reason.trim())}
              className={`brutalist-button flex-1 h-12 ${
                isSuspended
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              {loading
                ? isSuspended
                  ? 'Reactivando...'
                  : 'Suspendiendo...'
                : isSuspended
                  ? 'Confirmar Reactivación'
                  : 'Confirmar Suspensión'}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false)
                setReason('')
              }}
              className="brutalist-button flex-1 h-12"
            >
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
