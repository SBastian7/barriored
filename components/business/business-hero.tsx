'use client'

import { useState, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Expand } from 'lucide-react'
import { ImageLoader } from '@/components/ui/image-loader'
import { PhotoGallery, Lightbox } from './photo-gallery'

type Props = {
  name: string
  categoryName: string
  photos: string[]
  isVerified: boolean
}

export function BusinessHero({ name, categoryName, photos, isVerified }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const currentPhoto = photos[selectedIndex] ?? null
  const hasMultiplePhotos = photos.length > 1

  const handleThumbnailSelect = useCallback((index: number) => {
    setSelectedIndex(index)
  }, [])

  return (
    <>
      {/* Hero image */}
      <div className="border-b-4 border-black bg-white">
        <div
          className={`aspect-video bg-muted relative w-full overflow-hidden group ${currentPhoto ? 'cursor-pointer' : ''}`}
          onClick={() => currentPhoto && setLightboxOpen(true)}
        >
          {currentPhoto ? (
            <>
              <ImageLoader
                src={currentPhoto}
                alt={name}
                fill
                priority
                aspectRatio="16/9"
                className="w-full h-full"
              />
              {/* Fullscreen hint overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 text-white px-4 py-2 border-2 border-white/30 flex items-center gap-2">
                  <Expand className="h-5 w-5" />
                  <span className="text-xs font-black uppercase tracking-widest">Ver foto</span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full bg-accent/10 border-b-2 border-black">
              <span className="font-heading font-black uppercase text-black/20 text-4xl italic">Sin Imagen</span>
            </div>
          )}
          <div className="absolute top-4 left-4">
            <Badge variant="accent" className="text-sm px-4 py-1.5">{categoryName}</Badge>
          </div>
        </div>
        <div className="p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-4xl md:text-5xl font-heading font-black uppercase tracking-tighter italic leading-none mb-4">
                {name}
              </h1>
              {isVerified && (
                <div className="inline-flex items-center gap-1.5 bg-black text-white px-2 py-0.5 text-[10px] font-black uppercase tracking-widest italic shadow-[2px_2px_0px_0px_rgba(225,29,72,1)]">
                  <CheckCircle className="h-3 w-3 text-primary" /> Verificado
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Thumbnail strip */}
      {hasMultiplePhotos && (
        <PhotoGallery photos={photos} onSelect={handleThumbnailSelect} />
      )}

      {/* Lightbox */}
      {lightboxOpen && photos.length > 0 && (
        <Lightbox
          photos={photos}
          initialIndex={selectedIndex}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  )
}
