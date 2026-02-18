'use client'

import { useState } from 'react'
import Image from 'next/image'

export function PhotoGallery({ photos }: { photos: string[] }) {
  const [selected, setSelected] = useState(0)
  if (photos.length <= 1) return null

  return (
    <div className="px-4 py-2">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {photos.map((photo, i) => (
          <button key={i} onClick={() => setSelected(i)} className={`shrink-0 rounded-md overflow-hidden border-2 ${i === selected ? 'border-blue-600' : 'border-transparent'}`}>
            <Image src={photo} alt={`Foto ${i + 1}`} width={80} height={60} className="object-cover w-20 h-15" />
          </button>
        ))}
      </div>
    </div>
  )
}
