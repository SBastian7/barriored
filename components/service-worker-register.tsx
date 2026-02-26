'use client'

import { useEffect, useState } from 'react'
import { registerServiceWorker, skipWaiting } from '@/lib/sw-update'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

export function ServiceWorkerRegister() {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false)

  useEffect(() => {
    // Register service worker on mount
    registerServiceWorker()

    // Listen for update available event
    const handleUpdateAvailable = () => {
      setShowUpdatePrompt(true)
    }

    window.addEventListener('swUpdateAvailable', handleUpdateAvailable)

    return () => {
      window.removeEventListener('swUpdateAvailable', handleUpdateAvailable)
    }
  }, [])

  const handleUpdate = () => {
    skipWaiting()
    setShowUpdatePrompt(false)
    toast.info('Actualizando la aplicación...', {
      description: 'La página se recargará en un momento',
    })
  }

  if (!showUpdatePrompt) {
    return null
  }

  return (
    <div className="fixed top-4 right-4 md:right-8 z-50 max-w-sm">
      <div className="bg-white border-4 border-black p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] animate-in slide-in-from-top">
        <h4 className="font-heading font-black uppercase text-sm mb-2">
          Nueva Versión Disponible
        </h4>
        <p className="text-sm text-black/70 mb-3">
          Hay una actualización de BarrioRed lista para instalar.
        </p>
        <Button
          onClick={handleUpdate}
          size="sm"
          className="w-full border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all font-black uppercase tracking-widest text-xs"
        >
          Actualizar Ahora
        </Button>
      </div>
    </div>
  )
}
