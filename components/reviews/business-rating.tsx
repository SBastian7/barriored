import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BusinessRatingProps {
  averageRating: number
  reviewCount: number
  size?: 'sm' | 'md' | 'lg'
  showCount?: boolean
}

export function BusinessRating({
  averageRating,
  reviewCount,
  size = 'md',
  showCount = true,
}: BusinessRatingProps) {
  // Don't render if no reviews
  if (reviewCount === 0) {
    return null
  }

  const starSize = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  }[size]

  const textSize = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }[size]

  const fullStars = Math.floor(averageRating)
  const hasHalfStar = averageRating % 1 >= 0.5

  return (
    <div className="flex items-center gap-1.5">
      {/* Star display */}
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((position) => {
          const isFilled = position <= fullStars
          const isHalf = position === fullStars + 1 && hasHalfStar

          return (
            <Star
              key={position}
              className={cn(
                starSize,
                'stroke-black stroke-2',
                isFilled && 'fill-primary text-primary',
                !isFilled && !isHalf && 'fill-white text-white',
                isHalf && 'fill-primary/50 text-primary/50'
              )}
            />
          )
        })}
      </div>

      {/* Rating number */}
      <span className={cn('font-bold tracking-tight', textSize)}>
        {averageRating.toFixed(1)}
      </span>

      {/* Review count */}
      {showCount && (
        <span className={cn('text-muted-foreground', textSize)}>
          ({reviewCount})
        </span>
      )}
    </div>
  )
}
