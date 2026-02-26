import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Home } from 'lucide-react'

export default function CommunityNotFound() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-16">
      <Card className="brutalist-card">
        <CardContent className="text-center space-y-6 py-12">
          <h1 className="text-7xl md:text-9xl font-heading font-black uppercase italic leading-none text-primary">
            404
          </h1>
          <div className="space-y-2">
            <p className="text-xl md:text-2xl font-bold uppercase tracking-widest">
              Página no encontrada
            </p>
            <p className="text-sm text-muted-foreground">
              Esta página no existe en esta comunidad.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button asChild className="brutalist-button">
              <Link href="/">
                <Home className="h-4 w-4 mr-2" />
                Inicio
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
