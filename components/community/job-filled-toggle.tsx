'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle, Circle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

type Props = {
  postId: string
  isFilled: boolean
  variant?: 'button' | 'compact'
}

export function JobFilledToggle({ postId, isFilled: initialFilled, variant = 'button' }: Props) {
  const [isFilled, setIsFilled] = useState(initialFilled)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  async function handleToggle() {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/community/posts/${postId}/toggle-filled`, {
        method: 'POST',
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al actualizar')
      }

      setIsFilled(data.is_filled)

      toast.success(
        data.is_filled
          ? '¡Posición marcada como llena!'
          : 'Posición marcada como disponible',
        {
          description: data.is_filled
            ? 'El empleo ya no aparecerá como activo'
            : 'El empleo aparecerá como disponible nuevamente'
        }
      )

      router.refresh()
    } catch (error: any) {
      toast.error('Error', {
        description: error.message
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (variant === 'compact') {
    return (
      <Button
        onClick={handleToggle}
        disabled={isLoading}
        size="sm"
        variant={isFilled ? 'outline' : 'default'}
        className="border-2 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all font-black uppercase tracking-widest text-xs"
      >
        {isLoading ? (
          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
        ) : isFilled ? (
          <Circle className="mr-2 h-3.5 w-3.5" />
        ) : (
          <CheckCircle className="mr-2 h-3.5 w-3.5" />
        )}
        {isFilled ? 'Reabrir' : 'Marcar Lleno'}
      </Button>
    )
  }

  return (
    <Button
      onClick={handleToggle}
      disabled={isLoading}
      variant={isFilled ? 'outline' : 'default'}
      className="w-full border-4 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all font-black uppercase tracking-widest text-sm h-14"
    >
      {isLoading ? (
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
      ) : isFilled ? (
        <Circle className="mr-2 h-5 w-5" />
      ) : (
        <CheckCircle className="mr-2 h-5 w-5" />
      )}
      {isFilled ? 'Reabrir Posición' : 'Marcar Como Lleno'}
    </Button>
  )
}
