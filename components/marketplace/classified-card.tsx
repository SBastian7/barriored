import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Eye, Check, Archive, Trash2 } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { ClassifiedStatusBadge } from './classified-status-badge'
import type { ClassifiedWithRelations } from '@/lib/types/database'

interface ClassifiedCardProps {
  classified: ClassifiedWithRelations
  onMarkSold?: (id: string) => void
  onArchive?: (id: string) => void
  onDelete?: (id: string) => void
}

export function ClassifiedCard({
  classified,
  onMarkSold,
  onArchive,
  onDelete,
}: ClassifiedCardProps) {
  const thumbnail = classified.images?.[0] || '/placeholder-image.png'

  return (
    <Card
      className={`border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all overflow-hidden bg-white ${
        classified.status === 'flagged' ? 'border-red-500 border-4' : ''
      }`}
    >
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row divide-y-2 md:divide-y-0 md:divide-x-2 divide-black">
          {/* Thumbnail */}
          <div className="relative w-full md:w-32 h-32 shrink-0">
            <Image
              src={thumbnail}
              alt={classified.title}
              fill
              className="object-cover"
            />
          </div>

          {/* Content */}
          <div className="p-4 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-widest text-black/40">
              <Badge
                variant="outline"
                className="text-[10px] rounded-none py-0 px-1 border-black"
              >
                {classified.marketplace_categories.name}
              </Badge>
              <ClassifiedStatusBadge status={classified.status} />
              <span>•</span>
              <span>{classified.profiles.full_name}</span>
              <span>•</span>
              <span>{new Date(classified.created_at).toLocaleDateString()}</span>
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

          {/* Actions */}
          <div className="flex flex-col divide-y-2 divide-black md:w-48">
            <Link
              href={`/admin/marketplace/${classified.id}`}
              className="flex-1 flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest text-accent hover:bg-black/5 transition-colors p-4"
            >
              <Eye className="h-3 w-3" /> Ver Detalle
            </Link>

            {classified.status === 'active' && onMarkSold && (
              <button
                onClick={() => onMarkSold(classified.id)}
                className="flex-1 flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest text-blue-600 hover:bg-blue-50 transition-colors p-4"
              >
                <Check className="h-3 w-3" /> Marcar Vendido
              </button>
            )}

            {classified.status === 'active' && onArchive && (
              <button
                onClick={() => onArchive(classified.id)}
                className="flex-1 flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest text-gray-600 hover:bg-gray-50 transition-colors p-4"
              >
                <Archive className="h-3 w-3" /> Archivar
              </button>
            )}

            {onDelete && (
              <button
                onClick={() => onDelete(classified.id)}
                className="flex-1 flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest text-red-600 hover:bg-red-50 transition-colors p-4"
              >
                <Trash2 className="h-3 w-3" /> Eliminar
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
