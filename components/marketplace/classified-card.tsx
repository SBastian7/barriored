import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Eye, Check, Archive, Trash2 } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { ClassifiedStatusBadge } from './classified-status-badge'
import { FavoriteButton } from './favorite-button'
import type { ClassifiedWithRelations } from '@/lib/types/database'
import { getThumbUrl } from '@/lib/image/thumbnail'

interface ClassifiedCardProps {
  classified: ClassifiedWithRelations
  variant?: 'admin' | 'public'
  onMarkSold?: (id: string) => void
  onArchive?: (id: string) => void
  onDelete?: (id: string) => void
  userId?: string | null
  isFavorited?: boolean
}

export function ClassifiedCard({
  classified,
  variant = 'admin',
  onMarkSold,
  onArchive,
  onDelete,
  userId,
  isFavorited = false,
}: ClassifiedCardProps) {
  const isPublicView = variant === 'public'
  const detailHref = isPublicView
    ? `/${classified.communities?.slug || 'default'}/marketplace/${classified.id}`
    : `/admin/marketplace/${classified.id}`
  const thumbnail = getThumbUrl(classified.images?.[0] || '') || '/placeholder-image.png'

  const cardContent = (
    <>
      {/* Thumbnail */}
      <div className="relative w-full md:w-32 h-32 shrink-0">
        <Image
          src={thumbnail}
          alt={classified.title}
          fill
          className="object-cover"
        />
        {isPublicView && (
          <div
            className="absolute top-2 right-2 z-10"
            onClick={(e) => e.preventDefault()} // Prevent card click when favoriting
          >
            <FavoriteButton
              classifiedId={classified.id}
              initialFavorited={isFavorited}
              size="sm"
              userId={userId}
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-widest text-black/40">
          <Badge
            variant="outline"
            className="text-[10px] rounded-none py-0 px-1 border-black"
          >
            {classified.marketplace_categories?.name || 'Sin categoría'}
          </Badge>
          {!isPublicView && <ClassifiedStatusBadge status={classified.status as 'active' | 'sold' | 'archived' | 'flagged' | 'removed'} />}
          <span>•</span>
          <span>{classified.profiles?.full_name || 'Anónimo'}</span>
          <span>•</span>
          <span>{classified.created_at ? new Date(classified.created_at).toLocaleDateString() : ''}</span>
        </div>

        <h3 className="font-heading font-black uppercase text-lg leading-tight">
          {classified.title}
        </h3>

        {classified.price && (
          <p className="text-primary font-black text-xl">
            {classified.price}
          </p>
        )}

        <p className="text-sm text-black/60 line-clamp-2">
          {classified.description}
        </p>
      </div>
    </>
  )

  return (
    <Card
      className={`border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all overflow-hidden bg-white ${
        classified.status === 'flagged' ? 'border-red-500 border-4' : ''
      }`}
    >
      <CardContent className="p-0">
        {isPublicView ? (
          // Public view: make entire card clickable
          <Link href={detailHref} className="block">
            <div className="flex flex-col md:flex-row divide-y-2 md:divide-y-0 md:divide-x-2 divide-black hover:bg-black/5 transition-colors">
              {cardContent}

              {/* View indicator - Mobile only */}
              <div className="flex md:hidden items-center justify-center gap-2 p-4 bg-accent/10">
                <Eye className="h-4 w-4 text-accent" />
                <span className="text-sm font-black uppercase tracking-widest text-accent">
                  Ver Detalle
                </span>
              </div>
            </div>
          </Link>
        ) : (
          // Admin view: keep separate action buttons
          <div className="flex flex-col md:flex-row divide-y-2 md:divide-y-0 md:divide-x-2 divide-black">
            {cardContent}

            {/* Actions */}
            <div className="flex flex-col divide-y-2 divide-black md:w-48">
              <Link
                href={detailHref}
                className="flex-1 flex items-center justify-center gap-2 text-sm font-black uppercase tracking-widest text-accent hover:bg-black/5 transition-colors p-4"
              >
                <Eye className="h-4 w-4" /> Ver Detalle
              </Link>

              {classified.status === 'active' && onMarkSold && (
                <button
                  onClick={() => onMarkSold(classified.id)}
                  className="flex-1 flex items-center justify-center gap-2 text-sm font-black uppercase tracking-widest text-blue-600 hover:bg-blue-50 transition-colors p-4"
                >
                  <Check className="h-4 w-4" /> Marcar Vendido
                </button>
              )}

              {classified.status === 'active' && onArchive && (
                <button
                  onClick={() => onArchive(classified.id)}
                  className="flex-1 flex items-center justify-center gap-2 text-sm font-black uppercase tracking-widest text-gray-600 hover:bg-gray-50 transition-colors p-4"
                >
                  <Archive className="h-4 w-4" /> Archivar
                </button>
              )}

              {onDelete && (
                <button
                  onClick={() => onDelete(classified.id)}
                  className="flex-1 flex items-center justify-center gap-2 text-sm font-black uppercase tracking-widest text-red-600 hover:bg-red-50 transition-colors p-4"
                >
                  <Trash2 className="h-4 w-4" /> Eliminar
                </button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
