'use client'

import { useState } from 'react'
import { Heart } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  postId: string
  initialFavorited: boolean
  isLoggedIn: boolean
}

export function PostFavoriteButton({ postId, initialFavorited, isLoggedIn }: Props) {
  const [favorited, setFavorited] = useState(initialFavorited)
  const [loading, setLoading] = useState(false)

  async function handleToggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!isLoggedIn) {
      window.location.href = '/auth/login'
      return
    }
    setLoading(true)
    const res = await fetch(`/api/community/posts/${postId}/favorite`, { method: 'POST' })
    if (res.ok) {
      const data = await res.json()
      setFavorited(data.favorited)
    }
    setLoading(false)
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={cn(
        'p-1.5 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all',
        favorited ? 'bg-primary' : 'bg-white hover:bg-primary/10'
      )}
      title={favorited ? 'Quitar de favoritos' : 'Guardar'}
    >
      <Heart className={cn('h-4 w-4', favorited ? 'fill-white text-white' : 'text-black')} />
    </button>
  )
}
