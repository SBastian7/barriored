'use client'

import { useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Label }         from '@/components/ui/label'
import { Input }         from '@/components/ui/input'
import { Textarea }      from '@/components/ui/textarea'
import { toast }         from 'sonner'
import { Flag, Loader2 } from 'lucide-react'

interface Props {
  communityId:      string
  serviceId?:       string
  serviceName?:     string
  children:         React.ReactNode
}

export function ServiceReportDialog({ communityId, serviceId, serviceName, children }: Props) {
  const [open,    setOpen]    = useState(false)
  const [loading, setLoading] = useState(false)
  const [form,    setForm]    = useState({
    service_name_hint: '',
    message:           '',
    reporter_name:     '',
    reporter_whatsapp: '',
  })

  const isGeneral = !serviceId

  function set(field: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function reset() {
    setForm({ service_name_hint: '', message: '', reporter_name: '', reporter_whatsapp: '' })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.message.trim().length < 5) {
      toast.error('Describe qué dato está errado (mínimo 5 caracteres).')
      return
    }
    setLoading(true)
    try {
      const res  = await fetch('/api/community/services/report', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          community_id:      communityId,
          service_id:        serviceId                           || undefined,
          service_name_hint: isGeneral ? form.service_name_hint : undefined,
          message:           form.message,
          reporter_name:     form.reporter_name     || undefined,
          reporter_whatsapp: form.reporter_whatsapp || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al enviar.')
      toast.success('Reporte enviado. ¡Gracias por ayudar!')
      setOpen(false)
      reset()
    } catch (err: any) {
      toast.error(err.message === 'Failed to fetch' ? 'Sin conexión. Intenta de nuevo.' : err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="max-w-md rounded-none border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-0 gap-0">
        <DialogHeader className="border-b-2 border-black p-5 space-y-1">
          <DialogTitle className="font-heading font-black italic uppercase tracking-tight text-xl flex items-center gap-2">
            <Flag className="w-5 h-5 text-primary" /> Reportar Dato Errado
          </DialogTitle>
          {serviceName && (
            <p className="font-mono text-[10px] uppercase tracking-widest text-black/50">
              {serviceName.toUpperCase()}
            </p>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {isGeneral && (
            <div>
              <Label className="font-mono text-[10px] uppercase tracking-widest text-black/60">
                ¿Cuál servicio? (opcional)
              </Label>
              <Input
                value={form.service_name_hint}
                onChange={e => set('service_name_hint', e.target.value)}
                placeholder="Ej: Aguas y Aguas"
                className="brutalist-input mt-1"
              />
            </div>
          )}

          <div>
            <Label className="font-mono text-[10px] uppercase tracking-widest text-black/60">
              ¿Qué dato está errado? *
            </Label>
            <Textarea
              value={form.message}
              onChange={e => set('message', e.target.value)}
              placeholder="Ej: El teléfono está desactualizado. El número correcto es..."
              className="brutalist-input mt-1"
              rows={4}
              required
            />
          </div>

          <div className="border-t-2 border-dashed border-black/20 pt-4 space-y-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-black/40">
              Tu contacto (opcional)
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="font-mono text-[10px] uppercase tracking-widest text-black/60">Tu nombre</Label>
                <Input value={form.reporter_name} onChange={e => set('reporter_name', e.target.value)} placeholder="María García" className="brutalist-input mt-1" />
              </div>
              <div>
                <Label className="font-mono text-[10px] uppercase tracking-widest text-black/60">Tu WhatsApp</Label>
                <Input value={form.reporter_whatsapp} onChange={e => set('reporter_whatsapp', e.target.value)} placeholder="310 000 0000" className="brutalist-input mt-1" />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-black text-white border-2 border-black shadow-[4px_4px_0px_black] font-heading font-black text-sm uppercase tracking-widest hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_black] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flag className="w-4 h-4" />}
            {loading ? 'Enviando...' : 'Enviar Reporte'}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
