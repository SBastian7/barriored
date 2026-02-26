'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AlertTriangle } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to console in development
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="brutalist-card max-w-md w-full">
        <CardContent className="text-center space-y-6 py-12">
          <AlertTriangle className="h-16 w-16 mx-auto text-red-600" strokeWidth={3} />
          <h1 className="text-5xl md:text-7xl font-heading font-black uppercase italic leading-none">
            Error
          </h1>
          <div className="space-y-2">
            <p className="text-xl md:text-2xl font-bold uppercase tracking-widest">
              Algo salió mal
            </p>
            <p className="text-sm text-muted-foreground">
              Ocurrió un error inesperado. Intenta de nuevo.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button onClick={reset} className="brutalist-button">
              Intentar de Nuevo
            </Button>
            <Button asChild variant="outline" className="brutalist-button">
              <a href="/">Volver al Inicio</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
