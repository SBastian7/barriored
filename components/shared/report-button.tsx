'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Flag, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

interface ReportButtonProps {
  entityType: 'business' | 'post'
  entityId: string
  className?: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

const REPORT_REASONS = [
  { value: 'inappropriate', label: 'Contenido inapropiado' },
  { value: 'spam', label: 'Spam o publicidad engañosa' },
  { value: 'incorrect', label: 'Información incorrecta' },
  { value: 'other', label: 'Otro motivo' },
] as const

type ReportReason = typeof REPORT_REASONS[number]['value']

export function ReportButton({
  entityType,
  entityId,
  className,
  variant = 'ghost',
  size = 'sm',
}: ReportButtonProps) {
  const [open, setOpen] = useState(false)
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null)
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const supabase = createClient()

  const handleReasonSelect = (reason: ReportReason) => {
    setSelectedReason(reason)
    setOpen(true)
  }

  const handleSubmit = async () => {
    if (!selectedReason) return

    setSubmitting(true)

    try {
      // Check if user is authenticated
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        toast.error('Debes iniciar sesión para reportar contenido')
        return
      }

      // Get user profile to get the profile id
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single() as { data: any }

      if (!profile) {
        toast.error('No se encontró tu perfil')
        return
      }

      // Insert report
      const { error } = await (supabase as any).from('content_reports').insert({
        reporter_id: profile.id,
        reported_entity_type: entityType,
        reported_entity_id: entityId,
        reason: selectedReason,
        description: description.trim() || null,
      })

      if (error) {
        // Check if it's a duplicate report
        if (error.code === '23505') {
          toast.error('Ya has reportado este contenido anteriormente')
        } else {
          throw error
        }
        return
      }

      toast.success('Reporte enviado exitosamente. Lo revisaremos pronto.')
      setOpen(false)
      setSelectedReason(null)
      setDescription('')
    } catch (error) {
      console.error('Error submitting report:', error)
      toast.error('Error al enviar el reporte. Intenta de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = () => {
    setOpen(false)
    setSelectedReason(null)
    setDescription('')
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={variant} size={size} className={className}>
            <Flag className="h-4 w-4 mr-2" />
            Reportar
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="brutalist-card w-64">
          {REPORT_REASONS.map((reason) => (
            <DropdownMenuItem
              key={reason.value}
              onClick={() => handleReasonSelect(reason.value)}
              className="cursor-pointer"
            >
              {reason.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="brutalist-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading font-black uppercase italic text-2xl">
              Reportar Contenido
            </DialogTitle>
            <DialogDescription className="text-sm">
              Tu reporte será revisado por los moderadores. Ayúdanos a mantener la comunidad
              segura.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="font-black uppercase tracking-widest text-xs">
                Motivo del Reporte
              </Label>
              <div className="p-3 border-2 border-black bg-accent/5">
                <p className="text-sm font-bold">
                  {REPORT_REASONS.find((r) => r.value === selectedReason)?.label}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="description"
                className="font-black uppercase tracking-widest text-xs"
              >
                Detalles Adicionales (Opcional)
              </Label>
              <Textarea
                id="description"
                placeholder="Describe el problema con más detalle..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="brutalist-input min-h-24"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">
                {description.length}/500
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={submitting}
              className="brutalist-button"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="brutalist-button bg-primary text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar Reporte'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
