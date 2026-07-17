'use client'

import { useEffect, useState } from 'react'
import { ReviewCard } from './review-card'
import { ReviewForm } from './review-form'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ReviewWithRelations } from '@/lib/types/database'
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'

interface ReviewListProps {
  businessId: string
  businessName: string
  currentUserId: string | null
  businessOwnerId: string
}

export function ReviewList({
  businessId,
  businessName,
  currentUserId,
  businessOwnerId,
}: ReviewListProps) {
  const [reviews, setReviews] = useState<ReviewWithRelations[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [sort, setSort] = useState<'newest' | 'highest' | 'lowest'>('newest')
  const [page, setPage] = useState(0)
  const [reviewToEdit, setReviewToEdit] = useState<ReviewWithRelations | null>(null)
  const [reviewToDelete, setReviewToDelete] = useState<string | null>(null)
  const [reviewToRespond, setReviewToRespond] = useState<ReviewWithRelations | null>(null)
  const [responseText, setResponseText] = useState('')
  const [isSubmittingResponse, setIsSubmittingResponse] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)

  const pageSize = 10
  const totalPages = Math.ceil(totalCount / pageSize)

  const fetchReviews = async () => {
    setIsLoading(true)
    try {
      const offset = page * pageSize
      const response = await fetch(
        `/api/reviews?business_id=${businessId}&limit=${pageSize}&offset=${offset}&sort=${sort}`
      )
      const data = await response.json()

      if (response.ok) {
        setReviews(data.reviews)
        setTotalCount(data.total_count)
      } else {
        toast.error('Error al cargar reseñas')
      }
    } catch (error) {
      console.error('Error fetching reviews:', error)
      toast.error('Error al cargar reseñas')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchReviews()
  }, [businessId, sort, page])

  const handleDelete = async (reviewId: string) => {
    try {
      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Reseña eliminada')
        fetchReviews()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Error al eliminar reseña')
      }
    } catch (error) {
      console.error('Error deleting review:', error)
      toast.error('Error al eliminar reseña')
    } finally {
      setReviewToDelete(null)
    }
  }

  const handleSubmitResponse = async () => {
    if (!reviewToRespond || !responseText.trim()) return

    setIsSubmittingResponse(true)
    try {
      const response = await fetch(`/api/reviews/${reviewToRespond.id}/response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response_text: responseText.trim() }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Respuesta publicada')
        setReviewToRespond(null)
        setResponseText('')
        fetchReviews()
      } else {
        toast.error(data.error || 'Error al publicar respuesta')
      }
    } catch (error) {
      console.error('Error submitting response:', error)
      toast.error('Error al publicar respuesta')
    } finally {
      setIsSubmittingResponse(false)
    }
  }

  if (isLoading && reviews.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!isLoading && totalCount === 0) {
    return (
      <div className="text-center py-12 space-y-2">
        <p className="text-muted-foreground">Aún no hay reseñas para este negocio.</p>
        <p className="font-bold uppercase tracking-widest text-sm">
          ¡Sé el primero en dejar una reseña!
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Sort dropdown */}
      <div className="flex justify-between items-center">
        <h3 className="font-heading font-black uppercase italic text-lg">
          Reseñas ({totalCount})
        </h3>
        <Select value={sort} onValueChange={(v: any) => setSort(v)}>
          <SelectTrigger className="w-[180px] brutalist-input">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Más recientes</SelectItem>
            <SelectItem value="highest">Mejor valoradas</SelectItem>
            <SelectItem value="lowest">Peor valoradas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Reviews */}
      <div className="space-y-4">
        {reviews.map((review) => {
          const isOwner = currentUserId === review.user_id
          const isBusinessOwner = currentUserId === businessOwnerId
          const canFlag = isBusinessOwner && !isOwner

          // DEBUG: Log ownership check
          console.log('ReviewList ownership check:', {
            currentUserId,
            reviewUserId: review.user_id,
            isOwner,
            isBusinessOwner,
            canFlag,
            areEqual: currentUserId === review.user_id,
            typeOfCurrent: typeof currentUserId,
            typeOfReview: typeof review.user_id
          })

          return (
            <ReviewCard
              key={review.id}
              review={review}
              isOwner={isOwner}
              canRespond={isBusinessOwner && !review.response}
              canFlag={canFlag}
              businessId={businessId}
              onEdit={() => {
                setReviewToEdit(review)
                setIsFormOpen(true)
              }}
              onDelete={() => setReviewToDelete(review.id)}
              onRespond={() => {
                setReviewToRespond(review)
                setResponseText('')
              }}
            />
          )
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="flex items-center px-4 font-bold">
            {page + 1} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Edit Review Form */}
      {isFormOpen && (
        <ReviewForm
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          businessId={businessId}
          businessName={businessName}
          existingReview={reviewToEdit}
          onSuccess={() => {
            fetchReviews()
            setReviewToEdit(null)
          }}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!reviewToDelete} onOpenChange={() => setReviewToDelete(null)}>
        <AlertDialogContent className="brutalist-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading font-black uppercase italic">
              ¿Seguro que quieres eliminar tu reseña?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => reviewToDelete && handleDelete(reviewToDelete)}
              className="brutalist-button"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Response Dialog */}
      <AlertDialog open={!!reviewToRespond} onOpenChange={(open) => {
        if (!open) {
          setReviewToRespond(null)
          setResponseText('')
        }
      }}>
        <AlertDialogContent className="brutalist-card max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading font-black uppercase italic text-xl">
              Responder a la reseña
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              {reviewToRespond && (
                <>
                  <div className="brutalist-card p-3 bg-gray-50">
                    <p className="font-bold text-sm text-foreground mb-1">
                      {reviewToRespond.user?.full_name || 'Usuario'}
                    </p>
                    <div className="flex gap-0.5 mb-2">
                      {[1, 2, 3, 4, 5].map((position) => (
                        <span
                          key={position}
                          className={position <= reviewToRespond.rating ? '⭐' : '☆'}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-foreground italic">
                      "{reviewToRespond.review_text || 'Sin comentario'}"
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-foreground block">
                      Tu respuesta *
                    </label>
                    <textarea
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      placeholder="Escribe tu respuesta aquí... (mínimo 10 caracteres)"
                      className="brutalist-input w-full min-h-[120px] resize-none"
                      maxLength={500}
                      disabled={isSubmittingResponse}
                    />
                    <p className="text-xs text-muted-foreground">
                      {responseText.length}/500 caracteres
                    </p>
                  </div>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmittingResponse}>
              Cancelar
            </AlertDialogCancel>
            <Button
              onClick={handleSubmitResponse}
              disabled={isSubmittingResponse || responseText.trim().length < 10}
              className="brutalist-button bg-primary text-white hover:bg-primary/90"
            >
              {isSubmittingResponse ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Publicando...
                </>
              ) : (
                'Publicar Respuesta'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
