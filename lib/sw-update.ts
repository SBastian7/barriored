import { Serwist as SerwistWindow } from '@serwist/window'

let serwist: SerwistWindow | null = null

export function registerServiceWorker() {
  if (
    typeof window === 'undefined' ||
    !('serviceWorker' in navigator) ||
    process.env.NODE_ENV !== 'production'
  ) {
    return null
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
