import Link from 'next/link'
import { ArrowRight, Siren, HeartPulse, Landmark, Bus, Wrench } from 'lucide-react'

const categories = [
    { key: 'emergency', label: 'Emergencias', icon: Siren, color: 'bg-primary text-white' },
    { key: 'health', label: 'Salud', icon: HeartPulse, color: 'bg-accent text-black' },
    { key: 'government', label: 'Gobierno', icon: Landmark, color: 'bg-secondary text-black' },
    { key: 'transport', label: 'Transporte', icon: Bus, color: 'bg-blue-400 text-white' },
    { key: 'utilities', label: 'Servicios', icon: Wrench, color: 'bg-emerald-500 text-white' },
]

export function ServicesSection({ communitySlug }: { communitySlug: string }) {
    return (
        <section>
            <div className="flex items-end justify-between mb-8 border-b-4 border-black pb-2">
                <h2 className="text-3xl md:text-4xl font-heading font-black uppercase italic tracking-tighter flex items-center gap-3">
                    <div className="w-10 h-10 border-2 border-black bg-white flex items-center justify-center rotate-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        <Siren className="h-6 w-6 text-primary" />
                    </div>
                    Servicios Públicos
                </h2>
                <Link
                    href={`/${communitySlug}/community/services`}
                    className="group text-sm font-black uppercase tracking-widest text-primary hover:text-black transition-colors flex items-center gap-2 mb-1"
                >
                    Ver Directorio <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {categories.map((cat) => (
                    <Link
                        key={cat.key}
                        href={`/${communitySlug}/community/services?category=${cat.key}`}
                        className="group flex flex-col items-center gap-4 p-6 border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all"
                    >
                        <div className={`w-14 h-14 flex items-center justify-center border-2 border-black ${cat.color} group-hover:scale-110 transition-transform`}>
                            <cat.icon className="h-7 w-7" />
                        </div>
                        <span className="text-xs font-black uppercase tracking-[0.1em] text-center leading-tight">
                            {cat.label}
                        </span>
                    </Link>
                ))}
            </div>
        </section>
    )
}
