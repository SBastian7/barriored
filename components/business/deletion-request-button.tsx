'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface DeletionRequestButtonProps {
  businessId: string
  businessName: string
}

export function DeletionRequestButton({ businessId, businessName }: DeletionRequestButtonProps) {
  const [showDialog, setShowDialog] = useState(false)
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const handleSubmit = async () => {
    setIsSubmitting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('No autenticado')
        return
      }

      // Verify user owns the business
      const { data: business, error: fetchError } = await supabase
        .from('businesses')
        .select('owner_id')
        .eq('id', businessId)
        .single() as { data: any; error: any }

      if (fetchError) throw fetchError

      if (business.owner_id !== user.id) {
        toast.error('No tienes permiso para eliminar este negocio')
        return
      }

      // Update business with deletion request
      const { error: updateError } = await (supabase as any)
        .from('businesses')
        .update({
          deletion_requested: true,
          deletion_reason: reason.trim() || null,
          deletion_requested_at: new Date().toISOString(),
        })
        .eq('id', businessId)

      if (updateError) throw updateError

      toast.success('Solicitud enviada. Un administrador la revisará pronto.')
      setShowDialog(false)
      router.refresh()
    } catch (error) {
      console.error('Deletion request error:', error)
      toast.error('Error al enviar solicitud')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Button
        variant="destructive"
        onClick={() => setShowDialog(true)}
        className="brutalist-button w-full"
      >
        <AlertTriangle className="h-4 w-4 mr-2" />
        Solicitar Eliminación
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="brutalist-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              ¿Eliminar negocio?
            </DialogTitle>
            <DialogDescription>
              Estás solicitando eliminar <strong>{businessName}</strong>.
              Tu perfil será desactivado hasta que un administrador revise tu solicitud.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Razón (opcional)
            </label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="¿Por qué quieres eliminar tu negocio?"
              className="brutalist-input min-h-[100px]"
              disabled={isSubmitting}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="brutalist-button"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar Solicitud
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
