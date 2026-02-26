'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { X, ChevronLeft, ChevronRight, Expand } from 'lucide-react'
import { ImageLoader } from '@/components/ui/image-loader'

type PhotoGalleryProps = {
  photos: string[]
  onSelect?: (index: number) => void
}

export function PhotoGallery({ photos, onSelect }: PhotoGalleryProps) {
  const [selected, setSelected] = useState(0)

  if (photos.length <= 1) return null

  function handleSelect(i: number) {
    setSelected(i)
    onSelect?.(i)
  }

  return (
    <div className="px-4 md:px-8 py-4 bg-muted/20 border-b-2 border-black">
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {photos.map((photo, i) => (
          <button
            key={i}
            onClick={() => handleSelect(i)}
            className={cn(
              "shrink-0 border-4 transition-all relative group",
              i === selected
                ? "border-primary shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] translate-y-[-2px]"
                : "border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] grayscale hover:grayscale-0"
            )}
          >
            <ImageLoader
              src={photo}
              alt={`Foto ${i + 1}`}
              width={120}
              height={90}
              aspectRatio="4/3"
              className="w-32 h-24"
            />
          </button>
        ))}
      </div>
    </div>
  )
}

/* ── Lightbox (full-screen viewer) ── */

type LightboxProps = {
  photos: string[]
  initialIndex: number
  onClose: () => void
}

export function Lightbox({ photos, initialIndex, onClose }: LightboxProps) {
  const [index, setIndex] = useState(initialIndex)

  const goNext = useCallback(() => {
    setIndex((prev) => (prev + 1) % photos.length)
  }, [photos.length])

  const goPrev = useCallback(() => {
    setIndex((prev) => (prev - 1 + photos.length) % photos.length)
  }, [photos.length])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft') goPrev()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKey)
    }
  }, [goNext, goPrev, onClose])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 bg-white text-black border-2 border-black p-2 shadow-[3px_3px_0px_0px_rgba(255,255,255,0.3)] hover:bg-primary hover:text-white transition-all"
      >
        <X className="h-6 w-6" />
      </button>

      {/* Counter */}
      <div className="absolute top-4 left-4 z-50 bg-black border-2 border-white/30 px-3 py-1">
        <span className="font-black text-white text-sm uppercase tracking-widest">
          {index + 1} / {photos.length}
        </span>
      </div>

      {/* Main image */}
      <div
        className="relative w-full h-full flex items-center justify-center px-16 py-16"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative max-w-full max-h-full w-full h-full">
          <Image
            src={photos[index]}
            alt={`Foto ${index + 1}`}
            fill
            className="object-contain"
            sizes="100vw"
            priority
          />
        </div>
      </div>

      {/* Prev button */}
      {photos.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); goPrev() }}
          className="absolute left-3 top-1/2 -translate-y-1/2 bg-white text-black border-2 border-black p-2 md:p-3 shadow-[3px_3px_0px_0px_rgba(255,255,255,0.3)] hover:bg-primary hover:text-white transition-all"
        >
          <ChevronLeft className="h-5 w-5 md:h-7 md:w-7" />
        </button>
      )}

      {/* Next button */}
      {photos.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); goNext() }}
          className="absolute right-3 top-1/2 -translate-y-1/2 bg-white text-black border-2 border-black p-2 md:p-3 shadow-[3px_3px_0px_0px_rgba(255,255,255,0.3)] hover:bg-primary hover:text-white transition-all"
        >
          <ChevronRight className="h-5 w-5 md:h-7 md:w-7" />
        </button>
      )}

      {/* Bottom thumbnails */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 overflow-x-auto max-w-[90vw] px-4 pb-2" onClick={(e) => e.stopPropagation()}>
        {photos.map((photo, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            className={cn(
              "shrink-0 border-2 transition-all",
              i === index
                ? "border-primary shadow-[2px_2px_0px_0px_rgba(255,255,255,0.5)] scale-110"
                : "border-white/30 opacity-50 hover:opacity-100"
            )}
          >
            <ImageLoader
              src={photo}
              alt={`Miniatura ${i + 1}`}
              width={60}
              height={45}
              aspectRatio="4/3"
              className="w-16 h-12"
            />
          </button>
        ))}
      </div>
    </div>
  )
}
