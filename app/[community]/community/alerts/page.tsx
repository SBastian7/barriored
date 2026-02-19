import { createClient } from '@/lib/supabase/server'
import { AlertCard } from '@/components/community/alert-card'
import { Breadcrumbs } from '@/components/shared/breadcrumbs'
import { AlertTriangle, Info } from 'lucide-react'
import { notFound } from 'next/navigation'
import type { CommunityAlert, AlertSeverity } from '@/lib/types'

const SEVERITY_ORDER: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 }

export async function generateMetadata({ params }: { params: Promise<{ community: string }> }) {
    const { community: slug } = await params
    const supabase = await createClient()
    const { data: community } = await supabase
        .from('communities').select('name').eq('slug', slug).single()

    if (!community) return {}
    return { title: `Alertas del Barrio en ${community.name} | BarrioRed` }
}

export default async function AlertsPage({ params }: { params: Promise<{ community: string }> }) {
    const { community: slug } = await params
    const supabase = await createClient()

    const { data: community } = await supabase
        .from('communities').select('id, name').eq('slug', slug).single()
    if (!community) notFound()

    const { data: alertsRes } = await supabase
        .from('community_alerts')
        .select('*')
        .eq('community_id', community.id)
        .order('is_active', { ascending: false })
        .order('created_at', { ascending: false })

    const alerts = (alertsRes ?? []) as any as CommunityAlert[]

    const activeAlerts = alerts.filter(a => a.is_active).sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
    const pastAlerts = alerts.filter(a => !a.is_active)

    return (
        <div className="container mx-auto max-w-4xl px-4 py-8 pb-24">
            <Breadcrumbs items={[
                { label: community.name, href: `/${slug}` },
                { label: 'Comunidad', href: `/${slug}/community` },
                { label: 'Alertas', active: true },
            ]} />

            <header className="mt-8 mb-12 space-y-2">
                <div className="flex items-center gap-2 text-primary font-black uppercase tracking-[0.2em] text-xs">
                    <AlertTriangle className="h-4 w-4" />
                    Seguridad y Servicios
                </div>
                <h1 className="text-5xl md:text-7xl font-heading font-black uppercase tracking-tighter italic leading-none">
                    Alertas <span className="text-primary not-italic">del Barrio</span>
                </h1>
                <p className="text-lg font-bold text-black/60 italic max-w-2xl">
                    Información importante sobre servicios públicos, obras y avisos de seguridad en {community.name}.
                </p>
            </header>

            <div className="space-y-16">
                {activeAlerts.length > 0 ? (
                    <section className="space-y-6">
                        <h2 className="text-sm font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3">
                            <span className="w-8 h-1 bg-primary"></span> Alertas Activas
                        </h2>
                        <div className="grid gap-6">
                            {activeAlerts.map(alert => (
                                <AlertCard key={alert.id} alert={alert} />
                            ))}
                        </div>
                    </section>
                ) : (
                    <div className="text-center py-20 border-4 border-dashed border-black bg-white/50 flex flex-col items-center">
                        <div className="w-16 h-16 border-2 border-black bg-primary/10 flex items-center justify-center rotate-3 mb-6">
                            <Info className="h-8 w-8 text-primary/40" />
                        </div>
                        <p className="text-3xl font-heading font-black uppercase italic tracking-tighter text-black/40">No hay alertas activas</p>
                        <p className="font-bold text-black/60 mt-2 max-w-xs mx-auto">Todo marcha con normalidad en {community.name}.</p>
                    </div>
                )}

                {pastAlerts.length > 0 && (
                    <section className="space-y-6 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
                        <h2 className="text-sm font-black uppercase tracking-[0.3em] text-black/40 flex items-center gap-3">
                            <span className="w-8 h-1 bg-black/20"></span> Historial de Alertas
                        </h2>
                        <div className="grid gap-6">
                            {pastAlerts.map(alert => (
                                <AlertCard key={alert.id} alert={alert} />
                            ))}
                        </div>
                    </section>
                )}
            </div>

            <footer className="mt-20 p-8 border-4 border-black bg-black text-white shadow-[6px_6px_0px_0px_rgba(255,59,48,1)]">
                <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
                    <div className="w-16 h-16 border-2 border-white bg-primary flex items-center justify-center shrink-0">
                        <AlertTriangle className="h-10 w-10 text-white" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-heading font-black uppercase italic tracking-tighter">¿Ves algo sospechoso o una avería?</h3>
                        <p className="font-bold text-white/70">Contacta de inmediato a las líneas de emergencia locales en nuestro directorio de servicios.</p>
                    </div>
                </div>
            </footer>
        </div>
    )
}
