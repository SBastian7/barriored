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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface RejectionDialogProps {
  businessId: string
  businessName: string
  onSuccess?: () => void
}

const REJECTION_REASONS = [
  { value: 'incomplete', label: 'Información incompleta o inexacta' },
  { value: 'poor_photos', label: 'Fotos de baja calidad o inapropiadas' },
  { value: 'duplicate', label: 'Negocio duplicado' },
  { value: 'wrong_category', label: 'No corresponde a la categoría' },
  { value: 'inappropriate', label: 'Contenido inapropiado' },
  { value: 'other', label: 'Otro (especificar)' },
]

export function RejectionDialog({ businessId, businessName, onSuccess }: RejectionDialogProps) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleReject() {
    if (!reason) {
      toast.error('Selecciona un motivo de rechazo')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/businesses/${businessId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rejection_reason: reason,
          rejection_details: details.trim() || null,
        }),
      })

      if (!response.ok) {
        throw new Error('Error al rechazar negocio')
      }

      toast.success('Negocio rechazado')
      setOpen(false)

      if (onSuccess) {
        onSuccess()
      } else {
        router.push('/admin/businesses')
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al rechazar negocio')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="destructive"
          className="brutalist-button border-2 border-black"
        >
          <XCircle className="h-4 w-4 mr-2" /> Rechazar
        </Button>
      </DialogTrigger>

      <DialogContent className="brutalist-card max-w-md">
        <DialogHeader className="border-b-2 border-black pb-4">
          <DialogTitle className="font-heading font-black uppercase italic tracking-tighter text-xl">
            Rechazar: {businessName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div>
            <Label className="text-xs font-black uppercase tracking-widest text-black/60">
              Motivo del rechazo *
            </Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="brutalist-input mt-2">
                <SelectValue placeholder="Selecciona un motivo" />
              </SelectTrigger>
              <SelectContent>
                {REJECTION_REASONS.map(r => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-black uppercase tracking-widest text-black/60">
              Detalles adicionales (opcional)
            </Label>
            <Textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Proporciona más información para el comerciante..."
              className="brutalist-input mt-2"
              rows={4}
            />
          </div>

          <Button
            onClick={handleReject}
            disabled={loading || !reason}
            className="brutalist-button bg-red-600 text-white hover:bg-red-700 w-full h-12"
          >
            {loading ? 'Rechazando...' : 'Confirmar Rechazo'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
