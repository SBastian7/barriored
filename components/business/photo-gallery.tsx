'use client'

import { useState } from 'react'
import Image from 'next/image'

import { cn } from '@/lib/utils'

export function PhotoGallery({ photos }: { photos: string[] }) {
  const [selected, setSelected] = useState(0)
  if (photos.length <= 1) return null

  return (
    <div className="px-8 py-4 bg-muted/20 border-b-2 border-black">
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
        {photos.map((photo, i) => (
          <button
            key={i}
            onClick={() => setSelected(i)}
            className={cn(
              "shrink-0 border-4 transition-all",
              i === selected
                ? "border-primary shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] translate-y-[-2px]"
                : "border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] grayscale hover:grayscale-0"
            )}
          >
            <Image src={photo} alt={`Foto ${i + 1}`} width={120} height={90} className="object-cover w-32 h-24" />
          </button>
        ))}
      </div>
    </div>
  )
}
