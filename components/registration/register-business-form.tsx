'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useCommunity } from '@/components/community/community-provider'
import { StepBasicInfo } from './step-basic-info'
import { StepContact } from './step-contact'
import { StepLocation } from './step-location'
import { StepPhotos } from './step-photos'
import { StepConfirmation } from './step-confirmation'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Check, ChevronLeft, ChevronRight, Loader2, ArrowRight } from 'lucide-react'

type FormData = {
  name: string; category_id: string; subcategory_id: string; description: string
  phone: string; whatsapp: string; email: string; website: string
  address: string; latitude: number; longitude: number
  hours: Record<string, { open: string; close: string }>
  photos: string[]; main_photo_index: number
}

const INITIAL: FormData = {
  name: '', category_id: '', subcategory_id: '', description: '',
  phone: '', whatsapp: '', email: '', website: '',
  address: '', latitude: 4.8133, longitude: -75.6961,
  hours: {}, photos: [], main_photo_index: 0,
}

const STEPS = [
  { key: 'info', label: 'Informacion', icon: '1' },
  { key: 'contact', label: 'Contacto', icon: '2' },
  { key: 'location', label: 'Ubicacion', icon: '3' },
  { key: 'photos', label: 'Fotos', icon: '4' },
  { key: 'confirm', label: 'Confirmar', icon: '5' },
]

const STORAGE_KEY = 'barriored_register_form'
const STEP_KEY = 'barriored_register_step'

// Validation functions per step
function validateStep0(form: FormData): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!form.name || form.name.trim().length < 2) errors.name = 'Minimo 2 caracteres'
  if (!form.category_id) errors.category_id = 'Selecciona una categoria'
  if (!form.description || form.description.trim().length < 10) errors.description = 'Describe tu negocio (minimo 10 caracteres)'
  if (form.description && form.description.length > 500) errors.description = 'Maximo 500 caracteres'
  return errors
}

function validateStep1(form: FormData): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!form.whatsapp || !/^57[0-9]{10}$/.test(form.whatsapp)) {
    errors.whatsapp = 'Numero colombiano: 57 + 10 digitos'
  }
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Email invalido'
  }
  if (form.website && !/^https?:\/\/.+/.test(form.website)) {
    errors.website = 'URL debe iniciar con https://'
  }
  return errors
}

function validateStep2(form: FormData): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!form.address || form.address.trim().length < 5) errors.address = 'Ingresa la direccion (minimo 5 caracteres)'
  return errors
}

function validateStep3(_form: FormData): Record<string, string> {
  return {} // Photos are optional
}

const VALIDATORS = [validateStep0, validateStep1, validateStep2, validateStep3]

