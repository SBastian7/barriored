import { AlertCard } from './alert-card'
import type { CommunityAlert } from '@/lib/types'

export function AlertsBanner({ alerts }: { alerts: CommunityAlert[] }) {
    if (alerts.length === 0) return null

    return (
        <section className="px-4 md:px-8 py-8 bg-background border-b-4 border-black">
            <div className="flex justify-between items-end mb-4 flex-wrap gap-3">
                <h2 className="font-heading font-black italic uppercase tracking-tight leading-none flex items-baseline gap-3 text-[36px] md:text-[44px]">
                    ALERTAS{' '}
                    <span className="text-primary">DEL BARRIO</span>
                    <span className="font-mono text-xs ml-2 align-middle not-italic font-bold opacity-60">
                        {alerts.length} ACTIVAS
                    </span>
                </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {alerts.map((alert) => (
                    <AlertCard key={alert.id} alert={alert} />
                ))}
            </div>
        </section>
    )
}
