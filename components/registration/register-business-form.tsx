'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCommunity } from '@/components/community/community-provider'
import { StepBasicInfo } from './step-basic-info'
import { StepContact } from './step-contact'
import { StepLocation } from './step-location'
import { StepPhotos } from './step-photos'
import { StepConfirmation } from './step-confirmation'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

type FormData = {
  name: string; category_id: string; description: string
  phone: string; whatsapp: string; email: string; website: string
  address: string; latitude: number; longitude: number
  hours: Record<string, { open: string; close: string }>
  photos: string[]
}

const INITIAL: FormData = {
  name: '', category_id: '', description: '',
  phone: '', whatsapp: '', email: '', website: '',
  address: '', latitude: 4.8133, longitude: -75.6961,
  hours: {}, photos: [],
}

const STEPS = ['Informacion', 'Contacto', 'Ubicacion', 'Fotos', 'Confirmar']

export function RegisterBusinessForm() {
  const community = useCommunity()
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormData>(INITIAL)
  const [loading, setLoading] = useState(false)

  function update(partial: Partial<FormData>) {
    setForm((prev) => ({ ...prev, ...partial }))
  }

  async function handleSubmit() {
    setLoading(true)
    const res = await fetch('/api/businesses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, community_id: community.id }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      toast.error(typeof data.error === 'string' ? data.error : 'Error al registrar')
      return
    }

    toast.success('Negocio registrado. Sera revisado por un administrador.')
    router.push(`/${community.slug}`)
  }

  return (
    <div className="max-w-2xl mx-auto bg-white border-4 border-black p-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-heading font-black uppercase italic mb-2 tracking-tight">Registro de Negocio</h1>
        <p className="font-bold text-black/60 uppercase text-xs tracking-widest">{STEPS[step]}</p>
      </div>

      {/* Progress */}
      <div className="flex gap-2 mb-10 overflow-hidden border-2 border-black p-1 bg-black/5">
        {STEPS.map((s, i) => (
          <div key={s} className={`flex-1 h-3 transition-all duration-500 ${i <= step ? 'bg-primary border-r-2 border-black last:border-0' : 'bg-white border-r-2 border-black last:border-0'}`} />
        ))}
      </div>

      <div className="min-h-[300px]">
        {step === 0 && <StepBasicInfo form={form} update={update} />}
        {step === 1 && <StepContact form={form} update={update} />}
        {step === 2 && <StepLocation form={form} update={update} />}
        {step === 3 && <StepPhotos form={form} update={update} />}
        {step === 4 && <StepConfirmation form={form} />}
      </div>

      <div className="flex gap-4 mt-12 border-t-4 border-black pt-8">
        {step > 0 && (
          <Button variant="outline" onClick={() => setStep(step - 1)} className="px-8">Atrás</Button>
        )}
        {step < STEPS.length - 1 ? (
          <Button className="flex-1 py-6 text-xl" onClick={() => setStep(step + 1)}>Siguiente Paso</Button>
        ) : (
          <Button className="flex-1 py-6 text-xl bg-accent hover:bg-accent/90" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Procesando...' : 'Finalizar Registro'}
          </Button>
        )}
      </div>
    </div>
  )
}
