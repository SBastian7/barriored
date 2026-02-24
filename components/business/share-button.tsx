'use client'

import { useState } from 'react'
import { Share2, Copy, Check, Facebook } from 'lucide-react'
import Image from 'next/image'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type Props = {
  title: string
  description: string
}

export function ShareButton({ title, description }: Props) {
  const [copied, setCopied] = useState(false)

  async function handleShare() {
    const url = window.location.href

    // Use native share API if available (mobile)
    if (navigator.share) {
      try {
        await navigator.share({ title, text: description, url })
        return
      } catch {
        // User cancelled or error - fall through to copy
      }
    }

    // Fallback: copy to clipboard
    await copyLink()
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      toast.success('Enlace copiado')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('No se pudo copiar')
    }
  }

  function shareWhatsApp() {
    const url = window.location.href
    const text = `${title} - ${description}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text + '\n' + url)}`, '_blank')
  }

  function shareFacebook() {
    const url = window.location.href
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank')
  }

  return (
    <div className="flex items-center gap-2 px-4 md:px-8 py-3 border-b-2 border-black bg-white">
      <span className="text-[10px] font-black uppercase tracking-widest text-black/40 mr-auto">Compartir</span>

      <button
        onClick={shareWhatsApp}
        className="p-2 border-2 border-black bg-[#25D366] hover:bg-[#128C7E] transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
        title="Compartir por WhatsApp"
      >
        <Image src="/whatsapp-icon.svg" alt="WhatsApp" width={18} height={18} />
      </button>

      <button
        onClick={shareFacebook}
        className="p-2 border-2 border-black bg-[#1877F2] hover:bg-[#0d5bb5] text-white transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
        title="Compartir en Facebook"
      >
        <Facebook className="h-[18px] w-[18px]" />
      </button>

      <button
        onClick={copyLink}
        className={cn(
          'p-2 border-2 border-black transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]',
          copied ? 'bg-green-500 text-white' : 'bg-white hover:bg-black/5'
        )}
        title="Copiar enlace"
      >
        {copied ? <Check className="h-[18px] w-[18px]" /> : <Copy className="h-[18px] w-[18px]" />}
      </button>

      <button
        onClick={handleShare}
        className="p-2 border-2 border-black bg-primary text-white hover:bg-primary/90 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
        title="Compartir"
      >
        <Share2 className="h-[18px] w-[18px]" />
      </button>
    </div>
  )
}
