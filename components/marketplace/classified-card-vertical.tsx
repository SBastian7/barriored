'use client'

import Link from 'next/link'
import Image from 'next/image'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { FavoriteButton } from './favorite-button'
import { getCategoryStyle } from '@/lib/category-colors'
import { getThumbUrl } from '@/lib/image/thumbnail'
import type { ClassifiedWithRelations } from '@/lib/types/database'

function WhatsAppIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zm-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.002-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884zm8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  )
}

function CategoryPlaceholder({ categorySlug, title }: { categorySlug: string; title: string }) {
  const style = getCategoryStyle(categorySlug)
  const initials = title
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  return (
    <div className="absolute inset-0 flex items-center justify-center" style={{ background: style.hex }}>
      <div className="br-pattern-dots absolute inset-0 opacity-20 pointer-events-none" />
      <span
        className="relative font-heading font-black italic text-5xl uppercase select-none"
        style={{ color: style.textHex, opacity: 0.55 }}
      >
        {initials}
      </span>
    </div>
  )
}

interface ClassifiedCardVerticalProps {
  classified: ClassifiedWithRelations
  communitySlug: string
  userId?: string | null
  isFavorited?: boolean
  rotation?: number
}

export function ClassifiedCardVertical({
  classified,
  communitySlug,
  userId,
  isFavorited = false,
  rotation = 0,
}: ClassifiedCardVerticalProps) {
  const thumbnail = getThumbUrl(classified.images?.[0] || '') || null
  const catSlug = classified.marketplace_categories?.slug ?? 'otros'
  const catName = classified.marketplace_categories?.name ?? 'Otros'
  const catStyle = getCategoryStyle(catSlug)
  const sellerName = classified.profiles?.full_name || 'Vecino'
  const sellerInitial = sellerName[0]?.toUpperCase() ?? 'V'

  const timeAgo = classified.created_at
    ? formatDistanceToNow(new Date(classified.created_at), { addSuffix: true, locale: es })
    : ''

  const hasPrice = !!classified.price
  const waUrl = `https://wa.me/${classified.whatsapp}?text=${encodeURIComponent(`Hola, vi tu clasificado "${classified.title}" en BarrioRed`)}`
  const detailHref = `/${communitySlug}/marketplace/${classified.id}`

  return (
    <div
      className="br-rot"
      style={{ '--rot': `${rotation}deg` } as React.CSSProperties}
    >
      <Link href={detailHref} className="block h-full">
        <div
          className="bg-white flex flex-col h-full overflow-hidden transition-all duration-150"
          style={{
            border: `3px solid ${isFavorited ? '#FBBF24' : '#000000'}`,
            boxShadow: isFavorited
              ? '6px 6px 0px 0px rgba(251,191,36,1)'
              : '6px 6px 0px 0px rgba(0,0,0,1)',
          }}
        >
          {/* Favorited indicator strip */}
          {isFavorited && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FBBF24] border-b-2 border-black">
              <span className="font-mono font-black text-[9px] tracking-widest uppercase">♥ GUARDADO</span>
            </div>
          )}

          {/* Image */}
          <div
            className="relative aspect-4/3 shrink-0 overflow-hidden"
            style={{ borderBottom: `3px solid ${isFavorited ? '#FBBF24' : '#000000'}` }}
          >
            {thumbnail ? (
              <Image src={thumbnail} alt={classified.title} fill className="object-cover" />
            ) : (
              <CategoryPlaceholder categorySlug={catSlug} title={classified.title} />
            )}

            {/* Category badge */}
            <div className="absolute top-2.5 left-2.5 z-10">
              <span
                className="inline-flex items-center px-2 py-1 border-2 border-black font-heading font-black text-[10px] uppercase tracking-wider shadow-[2px_2px_0px_rgba(0,0,0,1)]"
                style={{ background: catStyle.hex, color: catStyle.textHex }}
              >
                {catName}
              </span>
            </div>

            {/* Heart button */}
            <div className="absolute top-2.5 right-2.5 z-10" onClick={e => e.preventDefault()}>
              <FavoriteButton
                classifiedId={classified.id}
                initialFavorited={isFavorited}
                size="sm"
                userId={userId}
              />
            </div>

            {/* Featured strip */}
            {classified.is_featured && (
              <div className="absolute bottom-0 left-0 right-0 bg-[#FBBF24] border-t-[2.5px] border-black px-2.5 py-1">
                <span className="font-mono font-black text-[9px] tracking-wider uppercase">★ DESTACADO</span>
              </div>
            )}
          </div>

          {/* Body */}
          <div className="p-3.5 flex flex-col gap-2 flex-1">
            <span className="font-mono text-[9px] uppercase tracking-wider opacity-55">{timeAgo}</span>

            <h3 className="font-heading font-black italic text-[15px] uppercase leading-tight line-clamp-2">
              {classified.title}
            </h3>

            {hasPrice ? (
              <span className="font-heading font-black italic text-2xl text-[#E11D48] leading-none">
                {classified.price}
              </span>
            ) : (
              <span className="font-heading font-black italic text-2xl text-[#16A34A] leading-none">
                GRATIS
              </span>
            )}

            <p className="text-xs text-black/55 line-clamp-2 leading-relaxed flex-1">
              {classified.description}
            </p>

            {/* Seller row */}
            <div className="flex items-center gap-2 pt-2.5 mt-auto border-t-2 border-black">
              <div
                className="w-6 h-6 border-2 border-black flex items-center justify-center font-heading font-black italic text-[10px] shrink-0"
                style={{ background: catStyle.hex, color: catStyle.textHex }}
              >
                {sellerInitial}
              </div>
              <span className="font-bold text-[11px] leading-tight truncate flex-1 min-w-0">{sellerName}</span>
            </div>
          </div>

          {/* WhatsApp CTA strip */}
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="flex items-center justify-center gap-2 w-full py-3 bg-[#16A34A] text-white font-heading font-black text-[11px] uppercase tracking-wider hover:bg-[#15803D] transition-colors"
            style={{ borderTop: `3px solid ${isFavorited ? '#FBBF24' : '#000000'}` }}
          >
            <WhatsAppIcon size={14} />
            CONTACTAR POR WHATSAPP
          </a>
        </div>
      </Link>
    </div>
  )
}
