'use client'

import type { ReactNode } from 'react'

export function WhatsAppShareButton({
  businessName,
  className,
  children,
}: {
  businessName: string
  className?: string
  children: ReactNode
}) {
  const handleShare = () => {
    const url = window.location.href
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`Te recomiendo ${businessName} en BarrioRed: ${url}`)}`,
      '_blank',
      'noopener,noreferrer'
    )
  }
  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label={`Compartir ${businessName} por WhatsApp`}
      className={className}
    >
      {children}
    </button>
  )
}
