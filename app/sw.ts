/// <reference lib="webworker" />

import { Serwist, CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'serwist'
import { CacheableResponsePlugin } from '@serwist/cacheable-response'
import { ExpirationPlugin } from '@serwist/expiration'

declare const self: ServiceWorkerGlobalScope

// Custom runtime caching for Supabase and images
const runtimeCaching = [
  // Next.js static assets (CSS, JS, fonts) - immutable, cache first
  {
    matcher: ({ url }: { url: URL }) => url.pathname.startsWith('/_next/static/'),
    handler: new CacheFirst({
      cacheName: 'next-static',
      plugins: [
        new CacheableResponsePlugin({
          statuses: [0, 200],
        }),
        new ExpirationPlugin({
          maxEntries: 200,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
        }),
      ],
    }),
  },
  // CSS files
  {
    matcher: ({ request }: { request: Request }) => request.destination === 'style',
    handler: new CacheFirst({
      cacheName: 'stylesheets',
      plugins: [
        new CacheableResponsePlugin({
          statuses: [0, 200],
        }),
        new ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
        }),
      ],
    }),
  },
  // JavaScript files
  {
    matcher: ({ request }: { request: Request }) => request.destination === 'script',
    handler: new CacheFirst({
      cacheName: 'scripts',
      plugins: [
        new CacheableResponsePlugin({
          statuses: [0, 200],
        }),
        new ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
        }),
      ],
    }),
  },
  // Fonts
  {
    matcher: ({ request }: { request: Request }) => request.destination === 'font',
    handler: new CacheFirst({
      cacheName: 'fonts',
      plugins: [
        new CacheableResponsePlugin({
          statuses: [0, 200],
        }),
        new ExpirationPlugin({
          maxEntries: 30,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
        }),
      ],
    }),
  },
  {
    matcher: ({ url }: { url: URL }) => url.origin.includes('supabase.co') && url.pathname.includes('/storage/'),
    handler: new CacheFirst({
      cacheName: 'supabase-storage',
      plugins: [
        new CacheableResponsePlugin({
          statuses: [0, 200],
        }),
        new ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        }),
      ],
    }),
  },
  {
    matcher: ({ url }: { url: URL }) => url.origin.includes('supabase.co') && url.pathname.includes('/rest/'),
    handler: new NetworkFirst({
      cacheName: 'api',
      plugins: [
        new CacheableResponsePlugin({
          statuses: [0, 200],
        }),
        new ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 60 * 60, // 1 hour
        }),
      ],
      networkTimeoutSeconds: 10,
    }),
  },
  {
    matcher: ({ request }: { request: Request }) => request.destination === 'image',
    handler: new CacheFirst({
      cacheName: 'images',
      plugins: [
        new CacheableResponsePlugin({
          statuses: [0, 200],
        }),
        new ExpirationPlugin({
          maxEntries: 200,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        }),
      ],
    }),
  },
  {
    matcher: ({ url }: { url: URL }) => url.origin === 'https://images.unsplash.com',
    handler: new CacheFirst({
      cacheName: 'external-images',
      plugins: [
        new CacheableResponsePlugin({
          statuses: [0, 200],
        }),
        new ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        }),
      ],
    }),
  },
  {
    // Cache HTML pages for offline viewing
    matcher: ({ request }: { request: Request }) => request.mode === 'navigate',
    handler: new NetworkFirst({
      cacheName: 'pages',
      plugins: [
        new CacheableResponsePlugin({
          statuses: [0, 200],
        }),
        new ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        }),
      ],
      networkTimeoutSeconds: 3,
    }),
  },
  {
    // Cache business and community content pages
    matcher: ({ url }: { url: URL }) =>
      url.pathname.includes('/business/') ||
      url.pathname.includes('/community/'),
    handler: new StaleWhileRevalidate({
      cacheName: 'content-pages',
      plugins: [
        new CacheableResponsePlugin({
          statuses: [0, 200],
        }),
        new ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 24 * 60 * 60, // 1 day
        }),
      ],
    }),
  },
]

// Initialize Serwist
const serwist = new Serwist({
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
})

// Start Serwist
serwist.addEventListeners()

// ============================================================================
// PUSH NOTIFICATION HANDLERS
// ============================================================================

self.addEventListener('push', (event: PushEvent) => {
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

  const options: NotificationOptions & { vibrate?: number[] } = {
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

  event.waitUntil(self.registration.showNotification(data.title, options))
})

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  console.log('[Service Worker] Notification clicked:', event)
  event.notification.close()

  const url = event.notification.data?.url || '/'

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If there's already a window open, focus it and navigate
        for (const client of clientList) {
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
