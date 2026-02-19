import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PlusCircle } from 'lucide-react'

export function RegisterCTA({ communitySlug }: { communitySlug: string }) {
  return (
    <section className="py-16 px-4 bg-primary">
      <div className="container mx-auto max-w-3xl text-center">
        <div className="bg-white border-4 border-black p-8 md:p-12 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="text-3xl md:text-4xl font-heading font-black uppercase italic tracking-tight mb-4">
            Tienes un <span className="text-primary underline decoration-4 underline-offset-4">negocio</span>?
          </h2>
          <p className="text-lg text-black/70 font-medium mb-8 max-w-lg mx-auto">
            Registra tu negocio gratis y llega a todos los vecinos del barrio. Sin barreras, sin costos.
          </p>
          <Link href={`/${communitySlug}/register`}>
            <Button size="lg" className="h-14 px-10 text-base border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all font-black uppercase tracking-tight">
              <PlusCircle className="h-5 w-5 mr-2" />
              Registrar mi negocio
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
