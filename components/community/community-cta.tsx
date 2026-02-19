import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Megaphone, Calendar, Briefcase } from 'lucide-react'

export function CommunityCTA({ communitySlug }: { communitySlug: string }) {
    return (
        <section className="relative overflow-hidden bg-white border-4 border-black p-8 md:p-12 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center text-center">
            {/* Decorative background elements */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 -mr-12 -mt-12 rotate-45 border-l-4 border-black" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-accent/10 -ml-12 -mb-12 rotate-45 border-r-4 border-black" />

            <h2 className="relative z-10 text-4xl md:text-5xl font-heading font-black uppercase italic tracking-tighter mb-4 leading-none">
                ¿Tienes algo que <span className="text-primary underline decoration-black underline-offset-4">contar</span>?
            </h2>

            <p className="relative z-10 text-lg text-black/70 font-bold mb-10 max-w-xl">
                La Red Vecinal la hacemos todos. Publica anuncios, organiza eventos o comparte vacantes de empleo con tus vecinos.
            </p>

            <div className="relative z-10 flex flex-wrap gap-4 justify-center">
                <Link href={`/${communitySlug}/community/announcements/new`}>
                    <Button variant="default" size="lg" className="h-14 px-8 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all font-black uppercase tracking-widest text-xs gap-2">
                        <Megaphone className="h-5 w-5" /> Publicar Anuncio
                    </Button>
                </Link>

                <Link href={`/${communitySlug}/community/events/new`}>
                    <Button variant="outline" size="lg" className="h-14 px-8 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all font-black uppercase tracking-widest text-xs gap-2 bg-accent/10">
                        <Calendar className="h-5 w-5" /> Crear Evento
                    </Button>
                </Link>

                <Link href={`/${communitySlug}/community/jobs/new`}>
                    <Button variant="secondary" size="lg" className="h-14 px-8 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all font-black uppercase tracking-widest text-xs gap-2">
                        <Briefcase className="h-5 w-5" /> Ofertar Empleo
                    </Button>
                </Link>
            </div>

            <p className="mt-8 text-[10px] font-black uppercase tracking-[0.2em] text-black/40 italic">
                * Todas las publicaciones requieren aprobación de seguridad
            </p>
        </section>
    )
}
