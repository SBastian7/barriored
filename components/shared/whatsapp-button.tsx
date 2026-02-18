'use client'

import { Button } from '@/components/ui/button'
import { MessageCircle } from 'lucide-react'
import { whatsappUrl } from '@/lib/utils'

export function WhatsAppButton({ number, message }: { number: string; message?: string }) {
  return (
    <a href={whatsappUrl(number, message)} target="_blank" rel="noopener noreferrer" className="fixed bottom-24 right-4 md:bottom-8 z-40">
      <Button size="lg" className="bg-[#25D366] hover:bg-[#128C7E] text-black border-4 border-black rounded-none shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all h-16 px-8 flex items-center gap-3">
        <MessageCircle className="h-7 w-7 fill-current" />
        <span className="font-heading font-black uppercase italic tracking-tighter text-xl">WhatsApp</span>
      </Button>
    </a>
  )
}
