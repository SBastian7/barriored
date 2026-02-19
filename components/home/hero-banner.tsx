import Image from 'next/image'
import { MapPin, Store, Users, Heart } from 'lucide-react'
import type { CommunityData } from '@/lib/types'

export function HeroBanner({
  community,
  businessCount,
}: {
  community: CommunityData
  businessCount: number
}) {
  return (
    <section className="relative overflow-hidden">
      {/* Background image with overlay */}
      <div className="absolute inset-0">
        {community.cover_image_url ? (
          <Image
            src={community.cover_image_url}
            alt={community.name}
            fill
            className="object-cover"
            sizes="100vw"
            priority
            unoptimized
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 via-secondary/10 to-accent/20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/30" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto max-w-5xl px-4 pt-14 pb-16">
        <div className="flex flex-col items-center text-center">
          {/* Location pill */}
          <div className="inline-flex items-center gap-2 bg-secondary text-black font-black px-4 py-1.5 border-2 border-black rotate-[-2deg] mb-6 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] uppercase text-[11px] tracking-widest">
            <MapPin className="h-3.5 w-3.5" />
            {community.municipality}, {community.department}
          </div>

          {/* Heading */}
          <h1 className="text-5xl md:text-7xl font-heading font-black mb-4 uppercase tracking-tighter text-white text-shadow-md">
            {community.name}
          </h1>

          {/* Description */}
          {community.description ? (
            <p className="text-lg md:text-xl text-white/90 mb-8 max-w-2xl font-medium text-balance leading-relaxed">
              {community.description}
            </p>
          ) : (
            <p className="text-lg md:text-xl text-white/90 mb-8 max-w-2xl font-medium text-balance leading-relaxed">
              Tu plataforma comunitaria para conectar, comprar local y fortalecer el barrio.
            </p>
          )}

          {/* Stats strip */}
          <div className="inline-flex flex-wrap justify-center items-center bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center gap-2 px-5 py-3 border-r-4 border-black">
              <Store className="h-5 w-5 text-primary" />
              <span className="font-heading font-black text-2xl">{businessCount}</span>
              <span className="font-black uppercase text-[10px] tracking-widest text-black/50">negocios</span>
            </div>
            <div className="flex items-center gap-2 px-5 py-3 border-r-4 border-black">
              <Users className="h-5 w-5 text-accent" />
              <span className="font-heading font-black text-2xl">+30k</span>
              <span className="font-black uppercase text-[10px] tracking-widest text-black/50">vecinos</span>
            </div>
            <div className="flex items-center gap-2 px-5 py-3">
              <Heart className="h-5 w-5 text-primary" />
              <span className="font-heading font-black text-2xl">100%</span>
              <span className="font-black uppercase text-[10px] tracking-widest text-black/50">local</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom brutalist border */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black" />
    </section>
  )
}
