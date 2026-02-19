import { AlertCard } from './alert-card'
import { AlertCircle } from 'lucide-react'
import type { CommunityAlert } from '@/lib/types'

export function AlertsBanner({ alerts }: { alerts: CommunityAlert[] }) {
    if (alerts.length === 0) return null

    return (
        <section className="space-y-4">
            <div className="flex items-center gap-3">
                <div className="bg-primary text-primary-foreground px-3 py-1 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-xs font-black uppercase tracking-widest">{alerts.length}</span>
                </div>
                <h2 className="text-xl font-heading font-black uppercase tracking-tight italic">
                    Alertas del <span className="text-primary">Barrio</span>
                </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
                {alerts.map((alert) => (
                    <AlertCard key={alert.id} alert={alert} />
                ))}
            </div>
        </section>
    )
}
