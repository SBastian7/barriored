'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { StarRating } from './star-rating'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface ReviewFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  businessId: string
  businessName: string
  existingReview?: {
    id: string
    rating: number
    review_text: string | null
  } | null
  onSuccess: () => void
}

export function ReviewForm({
  open,
  onOpenChange,
  businessId,
  businessName,
  existingReview,
  onSuccess,
}: ReviewFormProps) {
  const [rating, setRating] = useState<number | null>(existingReview?.rating || null)
  const [reviewText, setReviewText] = useState(existingReview?.review_text || '')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isEditing = !!existingReview
  const charCount = reviewText.length
  const maxChars = 1000

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!rating) {
      toast.error('Selecciona una calificación de 1 a 5 estrellas.')
      return
    }

    setIsSubmitting(true)

    try {
      const url = isEditing
        ? `/api/reviews/${existingReview.id}`
        : '/api/reviews'

      const method = isEditing ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: businessId,
          rating,
          review_text: reviewText.trim() || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Error al guardar reseña')
        return
      }

      toast.success(isEditing ? 'Reseña actualizada' : '¡Reseña publicada!')
      onSuccess()
      onOpenChange(false)

      // Reset form
      setRating(null)
      setReviewText('')
    } catch (error) {
      console.error('Error submitting review:', error)
      toast.error('Error al guardar reseña. Intenta de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] brutalist-card">
        <DialogHeader>
          <DialogTitle className="font-heading font-black uppercase italic text-xl">
            {isEditing ? 'Editar Reseña' : 'Escribir Reseña'}
          </DialogTitle>
          <DialogDescription>
            {businessName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Star rating */}
          <div className="space-y-2">
            <Label className="uppercase tracking-widest text-xs font-bold">
              Calificación *
            </Label>
            <StarRating value={rating} onChange={setRating} size="lg" />
          </div>

          {/* Review text */}
          <div className="space-y-2">
            <Label htmlFor="review-text" className="uppercase tracking-widest text-xs font-bold">
              Reseña (opcional)
            </Label>
            <Textarea
              id="review-text"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Comparte tu experiencia..."
              className="brutalist-input min-h-[120px] resize-none"
              maxLength={maxChars}
            />
            <p className="text-xs text-muted-foreground text-right">
              {charCount}/{maxChars}
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="brutalist-button"
              disabled={!rating || isSubmitting}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Actualizar' : 'Publicar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
