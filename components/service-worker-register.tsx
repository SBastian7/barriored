'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Wait for the page to fully load before registering service worker
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/service-worker.js', { scope: '/' })
          .then((registration) => {
            console.log('Service Worker registered:', registration)
          })
          .catch((error) => {
            console.error('Service Worker registration failed:', error)
          })
      })
    }
  }, [])

  return null
}
