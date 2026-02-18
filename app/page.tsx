import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { MapPin, ArrowRight, Zap } from 'lucide-react'

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: communities } = await supabase
    .from('communities')
    .select('id, name, slug, municipality, description')
    .eq('is_active', true)
    .order('name')

  return (
    <main className="min-h-screen bg-background selection:bg-primary selection:text-white overflow-hidden relative">
      {/* Background Graphic Elements */}
      <div className="absolute top-[10%] left-[-5%] w-[40%] h-[30%] bg-primary/10 -rotate-12 border-4 border-black -z-10" />
      <div className="absolute bottom-[5%] right-[-10%] w-[50%] h-[40%] bg-secondary/10 rotate-12 border-4 border-black -z-10" />

      <div className="container mx-auto px-4 py-20 max-w-5xl">
        <header className="flex flex-col items-center text-center mb-20">
          <div className="inline-flex items-center gap-2 bg-black text-white px-4 py-1 mb-8 border-2 border-black rotate-[-1deg] shadow-[4px_4px_0px_0px_rgba(225,29,72,1)]">
            <Zap className="h-4 w-4 text-primary fill-current" />
            <span className="font-bold uppercase tracking-widest text-[10px]">Nueva Plataforma</span>
          </div>

          <h1 className="text-6xl md:text-9xl font-heading font-black mb-6 uppercase tracking-tighter italic text-shadow-md">
            Barrio<span className="text-primary italic">Red</span>
          </h1>

          <p className="text-2xl md:text-3xl font-medium max-w-3xl text-balance leading-tight">
            La infraestructura digital que <span className="bg-secondary px-2 border-2 border-black rotate-1 inline-block">conecta</span> y <span className="bg-primary text-white px-2 border-2 border-black -rotate-1 inline-block">empodera</span> a los barrios populares de Colombia.
          </p>
        </header>

        <section className="relative">
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-3xl font-heading font-black uppercase italic tracking-tight underline decoration-primary decoration-4 underline-offset-8">
              Selecciona tu Barrio
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            {communities?.map((community) => (
              <Link key={community.id} href={`/${community.slug}`} className="group">
                <Card className="h-full border-4 border-black transition-all group-hover:translate-x-[-4px] group-hover:translate-y-[-4px] group-hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] bg-white">
                  <CardHeader className="p-8">
                    <div className="flex items-start justify-between mb-4">
                      <div className="bg-accent/10 border-2 border-black p-3 group-hover:bg-accent group-hover:text-white transition-colors">
                        <MapPin className="h-8 w-8" />
                      </div>
                      <div className="bg-primary text-white px-3 py-1 border-2 border-black font-black uppercase text-[10px] tracking-tighter">
                        En Vivo
                      </div>
                    </div>
                    <CardTitle className="text-4xl font-heading font-black uppercase mb-2 italic">
                      {community.name}
                    </CardTitle>
                    <CardDescription className="text-lg font-bold text-black/60 mb-6 uppercase tracking-tight">
                      {community.municipality}, Risaralda
                    </CardDescription>
                    <p className="text-black/80 font-medium mb-8 leading-snug">
                      {community.description || "Explora el directorio comercial y social más completo de este sector."}
                    </p>
                    <div className="flex items-center gap-2 font-black uppercase tracking-tighter group-hover:text-primary transition-colors">
                      Entrar al barrio <ArrowRight className="h-5 w-5" />
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>

          {(!communities || communities.length === 0) && (
            <div className="text-center p-20 border-4 border-dashed border-black bg-white/50">
              <h3 className="text-3xl font-heading font-black uppercase mb-4 italic">Próximamente</h3>
              <p className="text-xl font-bold text-black/60 max-w-md mx-auto">
                Estamos digitalizando más comunidades. ¡Mantente atento a las actualizaciones!
              </p>
            </div>
          )}
        </section>

        <footer className="mt-32 text-center py-10 border-t-4 border-black">
          <p className="font-heading font-black uppercase italic tracking-tighter text-xl">
            BarrioRed © 2026 - Hecho para el barrio, por el barrio.
          </p>
        </footer>
      </div>
    </main>
  )
}
