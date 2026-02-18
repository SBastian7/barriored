'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Props = { form: any; update: (v: any) => void }

export function StepContact({ form, update }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <Label>WhatsApp (obligatorio)</Label>
        <Input value={form.whatsapp} onChange={(e) => update({ whatsapp: e.target.value })} placeholder="573001234567" />
        <p className="text-xs text-gray-500 mt-1">Formato: 57 + 10 digitos. Este sera tu boton de contacto.</p>
      </div>
      <div>
        <Label>Telefono fijo</Label>
        <Input value={form.phone} onChange={(e) => update({ phone: e.target.value })} placeholder="6061234567" />
      </div>
      <div>
        <Label>Email (opcional)</Label>
        <Input type="email" value={form.email} onChange={(e) => update({ email: e.target.value })} />
      </div>
      <div>
        <Label>Sitio web (opcional)</Label>
        <Input value={form.website} onChange={(e) => update({ website: e.target.value })} placeholder="https://" />
      </div>
    </div>
  )
}
