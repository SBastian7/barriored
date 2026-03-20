'use client'

import { X, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PremiumBenefitsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onRequestPremium?: () => void
}

const benefits = [
  'Badge "PREMIUM" destacado en tu perfil',
  'Aparición prioritaria en directorio',
  'Mayor visibilidad en búsquedas',
  'Posición destacada en homepage'
]

export function PremiumBenefitsModal({
  open,
  onOpenChange,
  onRequestPremium
}: PremiumBenefitsModalProps) {
  const handleRequest = () => {
    if (onRequestPremium) {
      onRequestPremium()
    }
    onOpenChange(false)
  }

  const handleBackdropClick = () => {
    onOpenChange(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onOpenChange(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="premium-modal-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Modal Content */}
      <div className="relative brutalist-card max-w-lg w-full p-8 bg-white border-4 border-black">
        {/* Close Button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded transition-colors"
          aria-label="Cerrar"
          type="button"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Title */}
        <h2
          id="premium-modal-title"
          className="font-black text-3xl uppercase tracking-widest italic mb-2"
        >
          Hazte Premium
        </h2>

        <p className="text-sm text-gray-600 mb-6">
          Destaca tu negocio y llega a más clientes
        </p>

        {/* Benefits List */}
        <div className="space-y-4 mb-8">
          {benefits.map((benefit, index) => (
            <div key={index} className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center mt-0.5">
                <Check className="w-4 h-4 text-white stroke-[3]" />
              </div>
              <p className="text-sm font-medium leading-relaxed">
                {benefit}
              </p>
            </div>
          ))}
        </div>

        {/* Pricing Info */}
        <div className="brutalist-card p-4 bg-secondary/10 border-secondary mb-6">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-700 mb-1">
            Precio
          </p>
          <p className="text-sm">
            Contacta a un administrador para conocer precios y disponibilidad.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={handleRequest}
            className="brutalist-button bg-primary text-white hover:bg-primary/90 flex-1"
            type="button"
          >
            Solicitar Ahora
          </Button>
          <Button
            onClick={() => onOpenChange(false)}
            variant="outline"
            className="brutalist-button flex-1"
            type="button"
          >
            Cancelar
          </Button>
        </div>

        {/* Footer Note */}
        <p className="text-xs text-gray-500 text-center mt-4">
          Un administrador revisará tu solicitud en 24-48 horas
        </p>
      </div>
    </div>
  )
}
