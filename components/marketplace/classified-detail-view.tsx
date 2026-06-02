'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, User, MapPin, Calendar, Tag, Share2, Flag, X, AlertTriangle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import { FavoriteButton } from './favorite-button'
import { ClassifiedCardVertical } from './classified-card-vertical'
import { getCategoryStyle } from '@/lib/category-colors'
import { reportClassifiedAction } from '@/app/actions/classified-actions'
import type { ClassifiedWithRelations } from '@/lib/types/database'

function WhatsAppIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zm-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.002-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884zm8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  )
}

function CategoryPlaceholder({ categorySlug, title, size = 'md' }: { categorySlug: string; title: string; size?: 'md' | 'lg' }) {
  const style = getCategoryStyle(categorySlug)
  const initials = title.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ background: style.hex }}>
      <div className="br-pattern-dots absolute inset-0 opacity-20 pointer-events-none" />
      <span
        className={`relative font-heading font-black italic uppercase select-none ${size === 'lg' ? 'text-8xl' : 'text-5xl'}`}
        style={{ color: style.textHex, opacity: 0.5 }}
      >
        {initials}
      </span>
      <span className="relative font-mono text-[10px] uppercase tracking-widest mt-2" style={{ color: style.textHex, opacity: 0.4 }}>
        SIN FOTO
      </span>
    </div>
  )
}

// ── Hero image gallery (full-bleed in the right hero panel) ──
interface HeroGalleryProps {
  images: string[]
  title: string
  categorySlug: string
}