export function RegisterBusinessForm() {
  const community = useCommunity()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [highestCompleted, setHighestCompleted] = useState(-1)

  // Initialize from localStorage
  const [step, setStep] = useState(() => {
    if (typeof window === 'undefined') return 0
    const saved = sessionStorage.getItem(STEP_KEY)
    return saved ? parseInt(saved, 10) : 0
  })

  const [form, setForm] = useState<FormData>(() => {
    if (typeof window === 'undefined') return INITIAL
    const saved = sessionStorage.getItem(STORAGE_KEY)
    if (saved) {
      try { return { ...INITIAL, ...JSON.parse(saved) } } catch { /* ignore */ }
    }
    return INITIAL
  })

  // Persist form to sessionStorage
  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(form))
  }, [form])

  useEffect(() => {
    sessionStorage.setItem(STEP_KEY, String(step))
  }, [step])

  const update = useCallback((partial: Partial<FormData>) => {
    setForm((prev) => ({ ...prev, ...partial }))
    // Clear related errors when user types
    setErrors((prev) => {
      const next = { ...prev }
      Object.keys(partial).forEach(k => delete next[k])
      return next
    })
  }, [])

  function tryGoNext() {
    if (step >= STEPS.length - 1) return

    const validator = VALIDATORS[step]
    if (validator) {
      const stepErrors = validator(form)
      if (Object.keys(stepErrors).length > 0) {
        setErrors(stepErrors)
        toast.error('Completa los campos requeridos')
        return
      }
    }

    setErrors({})
    setHighestCompleted(prev => Math.max(prev, step))
    setStep(step + 1)
  }

  function goBack() {
    if (step > 0) {
      setErrors({})
      setStep(step - 1)
    }
  }

  function goToStep(target: number) {
    // Can only click to go to already completed steps or current
    if (target <= highestCompleted + 1 && target <= step) {
      setErrors({})
      setStep(target)
    }
  }

  async function handleSubmit() {
    setLoading(true)

    // Reorder photos so main photo is first
    const reorderedPhotos = [...form.photos]
    if (form.main_photo_index > 0 && form.main_photo_index < reorderedPhotos.length) {
      const [main] = reorderedPhotos.splice(form.main_photo_index, 1)
      reorderedPhotos.unshift(main)
    }

    const submitData = {
      ...form,
      photos: reorderedPhotos,
      // Use subcategory as category if it exists
      category_id: form.subcategory_id || form.category_id,
      community_id: community.id,
    }

    // Remove non-DB fields
    const { subcategory_id, main_photo_index, ...rest } = submitData as any

    const res = await fetch('/api/businesses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rest),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      toast.error(typeof data.error === 'string' ? data.error : 'Error al registrar. Verifica los datos.')
      return
    }

    // Clear storage
    sessionStorage.removeItem(STORAGE_KEY)
    sessionStorage.removeItem(STEP_KEY)

    toast.success('Negocio registrado exitosamente. Sera revisado por un administrador.')
    router.push(`/${community.slug}`)
  }

  return (
    <div className="max-w-2xl mx-auto bg-white border-4 border-black p-6 md:p-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-heading font-black uppercase italic mb-2 tracking-tight">
          Registro de Negocio
        </h1>
      </div>

      {/* Step indicators - clickable */}
      <div className="flex gap-1 mb-8 overflow-x-auto pb-2">
        {STEPS.map((s, i) => {
          const isCompleted = i <= highestCompleted
          const isCurrent = i === step
          const isClickable = i <= highestCompleted + 1 && i <= step

          return (
            <button
              key={s.key}
              type="button"
              onClick={() => goToStep(i)}
              disabled={!isClickable}
              className={cn(
                'flex-1 flex flex-col items-center gap-1 py-2 px-1 border-2 border-black transition-all min-w-[60px]',
                isCurrent && 'bg-primary text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] translate-x-[-1px] translate-y-[-1px]',
                isCompleted && !isCurrent && 'bg-black/10 cursor-pointer',
                !isCompleted && !isCurrent && 'bg-white text-black/30 cursor-default'
              )}
            >
              <span className={cn(
                'w-6 h-6 flex items-center justify-center border-2 text-xs font-black',
                isCurrent ? 'border-white bg-white text-primary' : isCompleted ? 'border-black bg-black text-white' : 'border-black/20'
              )}>
                {isCompleted && !isCurrent ? <Check className="h-3 w-3" /> : s.icon}
              </span>
              <span className="text-[9px] font-black uppercase tracking-widest hidden sm:block">{s.label}</span>
            </button>
          )
        })}
      </div>

      {/* Current step label (mobile) */}
      <p className="text-center font-bold text-black/60 uppercase text-xs tracking-widest mb-6 sm:hidden">
        Paso {step + 1}: {STEPS[step].label}
      </p>

      {/* Step content */}
      <div className="min-h-[320px]">
        {step === 0 && <StepBasicInfo form={form} update={update} errors={errors} />}
        {step === 1 && <StepContact form={form} update={update} errors={errors} />}
        {step === 2 && <StepLocation form={form} update={update} errors={errors} />}
        {step === 3 && <StepPhotos form={form} update={update} errors={errors} />}
        {step === 4 && <StepConfirmation form={form} />}
      </div>

      {/* Navigation buttons */}
      <div className="flex gap-4 mt-10 border-t-4 border-black pt-6">
        {step > 0 && (
          <Button
            type="button"
            variant="outline"
            onClick={goBack}
            className="gap-2 px-6 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="font-black uppercase text-xs tracking-wider">Atras</span>
          </Button>
        )}

        {step < STEPS.length - 1 ? (
          <Button
            type="button"
            className="flex-1 py-6 text-base gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all"
            onClick={tryGoNext}
          >
            <span className="font-black uppercase tracking-wider">Siguiente</span>
            <ArrowRight className="h-5 w-5" />
          </Button>
        ) : (
          <Button
            type="button"
            className="flex-1 py-6 text-base bg-accent hover:bg-accent/90 gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="font-black uppercase tracking-wider">Procesando...</span>
              </>
            ) : (
              <>
                <Check className="h-5 w-5" />
                <span className="font-black uppercase tracking-wider">Finalizar Registro</span>
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
