'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ReviewForm } from './review-form'
import { Star } from 'lucide-react'
import { toast } from 'sonner'

interface WriteReviewButtonProps {
  businessId: string
  businessName: string
  businessOwnerId: string
  currentUserId: string | null
}

export function WriteReviewButton({
  businessId,
  businessName,
  businessOwnerId,
  currentUserId,
}: WriteReviewButtonProps) {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [existingReview, setExistingReview] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Check if user already reviewed this business
  useEffect(() => {
    if (!currentUserId) return

    const checkExistingReview = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/reviews?business_id=${businessId}`)
        const data = await response.json()

        if (response.ok) {
          const userReview = data.reviews.find(
            (r: any) => r.user?.id === currentUserId
          )
          setExistingReview(userReview || null)
        }
      } catch (error) {
        console.error('Error checking existing review:', error)
      } finally {
        setIsLoading(false)
      }
    }

    checkExistingReview()
  }, [businessId, currentUserId])

  // Don't show button if not authenticated
  if (!currentUserId) {
    return null
  }

  // Don't show button if user owns the business
  if (currentUserId === businessOwnerId) {
    return null
  }

  // Hide button completely if user already reviewed (they can edit/delete from the review card)
  if (existingReview) {
    return null
  }

  return (
    <>
      <Button
        onClick={() => setIsFormOpen(true)}
        className="brutalist-button"
        disabled={isLoading}
      >
        <Star className="mr-2 h-4 w-4" />
        Escribir Reseña
      </Button>

      <ReviewForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        businessId={businessId}
        businessName={businessName}
        existingReview={null}
        onSuccess={() => {
          window.location.reload() // Simple refresh to update all components
        }}
      />
    </>
  )
}
