import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="brutalist-card max-w-md w-full">
        <CardContent className="text-center space-y-6 py-12">
          <h1 className="text-7xl md:text-9xl font-heading font-black uppercase italic leading-none text-primary">
            404
          </h1>
          <div className="space-y-2">
            <p className="text-xl md:text-2xl font-bold uppercase tracking-widest">
              Página no encontrada
            </p>
            <p className="text-sm text-muted-foreground">
              La página que buscas no existe o fue movida.
            </p>
          </div>
          <Button asChild className="brutalist-button">
            <Link href="/">
              Volver al Inicio
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
