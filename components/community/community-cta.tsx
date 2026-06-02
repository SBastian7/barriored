import Link from 'next/link'
import { Megaphone, CalendarDays } from 'lucide-react'

export function CommunityCTA({ communitySlug }: { communitySlug: string }) {
    return (
        <section className="px-4 md:px-8 py-11">
            <div className="border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] overflow-hidden">
                {/* Left: CTA */}
                <div className="p-8 md:p-10 relative bg-background">
                    <div className="absolute inset-0 br-pattern-dots opacity-15" />
                    <div className="relative">
                        <span className="font-mono text-[11px] tracking-widest uppercase bg-black text-secondary px-2 py-1 font-bold">
                            RED VECINAL
                        </span>
                        <h2 className="font-heading font-black italic uppercase tracking-tight leading-[0.88] mt-4 text-[48px] md:text-[64px]">
                            ¿TIENES ALGO QUE
                            <br />
                            <span className="text-primary">CONTAR?</span>
                        </h2>
                        <p className="mt-4 text-base font-medium max-w-md text-black/70">
                            La Red Vecinal la hacemos todos. Publica anuncios, organiza eventos y avisa a tus vecinos cuando pase algo en la zona.
                        </p>
                        <div className="flex flex-wrap gap-3 mt-6">
                            <Link href={`/${communitySlug}/community/announcements/new`}>
                                <button className="inline-flex items-center gap-2 bg-primary text-white border-2 border-black shadow-[4px_4px_0_black] font-heading font-black uppercase tracking-widest text-sm px-6 py-3 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_black] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer">
                                    <Megaphone className="w-4 h-4" /> PUBLICAR ANUNCIO
                                </button>
                            </Link>
                            <Link href={`/${communitySlug}/community/events/new`}>
                                <button className="inline-flex items-center gap-2 bg-white border-2 border-black shadow-[4px_4px_0_black] font-heading font-black uppercase tracking-widest text-sm px-6 py-3 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_black] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer">
                                    <CalendarDays className="w-4 h-4" /> CREAR EVENTO
                                </button>
                            </Link>
                        </div>
                        <p className="mt-5 font-mono text-[10px] tracking-widest uppercase opacity-50">
                            * Todas las publicaciones requieren aprobación de seguridad
                        </p>
                    </div>
                </div>

                {/* Right: Cómo funciona */}
                <div className="bg-black text-white p-8 md:p-10 flex flex-col gap-5 border-t-4 lg:border-t-0 lg:border-l-4 border-black">
                    <span className="font-mono text-[11px] tracking-widest uppercase text-secondary font-bold">
                        CÓMO FUNCIONA
                    </span>
                    {[
                        ['01', 'ESCRIBE', 'Tu evento o anuncio en 1 minuto.'],
                        ['02', 'REVISIÓN', 'El equipo de BarrioRed lo aprueba en menos de 24h.'],
                        ['03', 'EN VIVO', 'Los vecinos lo ven aquí y por WhatsApp.'],
                    ].map(([n, t, d]) => (
                        <div key={n} className="grid grid-cols-[auto_1fr] gap-4 items-center">
                            <span className="font-heading font-black italic text-primary text-[40px] md:text-[48px] leading-none w-14">
                                {n}
                            </span>
                            <div>
                                <div className="font-heading font-black italic uppercase text-lg leading-none">{t}</div>
                                <div className="text-sm text-white/75 mt-0.5">{d}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
