'use client'

import { Button } from '@/components/ui/button'
import { MessageCircle } from 'lucide-react'
import { whatsappUrl } from '@/lib/utils'

export function WhatsAppButton({ number, message }: { number: string; message?: string }) {
  return (
    <a href={whatsappUrl(number, message)} target="_blank" rel="noopener noreferrer" className="fixed bottom-20 right-4 md:bottom-6 z-40">
      <Button size="lg" className="bg-green-600 hover:bg-green-700 rounded-full shadow-lg h-14 px-6">
        <MessageCircle className="h-6 w-6 mr-2" /> WhatsApp
      </Button>
    </a>
  )
}
