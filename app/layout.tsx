import type { Metadata } from 'next'
import { Inter, Outfit, Space_Mono } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import { ServiceWorkerRegister } from '@/components/service-worker-register'
import { ErrorBoundary } from '@/components/shared/error-boundary'
import { OfflineBanner } from '@/components/shared/offline-banner'
import { Analytics } from '@vercel/analytics/next'
import { InstallPrompt } from '@/components/pwa/install-prompt'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
})

const spaceMono = Space_Mono({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: 'BarrioRed - Tu barrio, conectado',
  description: 'Plataforma digital comunitaria para la visibilidad comercial y el fortalecimiento del tejido social.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  manifest: '/manifest.json',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${outfit.variable} ${spaceMono.variable}`}>
      <body className="font-sans antialiased">
        <OfflineBanner />
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
        <Toaster />
        <ServiceWorkerRegister />
        <Analytics />
        <InstallPrompt />
      </body>
    </html>
  )
}
