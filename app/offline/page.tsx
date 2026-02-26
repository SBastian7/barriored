'use client'

import { WifiOff } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="brutalist-card max-w-md w-full">
        <CardContent className="text-center space-y-6 py-12">
          <WifiOff className="h-16 w-16 mx-auto text-black/40" strokeWidth={3} />
          <h1 className="text-5xl md:text-7xl font-heading font-black uppercase italic leading-none">
            Sin Conexión
          </h1>
          <div className="space-y-2">
            <p className="text-xl md:text-2xl font-bold uppercase tracking-widest">
              No hay internet
            </p>
            <p className="text-sm text-muted-foreground">
              Verifica tu conexión e intenta de nuevo.
            </p>
          </div>
          <Button
            onClick={() => window.location.reload()}
            className="brutalist-button"
          >
            Reintentar
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
