'use client'

import { Star } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface StarRatingProps {
  value: number | null
  onChange?: (rating: number) => void
  readonly?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function StarRating({ value, onChange, readonly = false, size = 'md' }: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null)

  const displayRating = hoverRating !== null ? hoverRating : value || 0

  const starSize = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  }[size]

  const handleClick = (rating: number) => {
    if (!readonly && onChange) {
      onChange(rating)
    }
  }

  const handleMouseEnter = (rating: number) => {
    if (!readonly) {
      setHoverRating(rating)
    }
  }

  const handleMouseLeave = () => {
    if (!readonly) {
      setHoverRating(null)
    }
  }

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((rating) => {
        const isFilled = rating <= displayRating

        return (
          <button
            key={rating}
            type="button"
            onClick={() => handleClick(rating)}
            onMouseEnter={() => handleMouseEnter(rating)}
            onMouseLeave={handleMouseLeave}
            disabled={readonly}
            className={cn(
              'transition-transform',
              !readonly && 'hover:scale-110 cursor-pointer',
              readonly && 'cursor-default'
            )}
            aria-label={`${rating} estrellas`}
          >
            <Star
              className={cn(
                starSize,
                'stroke-black stroke-2',
                isFilled ? 'fill-primary text-primary' : 'fill-white text-white'
              )}
            />
          </button>
        )
      })}
    </div>
  )
}
