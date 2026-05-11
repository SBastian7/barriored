'use client'

import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { WifiOff } from 'lucide-react'
import { useOnlineStatus } from '@/hooks/use-online-status'

export function OfflineBanner() {
  const { isOnline } = useOnlineStatus()
  const wasOffline = useRef(false)

  useEffect(() => {
    if (!isOnline) {
      wasOffline.current = true
    } else if (wasOffline.current) {
      wasOffline.current = false
      toast.success('Conexión restaurada')
    }
  }, [isOnline])

  if (isOnline) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 bg-primary text-background px-4 py-2 text-sm font-bold uppercase tracking-widest">
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>Sin conexión — algunas funciones no estarán disponibles</span>
    </div>
  )
}
