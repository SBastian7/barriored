'use client'

import { useState } from 'react'
import { Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Props {
  businessId: string
  initialFavorited: boolean
  isLoggedIn: boolean
}

export function BusinessFavoriteButton({ businessId, initialFavorited, isLoggedIn }: Props) {
  const [favorited, setFavorited] = useState(initialFavorited)
  const [loading, setLoading] = useState(false)

  async function handleToggle() {
    if (!isLoggedIn) {
      window.location.href = '/auth/login'
      return
    }
    setLoading(true)
    const res = await fetch(`/api/businesses/${businessId}/favorite`, { method: 'POST' })
    if (res.ok) {
      const data = await res.json()
      setFavorited(data.favorited)
    }
    setLoading(false)
  }

  return (
    <Button
      onClick={handleToggle}
      disabled={loading}
      variant="outline"
      size="icon"
      className={cn(
        'h-12 w-12 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all rounded-none',
        favorited && 'bg-primary border-primary'
      )}
      title={favorited ? 'Quitar de favoritos' : 'Guardar en favoritos'}
    >
      <Heart className={cn('h-5 w-5', favorited ? 'fill-white text-white' : 'text-black')} />
    </Button>
  )
}
