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
    <div className="max-w-lg mx-auto">
      {/* Progress */}
      <div className="flex gap-1 mb-6">
        {STEPS.map((s, i) => (
          <div key={s} className={`flex-1 h-1 rounded ${i <= step ? 'bg-blue-600' : 'bg-gray-200'}`} />
        ))}
      </div>
      <p className="text-sm text-gray-500 mb-4">Paso {step + 1} de {STEPS.length}: {STEPS[step]}</p>

      {step === 0 && <StepBasicInfo form={form} update={update} />}
      {step === 1 && <StepContact form={form} update={update} />}
      {step === 2 && <StepLocation form={form} update={update} />}
      {step === 3 && <StepPhotos form={form} update={update} />}
      {step === 4 && <StepConfirmation form={form} />}

      <div className="flex gap-3 mt-6">
        {step > 0 && (
          <Button variant="outline" onClick={() => setStep(step - 1)}>Atras</Button>
        )}
        {step < STEPS.length - 1 ? (
          <Button className="flex-1" onClick={() => setStep(step + 1)}>Siguiente</Button>
        ) : (
          <Button className="flex-1" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Registrando...' : 'Registrar negocio'}
          </Button>
        )}
      </div>
    </div>
  )
}
