'use client'

import { Star, Pencil, Trash2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ReviewWithRelations } from '@/lib/types/database'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface ReviewCardProps {
  review: ReviewWithRelations
  isOwner: boolean
  canRespond: boolean
  onEdit?: () => void
  onDelete?: () => void
  onRespond?: () => void
}

export function ReviewCard({
  review,
  isOwner,
  canRespond,
  onEdit,
  onDelete,
  onRespond,
}: ReviewCardProps) {
  const userName = review.user?.full_name || 'Usuario eliminado'
  const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase()

  return (
    <Card className="brutalist-card">
      <CardContent className="p-4 space-y-3">
        {/* Header: User info + Actions */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-black">
              <AvatarImage src={review.user?.avatar_url || undefined} alt={userName} />
              <AvatarFallback className="bg-secondary text-black font-bold">
                {userInitials}
              </AvatarFallback>
            </Avatar>

            <div>
              <p className="font-bold text-sm uppercase tracking-tight">{userName}</p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(review.created_at), {
                  addSuffix: true,
                  locale: es,
                })}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          {isOwner && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={onEdit}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={onDelete}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Star rating */}
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((position) => (
            <Star
              key={position}
              className={cn(
                'h-5 w-5 stroke-black stroke-2',
                position <= review.rating
                  ? 'fill-primary text-primary'
                  : 'fill-white text-white'
              )}
            />
          ))}
        </div>

        {/* Review text */}
        {review.review_text && (
          <p className="text-sm leading-relaxed">{review.review_text}</p>
        )}

        {/* Business response */}
        {review.response && (
          <div className="mt-4 pl-4 border-l-4 border-secondary bg-secondary/10 p-3">
            <p className="text-xs font-bold uppercase tracking-widest mb-2">
              Respuesta del negocio
            </p>
            <p className="text-sm">{review.response.response_text}</p>
            <p className="text-xs text-muted-foreground mt-2">
              {formatDistanceToNow(new Date(review.response.created_at), {
                addSuffix: true,
                locale: es,
              })}
            </p>
          </div>
        )}

        {/* Respond button for business owner */}
        {canRespond && !review.response && (
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={onRespond}
          >
            Responder
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
