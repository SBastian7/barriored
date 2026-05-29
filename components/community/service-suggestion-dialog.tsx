'use client'

import { useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Label }    from '@/components/ui/label'
import { Input }    from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast }          from 'sonner'
import { Siren, Loader2 } from 'lucide-react'

const CATEGORIES = [
  { value: 'emergency', label: 'Emergencias' },
  { value: 'health',    label: 'Salud' },
  { value: 'utilities', label: 'Servicios Públicos' },
]

interface Props {
  communityId:   string
  communityName: string
  children:      React.ReactNode
}

export function ServiceSuggestionDialog({ communityId, communityName, children }: Props) {
  const [open,    setOpen]    = useState(false)
  const [loading, setLoading] = useState(false)
  const [form,    setForm]    = useState({
    service_name:      '',
    category:          '',
    phone:             '',
    address:           '',
    message:           '',
    reporter_name:     '',
    reporter_whatsapp: '',
  })

  function set(field: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function reset() {
    setForm({ service_name: '', category: '', phone: '', address: '', message: '', reporter_name: '', reporter_whatsapp: '' })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.service_name || !form.category || !form.phone) {
      toast.error('Nombre, categoría y teléfono son obligatorios.')
      return
    }
    setLoading(true)
    try {
      const res  = await fetch('/api/community/services/suggest', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...form, community_id: communityId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al enviar.')
      toast.success('¡Gracias! Revisaremos tu sugerencia.')
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
            <Siren className="w-5 h-5 text-primary" /> Informar Servicio
          </DialogTitle>
          <p className="font-mono text-[10px] uppercase tracking-widest text-black/50">
            {communityName.toUpperCase()} · SUGERENCIA DE NUEVO SERVICIO
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto max-h-[70vh]">
          <div>
            <Label className="font-mono text-[10px] uppercase tracking-widest text-black/60">
              Nombre del servicio *
            </Label>
            <Input
              value={form.service_name}
              onChange={e => set('service_name', e.target.value)}
              placeholder="Ej: Centro de Salud Sur"
              className="brutalist-input mt-1"
              required
            />
          </div>

          <div>
            <Label className="font-mono text-[10px] uppercase tracking-widest text-black/60">
              Categoría *
            </Label>
            <Select value={form.category} onValueChange={v => set('category', v)} required>
              <SelectTrigger className="brutalist-input mt-1">
                <SelectValue placeholder="Selecciona una categoría" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="font-mono text-[10px] uppercase tracking-widest text-black/60">
              Teléfono *
            </Label>
            <Input
              value={form.phone}
              onChange={e => set('phone', e.target.value)}
              placeholder="Ej: (606) 312 0000"
              className="brutalist-input mt-1"
              required
            />
          </div>

          <div>
            <Label className="font-mono text-[10px] uppercase tracking-widest text-black/60">
              Dirección (opcional)
            </Label>
            <Input
              value={form.address}
              onChange={e => set('address', e.target.value)}
              placeholder="Ej: Calle 5 #10-20"
              className="brutalist-input mt-1"
            />
          </div>

          <div>
            <Label className="font-mono text-[10px] uppercase tracking-widest text-black/60">
              Información adicional (opcional)
            </Label>
            <Textarea
              value={form.message}
              onChange={e => set('message', e.target.value)}
              placeholder="Horario, servicios que ofrece, observaciones..."
              className="brutalist-input mt-1"
              rows={3}
            />
          </div>

          <div className="border-t-2 border-dashed border-black/20 pt-4 space-y-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-black/40">
              Tu contacto (opcional · para confirmarte que lo agregamos)
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
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-primary text-white border-2 border-black shadow-[4px_4px_0px_black] font-heading font-black text-sm uppercase tracking-widest hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_black] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Siren className="w-4 h-4" />}
            {loading ? 'Enviando...' : 'Enviar Sugerencia'}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
