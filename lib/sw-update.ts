import { Serwist as SerwistWindow } from '@serwist/window'

let serwist: SerwistWindow | null = null

export function registerServiceWorker() {
  if (
    typeof window === 'undefined' ||
    !('serviceWorker' in navigator)
  ) {
    return null
  }

  // Allow service worker in development for testing
  // In production, this always runs. In dev, check if sw.js exists
  if (process.env.NODE_ENV !== 'production') {
    console.log('[SW] Running in development mode - service worker will register if sw.js exists')
  }

  serwist = new SerwistWindow('/sw.js', { scope: '/' })

  // Listen for waiting service worker
  serwist.addEventListener('waiting', () => {
    console.log('[SW Update] New service worker waiting')
    // Trigger custom event for UI to show update prompt
    window.dispatchEvent(
      new CustomEvent('swUpdateAvailable', {
        detail: { serwist },
      })
    )
  })

  // Listen for controlling service worker change
  serwist.addEventListener('controlling', () => {
    console.log('[SW Update] New service worker activated')
    window.location.reload()
  })

  // Register the service worker
  serwist
    .register()
    .then((registration) => {
      console.log('✅ Service Worker registered:', registration)
    })
    .catch((error) => {
      console.error('❌ Service Worker registration failed:', error)
    })

  return serwist
}

export function skipWaiting() {
  if (serwist) {
    serwist.messageSkipWaiting()
  }
}

export function checkForUpdates() {
  if (serwist) {
    serwist.update()
  }
}