function HeroGallery({ images, title, categorySlug }: HeroGalleryProps) {
  const [activeIdx, setActiveIdx] = useState(0)
  const hasImages = images.length > 0

  return (
    <div className="flex flex-col h-full">
      {/* Main image — fills available height */}
      <div className="relative flex-1 overflow-hidden" style={{ minHeight: 280 }}>
        {hasImages ? (
          <Image
            src={images[activeIdx]}
            alt={`${title} - imagen ${activeIdx + 1}`}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <CategoryPlaceholder categorySlug={categorySlug} title={title} size="lg" />
        )}

        {hasImages && images.length > 1 && (
          <>
            <button
              onClick={() => setActiveIdx(p => (p - 1 + images.length) % images.length)}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-white border-[2px] border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all z-10 cursor-pointer"
              aria-label="Imagen anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => setActiveIdx(p => (p + 1) % images.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-white border-[2px] border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all z-10 cursor-pointer"
              aria-label="Siguiente imagen"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="absolute bottom-3 right-3 bg-[#0A0A0A] text-white font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 z-10">
              {activeIdx + 1} / {images.length}
            </div>
          </>
        )}
      </div>

      {/* Thumbnail strip */}
      {hasImages && images.length > 1 && (
        <div className="grid border-t-[3px] border-black" style={{ gridTemplateColumns: `repeat(${images.length}, 1fr)` }}>
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setActiveIdx(i)}
              className={`relative aspect-square overflow-hidden cursor-pointer transition-all ${
                i < images.length - 1 ? 'border-r-[3px] border-black' : ''
              } ${i === activeIdx ? 'ring-[3px] ring-inset ring-[#E11D48]' : 'opacity-60 hover:opacity-100'}`}
            >
              <Image src={img} alt={`Miniatura ${i + 1}`} fill className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Report modal ──
interface ReportModalProps {
  classifiedId: string
  userId?: string | null
  onClose: () => void
}

const REPORT_REASONS = [
  'Contenido inapropiado u ofensivo',
  'Producto o servicio prohibido',
  'Fraude o estafa',
  'Información falsa o engañosa',
  'Spam o publicidad no deseada',
  'Otro',
]

function ReportModal({ classifiedId, userId, onClose }: ReportModalProps) {
  const [reason, setReason] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleSubmit = () => {
    if (!userId) {
      toast.error('Debes iniciar sesión para reportar')
      return
    }
    if (!reason) {
      toast.error('Selecciona una razón')
      return
    }
    startTransition(async () => {
      const result = await reportClassifiedAction(classifiedId, reason)
      if (result.success) {
        toast.success('Reporte enviado. Lo revisaremos pronto.')
        onClose()
      } else {
        toast.error(result.error || 'Error al enviar reporte')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-white border-[3px] border-black shadow-[8px_8px_0px_rgba(0,0,0,1)] w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b-[3px] border-black bg-[#FBBF24]">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-heading font-black uppercase text-base tracking-tight">REPORTAR ANUNCIO</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-black/10 transition-colors cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          <p className="text-sm text-black/60 mb-4">¿Por qué quieres reportar este anuncio?</p>
          <div className="flex flex-col gap-2">
            {REPORT_REASONS.map(r => (
              <label key={r} className={`flex items-center gap-3 p-3 border-[2px] cursor-pointer transition-all ${reason === r ? 'border-[#E11D48] bg-[#E11D48]/5' : 'border-black hover:bg-black/5'}`}>
                <input
                  type="radio"
                  name="reason"
                  value={r}
                  checked={reason === r}
                  onChange={() => setReason(r)}
                  className="accent-[#E11D48]"
                />
                <span className="text-sm font-medium">{r}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 pb-5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-white border-[2px] border-black font-heading font-black text-sm uppercase tracking-wider shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:-translate-x-px hover:-translate-y-px transition-all cursor-pointer"
          >
            CANCELAR
          </button>
          <button
            onClick={handleSubmit}
            disabled={!reason || isPending}
            className="flex-1 py-2.5 bg-[#E11D48] text-white border-[2px] border-black font-heading font-black text-sm uppercase tracking-wider shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:-translate-x-px hover:-translate-y-px transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {isPending ? 'ENVIANDO...' : 'ENVIAR REPORTE'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Share handler ──
async function handleShare(title: string, url: string) {
  if (typeof navigator === 'undefined') return
  try {
    if (navigator.share) {
      await navigator.share({ title, url })
    } else {
      await navigator.clipboard.writeText(url)
      toast.success('Enlace copiado al portapapeles')
    }
  } catch {
    // User cancelled or error — do nothing
  }
}

interface ClassifiedDetailViewProps {
  classified: ClassifiedWithRelations
  communitySlug: string
  userId?: string | null
  isFavorited?: boolean
  similarClassifieds?: ClassifiedWithRelations[]
}

export function ClassifiedDetailView({
  classified,
  communitySlug,
  userId,
  isFavorited = false,
  similarClassifieds = [],
}: ClassifiedDetailViewProps) {
  const [showReport, setShowReport] = useState(false)
  const images = classified.images || []
  const catSlug = classified.marketplace_categories?.slug ?? 'otros'
  const catName = classified.marketplace_categories?.name ?? 'Categoría'
  const catStyle = getCategoryStyle(catSlug)
  const sellerName = classified.profiles?.full_name || 'Vecino'
  const sellerInitial = sellerName[0]?.toUpperCase() ?? 'V'
  const sellerAvatar = classified.profiles?.avatar_url
  const hasPrice = !!classified.price

  const timeAgo = classified.created_at
    ? formatDistanceToNow(new Date(classified.created_at), { addSuffix: true, locale: es })
    : 'Fecha desconocida'

  const waMessage = encodeURIComponent(`Hola, vi tu clasificado "${classified.title}" en BarrioRed`)
  const waUrl = `https://wa.me/${classified.whatsapp}?text=${waMessage}`
  const communityName = classified.communities?.name ?? 'Barrio'

  const shareUrl = typeof window !== 'undefined' ? window.location.href : ''
  const onShare = () => handleShare(classified.title, shareUrl)

  return (
    <div>
      {/* ── HERO ──────────────────────────────────────── */}
      <section className="border-b-4 border-black">
        <div className="grid grid-cols-1 md:grid-cols-2" style={{ minHeight: 420 }}>
          {/* Left — dark slab */}
          <div className="relative bg-[#0A0A0A] text-white px-6 md:px-8 py-8 md:py-10 overflow-hidden">
            <div className="absolute inset-0 br-pattern-diag opacity-10 pointer-events-none" />
            {/* Accent color strip */}
            <div className="absolute left-0 top-0 bottom-0 w-2" style={{ background: catStyle.hex }} />
            <div className="relative pl-2">
              {/* Breadcrumb */}
              <div className="flex flex-wrap gap-1.5 items-center mb-5">
                <Link href={`/${communitySlug}`} className="font-mono text-[10px] uppercase tracking-widest opacity-40 hover:opacity-70 transition-opacity">INICIO</Link>
                <span className="font-mono text-[10px] opacity-25">/</span>
                <Link href={`/${communitySlug}/marketplace`} className="font-mono text-[10px] uppercase tracking-widest opacity-40 hover:opacity-70 transition-opacity">MARKETPLACE</Link>
                <span className="font-mono text-[10px] opacity-25">/</span>
                <span className="font-mono text-[10px] uppercase tracking-widest opacity-50 truncate max-w-[120px]">{catName}</span>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2 mb-5">
                <span
                  className="inline-flex items-center px-2.5 py-1 border-[2px] border-black font-heading font-black text-[10px] uppercase tracking-wider shadow-[2px_2px_0px_rgba(0,0,0,1)]"
                  style={{ background: catStyle.hex, color: catStyle.textHex }}
                >
                  {catName}
                </span>
                {classified.is_featured && (
                  <span className="inline-flex items-center px-2.5 py-1 bg-[#FBBF24] text-[#0A0A0A] border-[2px] border-black font-heading font-black text-[10px] uppercase tracking-wider shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                    ★ DESTACADO
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="font-heading font-black italic uppercase text-white leading-[0.88]" style={{ fontSize: 'clamp(32px, 5vw, 64px)' }}>
                {classified.title}
              </h1>

              {/* Price */}
              <div className="mt-4">
                {hasPrice ? (
                  <span className="font-heading font-black italic leading-none" style={{ fontSize: 'clamp(36px, 6vw, 60px)', color: catStyle.hex }}>
                    {classified.price}
                  </span>
                ) : (
                  <span className="font-heading font-black italic leading-none text-[#16A34A]" style={{ fontSize: 'clamp(36px, 6vw, 60px)' }}>
                    GRATIS
                  </span>
                )}
              </div>

              {/* Quick CTAs */}
              <div className="flex flex-wrap gap-2.5 mt-6">
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#16A34A] text-white border-[2px] border-black font-heading font-black text-sm uppercase tracking-wider shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_rgba(0,0,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
                >
                  <WhatsAppIcon size={14} /> CONTACTAR
                </a>
                <button
                  onClick={onShare}
                  className="inline-flex items-center gap-2 px-3 py-2.5 border-[2px] font-heading font-black text-sm uppercase tracking-wider shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_rgba(0,0,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all cursor-pointer"
                  style={{ background: 'rgba(255,255,255,0.1)', color: 'white', borderColor: 'rgba(255,255,255,0.35)' }}
                  aria-label="Compartir"
                >
                  <Share2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Right — full-bleed gallery */}
          <div className="relative border-t-4 md:border-t-0 md:border-l-4 border-black overflow-hidden">
            <HeroGallery images={images} title={classified.title} categorySlug={catSlug} />
          </div>
        </div>

        {/* Meta strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 border-t-[3px] border-black bg-white">
          {[
            { label: 'VENDEDOR', value: sellerName, Icon: User },
            { label: 'PUBLICADO', value: timeAgo, Icon: Calendar },
            { label: 'CATEGORÍA', value: catName, Icon: Tag },
            { label: 'BARRIO', value: communityName, Icon: MapPin },
          ].map(({ label, value, Icon }, i) => (
            <div
              key={label}
              className={`flex items-center gap-3 px-5 py-4 ${i < 3 ? 'border-b-[2px] md:border-b-0 md:border-r-[2px] border-black' : 'border-b-[2px] md:border-b-0'}`}
            >
              <div className="w-9 h-9 bg-[#F5E6CB] border-[2.5px] border-black flex items-center justify-center flex-shrink-0 shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <div className="font-mono text-[9px] uppercase tracking-widest opacity-50 mb-0.5">{label}</div>
                <div className="font-bold text-sm leading-tight">{value}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── BODY ──────────────────────────────────────── */}
      <div className="px-6 md:px-8 py-8 max-w-350 mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-7 items-start">

          {/* Left — description + seller */}
          <div className="flex flex-col gap-5">
            {/* Description */}
            <div className="bg-white border-[3px] border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] overflow-hidden">
              <div className="px-5 py-3 bg-[#0A0A0A]">
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#FBBF24]">DESCRIPCIÓN</span>
              </div>
              <div className="p-5">
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-black/80">{classified.description}</p>
              </div>
            </div>

            {/* Seller */}
            <div className="bg-white border-[3px] border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] overflow-hidden">
              <div className="px-5 py-3 bg-[#0A0A0A]">
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#FBBF24]">PUBLICADO POR</span>
              </div>
              <div className="p-5 flex items-center gap-4">
                {sellerAvatar ? (
                  <Image src={sellerAvatar} alt={sellerName} width={52} height={52} className="rounded-full border-[2.5px] border-black flex-shrink-0" />
                ) : (
                  <div
                    className="border-[2.5px] border-black flex items-center justify-center font-heading font-black italic text-xl shadow-[2px_2px_0px_rgba(0,0,0,1)] flex-shrink-0"
                    style={{ width: 52, height: 52, background: catStyle.hex, color: catStyle.textHex }}
                  >
                    {sellerInitial}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-heading font-black text-lg leading-tight truncate">{sellerName}</div>
                  <div className="font-mono text-[10px] uppercase tracking-wider opacity-55 mt-0.5">
                    VECINO DE {communityName.toUpperCase()}
                  </div>
                </div>
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#16A34A] text-white border-[2px] border-black font-heading font-black text-xs uppercase tracking-wider shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:-translate-x-px hover:-translate-y-px transition-all flex-shrink-0"
                >
                  <WhatsAppIcon size={12} /> CONTACTAR
                </a>
              </div>
            </div>
          </div>

          {/* Right — sticky sidebar */}
          <aside className="flex flex-col gap-4 lg:sticky lg:top-4">
            {/* Price + action card */}
            <div className="bg-white border-[3px] border-black shadow-[6px_6px_0px_rgba(0,0,0,1)] overflow-hidden">
              {/* Price header */}
              <div className="px-5 py-5 border-b-[3px] border-black">
                <div className="flex flex-wrap gap-2 mb-3">
                  <span
                    className="inline-flex items-center px-2 py-0.5 border-[2px] border-black font-heading font-black text-[10px] uppercase tracking-wider"
                    style={{ background: catStyle.hex, color: catStyle.textHex }}
                  >
                    {catName}
                  </span>
                </div>
                <h2 className="font-heading font-black italic uppercase text-lg leading-tight mb-3">{classified.title}</h2>
                {hasPrice ? (
                  <div className="font-heading font-black italic text-5xl text-[#E11D48] leading-none">{classified.price}</div>
                ) : (
                  <div className="font-heading font-black italic text-5xl text-[#16A34A] leading-none">GRATIS</div>
                )}
              </div>

              {/* Meta rows */}
              <div className="px-5 py-4 border-b-[3px] border-black space-y-2.5">
                {[
                  { k: 'BARRIO', v: communityName },
                  { k: 'PUBLICADO', v: timeAgo },
                ].map(({ k, v }) => (
                  <div key={k} className="flex justify-between items-center py-1.5 border-b border-dashed border-black/20">
                    <span className="font-mono text-[9px] uppercase tracking-wider opacity-55">{k}</span>
                    <span className="font-bold text-sm">{v}</span>
                  </div>
                ))}
              </div>

              {/* Seller */}
              <div className="px-5 py-4 border-b-[3px] border-black flex items-center gap-3 bg-[#FFF7ED]">
                {sellerAvatar ? (
                  <Image src={sellerAvatar} alt={sellerName} width={40} height={40} className="rounded-full border-[2px] border-black flex-shrink-0" />
                ) : (
                  <div
                    className="border-[2px] border-black flex items-center justify-center font-heading font-black italic text-base shadow-[2px_2px_0px_rgba(0,0,0,1)] flex-shrink-0"
                    style={{ width: 40, height: 40, background: catStyle.hex, color: catStyle.textHex }}
                  >
                    {sellerInitial}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm truncate">{sellerName}</div>
                  <div className="font-mono text-[9px] uppercase tracking-wider opacity-50">VENDEDOR</div>
                </div>
              </div>

              {/* CTAs */}
              <div className="p-4 flex flex-col gap-2.5">
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2.5 w-full py-3.5 bg-[#16A34A] text-white border-[2px] border-black font-heading font-black text-sm uppercase tracking-wider shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_rgba(0,0,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
                >
                  <WhatsAppIcon size={16} /> CONTACTAR POR WHATSAPP
                </a>
                <div className="flex gap-2">
                  {userId && (
                    <FavoriteButton
                      classifiedId={classified.id}
                      initialFavorited={isFavorited}
                      size="md"
                      showLabel
                      userId={userId}
                    />
                  )}
                  <button
                    onClick={onShare}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 bg-white border-[2px] border-black font-heading font-black text-xs uppercase tracking-wider shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:-translate-x-px hover:-translate-y-px transition-all cursor-pointer"
                  >
                    <Share2 className="h-4 w-4" /> COMPARTIR
                  </button>
                </div>
                <button
                  onClick={() => setShowReport(true)}
                  className="inline-flex items-center justify-center gap-1.5 w-full py-2 bg-white border-[2px] border-black font-mono text-[10px] uppercase tracking-wider opacity-50 hover:opacity-80 transition-opacity cursor-pointer"
                >
                  <Flag className="h-3 w-3" /> REPORTAR ANUNCIO
                </button>
              </div>
            </div>

            {/* Safety tips */}
            <div className="border-[3px] border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] bg-[#FBBF24] p-5">
              <div className="font-mono text-[10px] uppercase tracking-widest font-black mb-3">⚠ CONSEJOS DE SEGURIDAD</div>
              <ul className="space-y-2">
                {['Reúnete en lugares públicos', 'Verifica el producto antes de pagar', 'Desconfía de precios muy bajos', 'No hagas pagos anticipados'].map(tip => (
                  <li key={tip} className="flex items-start gap-2 text-sm font-semibold leading-tight">
                    <span className="text-[#16A34A] font-black flex-shrink-0 mt-0.5">✓</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>

      {/* ── SIMILAR LISTINGS ──────────────────────────── */}
      {similarClassifieds.length > 0 && (
        <section className="border-t-4 border-black bg-[#F5E6CB]">
          <div className="px-6 md:px-8 py-8 md:py-10 max-w-350 mx-auto">
            <div className="flex justify-between items-end mb-6 flex-wrap gap-3">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest mb-2 opacity-55">EN TU BARRIO</div>
                <h2 className="font-heading font-black italic uppercase text-4xl md:text-5xl">
                  SIMILAR EN <span className="text-[#E11D48]">{catName.toUpperCase()}</span>
                </h2>
              </div>
              <Link
                href={`/${communitySlug}/marketplace?category=${catSlug}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border-[2px] border-black font-heading font-black text-sm uppercase tracking-wider shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_rgba(0,0,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
              >
                VER TODOS →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {similarClassifieds.map((c, i) => (
                <ClassifiedCardVertical
                  key={c.id}
                  classified={c}
                  communitySlug={communitySlug}
                  userId={userId}
                  rotation={[0, -0.5, 0.5, 0][i] ?? 0}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── REPORT MODAL ──────────────────────────────── */}
      {showReport && (
        <ReportModal
          classifiedId={classified.id}
          userId={userId}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  )
}
