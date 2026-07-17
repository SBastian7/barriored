'use client'

import { useState } from 'react'
import { Flag, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface FlagReviewButtonProps {
  reviewId: string
  businessId: string
}

const flagReasons = [
  { value: 'spam', label: 'Spam' },
  { value: 'offensive', label: 'Ofensivo' },
  { value: 'fake', label: 'Falso' },
  { value: 'irrelevant', label: 'Irrelevante' },
  { value: 'other', label: 'Otro' }
]

export function FlagReviewButton({ reviewId, businessId }: FlagReviewButtonProps) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<string>('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!reason) {
      setError('Debes seleccionar una razón.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`/api/reviews/${reviewId}/flag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason,
          ...(description.trim() && { description: description.trim() })
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al reportar reseña')
      }

      setSuccess(true)
      setTimeout(() => {
        setOpen(false)
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Error al reportar reseña')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!submitting) {
      setOpen(false)
      setReason('')
      setDescription('')
      setError(null)
    }
  }

  // Don't show button if already flagged successfully
  if (success && !open) {
    return null
  }

  return (
    <>
      {/* Trigger Button */}
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        size="sm"
        className="brutalist-button text-xs"
      >
        <Flag className="w-3 h-3 mr-1" />
        Reportar
      </Button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60"
            onClick={handleClose}
          />

          {/* Modal Content */}
          <div className="relative brutalist-card max-w-md w-full p-6 bg-white border-4 border-black">
            {/* Close Button */}
            <button
              onClick={handleClose}
              disabled={submitting}
              className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Title */}
            <h2 className="font-black text-xl uppercase tracking-widest mb-4 pr-8">
              Reportar Reseña
            </h2>

            {success ? (
              /* Success State */
              <div className="brutalist-card p-4 bg-green-50 border-green-600">
                <p className="text-sm text-green-800 font-bold">
                  ✅ Reseña reportada. Un administrador la revisará.
                </p>
              </div>
            ) : (
              /* Form */
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Reason Select */}
                <div>
                  <Label className="text-xs font-bold uppercase tracking-widest mb-2 block">
                    Razón *
                  </Label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="brutalist-input w-full"
                    required
                    disabled={submitting}
                  >
                    <option value="">Selecciona una razón</option>
                    {flagReasons.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Description Textarea */}
                <div>
                  <Label className="text-xs font-bold uppercase tracking-widest mb-2 block">
                    Descripción (Opcional)
                  </Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe el problema..."
                    className="brutalist-input min-h-[100px]"
                    maxLength={500}
                    disabled={submitting}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {description.length}/500 caracteres
                  </p>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="brutalist-card p-3 border-red-600 bg-red-50">
                    <p className="text-sm text-red-700 font-bold">{error}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="brutalist-button bg-primary text-white hover:bg-primary/90 flex-1"
                  >
                    {submitting ? 'Enviando...' : 'Enviar Reporte'}
                  </Button>
                  <Button
                    type="button"
                    onClick={handleClose}
                    disabled={submitting}
                    variant="outline"
                    className="brutalist-button"
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
