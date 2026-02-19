import { createClient } from '@/lib/supabase/server'
import { ServiceCard } from '@/components/community/service-card'
import { Breadcrumbs } from '@/components/shared/breadcrumbs'
import { Badge } from '@/components/ui/badge'
import { Siren, HeartPulse, Landmark, Bus, Wrench, Search, Info } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import type { PublicService, ServiceCategory } from '@/lib/types'

const CATEGORY_META: Record<ServiceCategory, { label: string; icon: any; color: string }> = {
    emergency: { label: 'Emergencias', icon: Siren, color: 'bg-primary' },
    health: { label: 'Salud', icon: HeartPulse, color: 'bg-accent' },
    government: { label: 'Gobierno', icon: Landmark, color: 'bg-secondary' },
    transport: { label: 'Transporte', icon: Bus, color: 'bg-blue-400' },
    utilities: { label: 'Servicios', icon: Wrench, color: 'bg-emerald-500' },
}

export async function generateMetadata({ params }: { params: Promise<{ community: string }> }) {
    const { community: slug } = await params
    const supabase = await createClient()
    const { data: community } = await supabase
        .from('communities').select('name').eq('slug', slug).single()

    if (!community) return {}
    return { title: `Directorio de Servicios en ${community.name} | BarrioRed` }
}

export default async function ServicesPage({
    params,
    searchParams,
}: {
    params: Promise<{ community: string }>
    searchParams: Promise<{ category?: string }>
}) {
    const { community: slug } = await params
    const { category: filterCat } = await searchParams
    const supabase = await createClient()

    const { data: community } = await supabase
        .from('communities').select('id, name').eq('slug', slug).single()
    if (!community) notFound()

    let query = supabase
        .from('public_services')
        .select('*')
        .eq('community_id', community.id)
        .eq('is_active', true)
        .order('category')
        .order('sort_order')

    if (filterCat) query = query.eq('category', filterCat as ServiceCategory)

    const { data: servicesRes } = await query
    const services = (servicesRes ?? []) as any as PublicService[]

    // Group by category
    const grouped = services.reduce((acc, svc) => {
        if (!acc[svc.category]) acc[svc.category] = []
        acc[svc.category].push(svc)
        return acc
    }, {} as Record<string, PublicService[]>)

    return (
        <div className="container mx-auto max-w-5xl px-4 py-8 pb-24">
            <Breadcrumbs items={[
                { label: community.name, href: `/${slug}` },
                { label: 'Comunidad', href: `/${slug}/community` },
                { label: 'Servicios', active: true },
            ]} />

            <header className="mt-8 mb-12 space-y-4">
                <div className="flex items-center gap-2 text-primary font-black uppercase tracking-[0.2em] text-xs">
                    <Siren className="h-4 w-4" />
                    Directorio Público
                </div>
                <h1 className="text-5xl md:text-7xl font-heading font-black uppercase tracking-tighter italic leading-none">
                    Servicios <span className="text-primary not-italic">y Emergencias</span>
                </h1>
                <p className="text-lg font-bold text-black/60 italic max-w-2xl">
                    Líneas de atención, centros de salud y servicios oficiales para los habitantes de {community.name}.
                </p>
            </header>

            {/* Category filters */}
            <div className="flex flex-wrap gap-3 mb-12">
                <Link href={`/${slug}/community/services`}>
                    <Badge
                        variant={!filterCat ? 'default' : 'outline'}
                        className={`text-sm px-6 py-2 border-2 border-black rounded-none uppercase tracking-widest font-black transition-all ${!filterCat ? 'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] translate-x-[-2px] translate-y-[-2px]' : ''}`}
                    >
                        Todos
                    </Badge>
                </Link>
                {Object.entries(CATEGORY_META).map(([key, { label }]) => (
                    <Link key={key} href={`/${slug}/community/services?category=${key}`}>
                        <Badge
                            variant={filterCat === key ? 'default' : 'outline'}
                            className={`text-sm px-6 py-2 border-2 border-black rounded-none uppercase tracking-widest font-black transition-all ${filterCat === key ? 'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] translate-x-[-2px] translate-y-[-2px]' : ''}`}
                        >
                            {label}
                        </Badge>
                    </Link>
                ))}
            </div>

            {services.length === 0 ? (
                <div className="text-center py-32 border-4 border-dashed border-black bg-white/50 flex flex-col items-center">
                    <div className="w-16 h-16 border-2 border-black bg-accent/20 flex items-center justify-center rotate-3 mb-6">
                        <Info className="h-8 w-8 text-black/20" />
                    </div>
                    <p className="text-3xl font-heading font-black uppercase italic tracking-tighter text-black/40">No hay servicios registrados</p>
                    <p className="font-bold text-black/60 mt-2">Pronto añadiremos los contactos de emergencia de tu barrio.</p>
                </div>
            ) : (
                <div className="space-y-16">
                    {Object.entries(grouped).map(([cat, items]) => {
                        const meta = CATEGORY_META[cat as ServiceCategory]
                        const Icon = meta?.icon || Siren
                        return (
                            <section key={cat} className="space-y-8">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 border-2 border-black ${meta.color} flex items-center justify-center -rotate-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]`}>
                                        <Icon className="h-6 w-6 text-white" />
                                    </div>
                                    <h2 className="text-3xl font-heading font-black uppercase italic tracking-tight">{meta?.label ?? cat}</h2>
                                    <div className="h-1 flex-1 bg-black/5 ml-4"></div>
                                </div>
                                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                    {items.map((svc) => (
                                        <ServiceCard key={svc.id} service={svc} />
                                    ))}
                                </div>
                            </section>
                        )
                    })}
                </div>
            )}

            <div className="mt-20 p-8 border-4 border-black border-dashed bg-accent/5 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="space-y-2">
                    <h3 className="text-xl font-heading font-black uppercase italic tracking-tight">¿Falta algún servicio importante?</h3>
                    <p className="font-bold text-black/50 text-sm">Si conoces una línea de emergencia o servicio público que debería estar aquí, avísanos.</p>
                </div>
                <Button variant="outline" className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-black uppercase tracking-widest text-xs">Informar Servicio</Button>
            </div>
        </div>
    )
}
