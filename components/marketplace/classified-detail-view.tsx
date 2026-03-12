'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { MessageCircle, ChevronLeft, ChevronRight, User, Calendar } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import type { ClassifiedWithRelations } from '@/lib/types/database'

interface ClassifiedDetailViewProps {
  classified: ClassifiedWithRelations
}

export function ClassifiedDetailView({ classified }: ClassifiedDetailViewProps) {
  const images = classified.images || []
  const hasImages = images.length > 0
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length)
  }

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  const whatsappMessage = encodeURIComponent(
    `Hola, vi tu clasificado "${classified.title}" en BarrioRed`
  )
  const whatsappUrl = `https://wa.me/${classified.whatsapp}?text=${whatsappMessage}`

  const timeAgo = formatDistanceToNow(new Date(classified.created_at), {
    addSuffix: true,
    locale: es
  })

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mt-8">
      {/* Left Column - Image Gallery (60% / 3 cols) */}
      <div className="lg:col-span-3 space-y-4">
        {hasImages ? (
          <>
            {/* Main Image */}
            <div className="relative aspect-square border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white overflow-hidden">
              <Image
                src={images[currentImageIndex]}
                alt={`${classified.title} - Imagen ${currentImageIndex + 1}`}
                fill
                className="object-cover"
                priority
              />

              {/* Navigation Arrows */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-white border-2 border-black p-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                    aria-label="Imagen anterior"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-white border-2 border-black p-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                    aria-label="Siguiente imagen"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              )}

              {/* Image Counter */}
              {images.length > 1 && (
                <div className="absolute bottom-4 right-4 bg-black text-white px-3 py-1 border-2 border-white text-xs font-black">
                  {currentImageIndex + 1} / {images.length}
                </div>
              )}
            </div>

            {/* Thumbnail Strip */}
            {images.length > 1 && (
              <div className="grid grid-cols-5 gap-2">
                {images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`relative aspect-square border-2 transition-all ${
                      index === currentImageIndex
                        ? 'border-primary shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                        : 'border-black opacity-60 hover:opacity-100'
                    }`}
                  >
                    <Image
                      src={image}
                      alt={`Miniatura ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="aspect-square border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-gray-50 flex items-center justify-center">
            <div className="text-center text-black/40">
              <Image
                src="/placeholder-image.png"
                alt="Sin fotos"
                width={200}
                height={200}
                className="mx-auto opacity-20"
              />
              <p className="mt-4 font-black uppercase text-sm">Sin fotos</p>
            </div>
          </div>
        )}
      </div>

      {/* Right Column - Details Card (40% / 2 cols) */}
      <div className="lg:col-span-2">
        <div className="brutalist-card p-6 space-y-6 lg:sticky lg:top-20">
          {/* Category Badge */}
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-[10px] rounded-none py-1 px-2 border-black font-black uppercase tracking-widest"
            >
              {classified.marketplace_categories.name}
            </Badge>
          </div>

          {/* Title */}
          <h1 className="font-heading font-black uppercase text-3xl md:text-4xl leading-tight">
            {classified.title}
          </h1>

          {/* Price */}
          {classified.price && (
            <div className="text-primary font-black text-4xl">
              {classified.price}
            </div>
          )}

          {/* Divider */}
          <div className="border-t-2 border-black" />

          {/* Description */}
          <div>
            <h2 className="font-black uppercase text-[10px] tracking-widest text-black/60 mb-2">
              Descripción
            </h2>
            <p className="text-base leading-relaxed whitespace-pre-wrap">
              {classified.description}
            </p>
          </div>

          {/* Divider */}
          <div className="border-t-2 border-black" />

          {/* Seller Info */}
          <div>
            <h2 className="font-black uppercase text-[10px] tracking-widest text-black/60 mb-3">
              Vendedor
            </h2>
            <div className="flex items-center gap-3">
              {classified.profiles.avatar_url ? (
                <Image
                  src={classified.profiles.avatar_url}
                  alt={classified.profiles.full_name || 'Usuario'}
                  width={48}
                  height={48}
                  className="rounded-full border-2 border-black"
                />
              ) : (
                <div className="w-12 h-12 rounded-full border-2 border-black bg-gray-100 flex items-center justify-center">
                  <User className="h-6 w-6 text-black/40" />
                </div>
              )}
              <div>
                <p className="font-bold">{classified.profiles.full_name || 'Usuario'}</p>
                <p className="text-sm text-black/60 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Publicado {timeAgo}
                </p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t-2 border-black" />

          {/* WhatsApp CTA */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="brutalist-button w-full bg-primary text-primary-foreground text-lg py-4 flex items-center justify-center gap-2"
          >
            <MessageCircle className="h-5 w-5" />
            CONTACTAR POR WHATSAPP
          </a>
        </div>
      </div>
    </div>
  )
}
