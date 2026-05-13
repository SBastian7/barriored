'use client'

import { useEffect, useState } from 'react'
import { ReviewWithRelations } from '@/lib/types/database'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { Star, Pencil, Trash2, Loader2, Store, MessageSquare } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import Link from 'next/link'
import { ReviewForm } from './review-form'

interface MyReviewsProps {
  userId: string
}

export function MyReviews({ userId }: MyReviewsProps) {
  const [reviews, setReviews] = useState<ReviewWithRelations[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [reviewToDelete, setReviewToDelete] = useState<string | null>(null)
  const [reviewToEdit, setReviewToEdit] = useState<ReviewWithRelations | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)

  const fetchReviews = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/reviews/my-reviews')
      const data = await response.json()

      if (response.ok) {
        setReviews(data.reviews)
      } else {
        toast.error(data.error || 'Error al cargar tus reseñas')
      }
    } catch (error) {
      console.error('Error fetching reviews:', error)
      toast.error('Error al cargar tus reseñas')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchReviews()
  }, [])

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

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (reviews.length === 0) {
    return (
      <Card className="brutalist-card p-12 text-center space-y-4">
        <MessageSquare className="h-16 w-16 mx-auto text-black/20" />
        <h3 className="font-heading font-black uppercase text-2xl">
          Sin reseñas aún
        </h3>
        <p className="text-black/60">
          No has escrito ninguna reseña todavía. Visita negocios y deja tu opinión.
        </p>
        <Link href="/parqueindustrial/directory" className="inline-block">
          <Button className="brutalist-button bg-primary text-primary-foreground mt-4">
            EXPLORAR NEGOCIOS
          </Button>
        </Link>
      </Card>
    )
  }

  return (
    <>
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="brutalist-card">
            <CardContent className="p-6 text-center">
              <div className="text-4xl font-black text-primary mb-2">
                {reviews.length}
              </div>
              <div className="text-xs font-black uppercase tracking-widest text-black/60">
                Total Reseñas
              </div>
            </CardContent>
          </Card>
          <Card className="brutalist-card">
            <CardContent className="p-6 text-center">
              <div className="text-4xl font-black text-primary mb-2">
                {(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)}
              </div>
              <div className="text-xs font-black uppercase tracking-widest text-black/60">
                Promedio Rating
              </div>
            </CardContent>
          </Card>
          <Card className="brutalist-card">
            <CardContent className="p-6 text-center">
              <div className="text-4xl font-black text-primary mb-2">
                {reviews.filter(r => r.response).length}
              </div>
              <div className="text-xs font-black uppercase tracking-widest text-black/60">
                Con Respuesta
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Reviews List */}
        <div className="space-y-4">
          {reviews.map((review) => {
            const businessName = review.business?.name || 'Negocio eliminado'
            const communitySlug = review.business?.communities?.slug || 'default'
            const businessSlug = review.business?.slug || ''

            return (
              <Card key={review.id} className="brutalist-card">
                <CardContent className="p-6 space-y-4">
                  {/* Header: Business + Actions */}
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      href={`/${communitySlug}/business/${businessSlug}`}
                      className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                    >
                      <Store className="h-5 w-5 text-primary shrink-0" />
                      <div>
                        <h3 className="font-heading font-black uppercase text-lg leading-tight">
                          {businessName}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(review.created_at), {
                            addSuffix: true,
                            locale: es,
                          })}
                        </p>
                      </div>
                    </Link>

                    {/* Action buttons */}
                    <div className="flex gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => {
                          setReviewToEdit(review)
                          setIsFormOpen(true)
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => setReviewToDelete(review.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Star rating */}
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-5 w-5 ${star <= review.rating
                              ? 'fill-secondary stroke-black'
                              : 'stroke-black/20'
                            }`}
                        />
                      ))}
                    </div>
                    <span className="font-black text-sm">{review.rating}/5</span>
                  </div>

                  {/* Review text */}
                  {review.review_text && (
                    <p className="text-sm text-foreground leading-relaxed">
                      {review.review_text}
                    </p>
                  )}

                  {/* Business response */}
                  {review.response && (
                    <div className="border-l-4 border-accent pl-4 py-2 bg-accent/5">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className="bg-accent text-accent-foreground border-2 border-black rounded-none text-[10px]">
                          Respuesta del Negocio
                        </Badge>
                      </div>
                      <p className="text-sm text-foreground/80">
                        {review.response}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Edit Review Form */}
      {isFormOpen && reviewToEdit && (
        <ReviewForm
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          businessId={reviewToEdit.business_id}
          businessName={reviewToEdit.business?.name || 'Negocio'}
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
              className="brutalist-button bg-red-600 text-white hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
