'use client'

import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISSED_KEY = 'pwa-install-dismissed'

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY)) return

    let timerId: ReturnType<typeof setTimeout>

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      // Show after 10 seconds
      timerId = setTimeout(() => setVisible(true), 10_000)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      clearTimeout(timerId)
    }
  }, [])

  async function handleInstall() {
    if (!deferredPrompt) return
    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        localStorage.setItem(DISMISSED_KEY, '1')
        setVisible(false)
      }
    } catch {
      setVisible(false)
    }
  }

  function handleDismiss() {
    localStorage.setItem(DISMISSED_KEY, '1')
    setVisible(false)
  }

  if (!visible || !deferredPrompt) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:w-80 z-40 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="font-heading font-black text-sm uppercase tracking-tighter italic">
            Instala BarrioRed
          </p>
          <p className="text-xs text-black/60 mt-1">
            Accede más rápido desde tu pantalla de inicio.
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-black/40 hover:text-black mt-0.5"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={handleInstall}
          className="flex-1 brutalist-button text-xs py-2 flex items-center justify-center gap-1"
        >
          <Download className="h-3 w-3" />
          Instalar
        </button>
        <button
          onClick={handleDismiss}
          className="flex-1 text-xs py-2 border-2 border-black font-bold uppercase hover:bg-black/5"
        >
          Ahora no
        </button>
      </div>
    </div>
  )
}
