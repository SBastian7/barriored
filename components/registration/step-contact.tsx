'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PhoneInput } from '@/components/ui/phone-input'
import { HoursEditor } from '@/components/ui/hours-editor'
import { cn } from '@/lib/utils'

type Props = { form: any; update: (v: any) => void; errors?: Record<string, string> }

export function StepContact({ form, update, errors }: Props) {
  return (
    <div className="space-y-6">
      {/* WhatsApp */}
      <div>
        <Label className="text-xs font-black uppercase tracking-widest text-black/60 mb-2 block">
          WhatsApp *
        </Label>
        <PhoneInput
          value={form.whatsapp}
          onChange={(v) => update({ whatsapp: v })}
          placeholder="300 123 4567"
          error={errors?.whatsapp}
        />
        <p className="text-xs text-black/40 font-bold mt-1">Este sera tu boton de contacto principal.</p>
      </div>

      {/* Phone */}
      <div>
        <Label className="text-xs font-black uppercase tracking-widest text-black/60 mb-2 block">
          Telefono fijo (opcional)
        </Label>
        <PhoneInput
          value={form.phone}
          onChange={(v) => update({ phone: v })}
          placeholder="606 123 4567"
        />
      </div>

      {/* Email */}
      <div>
        <Label className="text-xs font-black uppercase tracking-widest text-black/60 mb-2 block">
          Email (opcional)
        </Label>
        <Input
          type="email"
          value={form.email}
          onChange={(e) => update({ email: e.target.value })}
          placeholder="tunegocio@email.com"
          className={cn(errors?.email && 'border-red-500')}
        />
        {errors?.email && <p className="text-xs font-bold text-red-500 mt-1">{errors.email}</p>}
      </div>

      {/* Website */}
      <div>
        <Label className="text-xs font-black uppercase tracking-widest text-black/60 mb-2 block">
          Sitio web (opcional)
        </Label>
        <Input
          value={form.website}
          onChange={(e) => update({ website: e.target.value })}
          placeholder="https://minegocio.com"
          className={cn(errors?.website && 'border-red-500')}
        />
        {errors?.website && <p className="text-xs font-bold text-red-500 mt-1">{errors.website}</p>}
      </div>

      {/* Business Hours */}
      <div>
        <Label className="text-xs font-black uppercase tracking-widest text-black/60 mb-3 block">
          Horario de atencion
        </Label>
        <HoursEditor
          value={form.hours ?? {}}
          onChange={(hours) => update({ hours })}
          error={errors?.hours}
        />
      </div>
    </div>
  )
}
