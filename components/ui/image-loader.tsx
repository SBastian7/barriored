'use client'

import { useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { ImageOff } from 'lucide-react'

interface ImageLoaderProps {
  src: string | null | undefined
  alt: string
  width?: number
  height?: number
  aspectRatio?: string
  className?: string
  priority?: boolean
  fill?: boolean
}

export function ImageLoader({
  src,
  alt,
  width,
  height,
  aspectRatio = '16/9',
  className,
  priority = false,
  fill = false,
}: ImageLoaderProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  // No image provided or error state
  if (!src || hasError) {
    return (
      <div
        className={cn(
          'flex items-center justify-center border-2 border-black bg-muted',
          className
        )}
        style={aspectRatio && !fill ? { aspectRatio } : undefined}
      >
        <ImageOff className="h-8 w-8 text-muted-foreground" strokeWidth={2} />
      </div>
    )
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Loading skeleton */}
      {isLoading && (
        <div
          className="absolute inset-0 border-2 border-black animate-pulse bg-background"
          style={aspectRatio && !fill ? { aspectRatio } : undefined}
        />
      )}

      {/* Actual image */}
      <Image
        src={src}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        fill={fill}
        priority={priority}
        className={cn(
          'transition-opacity duration-300',
          isLoading ? 'opacity-0' : 'opacity-100',
          fill ? 'object-cover' : ''
        )}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false)
          setHasError(true)
        }}
      />
    </div>
  )
}
