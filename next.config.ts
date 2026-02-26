import type { NextConfig } from 'next'
import nextPWA from '@ducanh2912/next-pwa'

const isProd = process.env.NODE_ENV === 'production'

const withPWA = nextPWA({
  dest: 'public',
  disable: !isProd, // Disable PWA in development
  sw: 'sw.js', // Output service worker filename
  customWorkerSrc: 'worker', // Custom worker directory for push notifications
  cacheOnFrontEndNav: true,
  fallbacks: {
    document: '/offline', // Fallback page when offline
  },
  workboxOptions: {
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*$/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'supabase-storage',
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          },
        },
      },
      {
        urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/.*$/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'api',
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 60 * 60, // 1 hour
          },
          networkTimeoutSeconds: 10,
        },
      },
      {
        urlPattern: /\.(?:jpg|jpeg|png|gif|webp|svg|ico)$/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'images',
          expiration: {
            maxEntries: 200,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          },
        },
      },
      {
        urlPattern: /^https:\/\/images\.unsplash\.com\/.*/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'external-images',
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
          },
        },
      },
    ],
  },
})

const nextConfig: NextConfig = {
  turbopack: {},
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
    ]
  },
}

export default withPWA(nextConfig)
