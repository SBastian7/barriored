/* eslint-disable no-restricted-globals */
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...')
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...')
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push received:', event)

  let data = {
    title: 'Notificación de BarrioRed',
    body: 'Tienes una nueva notificación',
    url: '/',
  }

  if (event.data) {
    try {
      data = event.data.json()
    } catch (e) {
      console.error('[Service Worker] Failed to parse push data:', e)
    }
  }

  const options = {
    body: data.body,
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    data: {
      url: data.url || '/',
    },
    vibrate: [200, 100, 200],
    tag: 'barriored-notification',
    requireInteraction: false,
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event)
  event.notification.close()

  const url = event.notification.data?.url || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If there's already a window open, focus it and navigate
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i]
        if ('focus' in client) {
          return client.focus().then(() => client.navigate(url))
        }
      }
      // Otherwise, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(url)
      }
    })
  )
})
