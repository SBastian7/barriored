'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Share2, MessageCircle, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'

interface SharePostButtonProps {
  title: string
  content: string
  url: string
  className?: string
}

export function SharePostButton({ title, content, url, className }: SharePostButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    // Try Web Share API first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: content.slice(0, 160),
          url,
        })
        return
      } catch (err: any) {
        // User cancelled or error - fall through to show menu
        if (err.name !== 'AbortError') {
          console.error('Share failed:', err)
        }
      }
    }
    // If Web Share not available, dropdown menu will show
  }

  const handleWhatsAppShare = () => {
    const text = `${title}\n\n${content.slice(0, 200)}...\n\n${url}`
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success('Enlace copiado')
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast.error('Error al copiar enlace')
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="brutalist-button"
          onClick={handleShare}
        >
          <Share2 className="h-4 w-4 mr-2" />
          Compartir
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="brutalist-card">
        <DropdownMenuItem onClick={handleWhatsAppShare}>
          <MessageCircle className="h-4 w-4 mr-2" />
          WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopyLink}>
          {copied ? (
            <Check className="h-4 w-4 mr-2 text-green-600" />
          ) : (
            <Copy className="h-4 w-4 mr-2" />
          )}
          {copied ? 'Copiado' : 'Copiar enlace'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
