'use client'

import { useEffect, useState } from 'react'
import { requestPermission, subscribeToPush } from '@/lib/push-notifications'
import { Button } from '@/components/ui/button'
import { Bell, X } from 'lucide-react'

export function PushNotificationPrompt() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission)
      // Show prompt if permission not yet granted or denied
      if (Notification.permission === 'default') {
        setTimeout(() => setShowPrompt(true), 3000) // Show after 3 seconds
      }
    }
  }, [])

  async function handleEnable() {
    try {
      const perm = await requestPermission()
      setPermission(perm)
      if (perm === 'granted') {
        await subscribeToPush()
        setShowPrompt(false)
      }
    } catch (error) {
      console.error('Failed to enable notifications:', error)
    }
  }

  function handleDismiss() {
    setShowPrompt(false)
  }

  if (!showPrompt || permission !== 'default') {
    return null
  }

  return (
    <div className="fixed bottom-20 md:bottom-8 left-4 right-4 md:left-auto md:right-8 md:max-w-md bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] z-50 animate-in slide-in-from-bottom">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 hover:bg-black/10 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-4">
        <div className="w-12 h-12 border-2 border-black bg-primary/20 flex items-center justify-center shrink-0">
          <Bell className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1 space-y-3">
          <h3 className="font-heading font-black uppercase italic text-lg leading-tight">
            Recibe Alertas Importantes
          </h3>
          <p className="text-sm text-black/70">
            Activa las notificaciones para recibir alertas de seguridad, cortes de servicios y eventos importantes de tu comunidad.
          </p>
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleEnable}
              size="sm"
              className="border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all font-black uppercase tracking-widest text-xs"
            >
              <Bell className="mr-2 h-3.5 w-3.5" />
              Activar
            </Button>
            <Button
              onClick={handleDismiss}
              variant="outline"
              size="sm"
              className="border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all font-black uppercase tracking-widest text-xs"
            >
              Ahora No
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
