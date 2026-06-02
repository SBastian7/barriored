import { AlertTriangle, Droplets, Zap, Shield, Construction, Info } from 'lucide-react'
import type { CommunityAlert, AlertType } from '@/lib/types'

const alertIcons: Record<AlertType, React.ElementType> = {
    water: Droplets,
    power: Zap,
    security: Shield,
    construction: Construction,
    general: Info,
}

const alertTypeLabels: Record<AlertType, string> = {
    water: 'AGUA',
    power: 'ENERGÍA',
    security: 'SEGURIDAD',
    construction: 'OBRAS',
    general: 'GENERAL',
}

const severityConfig = {
    critical: {
        bg: 'bg-primary',
        text: 'text-white',
        urgency: 'URGENTE',
    },
    warning: {
        bg: 'bg-secondary',
        text: 'text-black',
        urgency: 'PROGRAMADO',
    },
    info: {
        bg: 'bg-accent',
        text: 'text-white',
        urgency: 'INFORMATIVO',
    },
}

export function AlertCard({ alert }: { alert: CommunityAlert }) {
    const Icon = alertIcons[alert.type] ?? Info
    const cfg = severityConfig[alert.severity]
    const typeLabel = alertTypeLabels[alert.type] ?? alert.type.toUpperCase()

    const formatDate = (iso: string) =>
        new Date(iso)
            .toLocaleDateString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
            .toUpperCase()

    return (
        <div className={`border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${cfg.bg} ${cfg.text} grid overflow-hidden`} style={{ gridTemplateColumns: 'auto 1fr' }}>
            {/* Left column: icon + urgency label */}
            <div className="border-r-[3px] border-black px-4.5 py-4.5 flex flex-col items-center justify-center gap-1.5 min-w-20 bg-black/10">
                <Icon className="w-7 h-7" strokeWidth={2} />
                <span className="font-mono text-[9px] tracking-[0.04em] uppercase font-bold text-center leading-tight">
                    {cfg.urgency}
                </span>
            </div>

            {/* Right column */}
            <div className="p-4 flex flex-col gap-2">
                {/* Header row: "ALERTA · TYPE" + optional urgency badge */}
                <div className="flex justify-between items-center gap-2 flex-wrap">
                    <span className="font-mono text-[10px] tracking-widest uppercase font-bold opacity-85">
                        ALERTA · {typeLabel}
                    </span>
                    {alert.severity === 'critical' && (
                        <span className="font-mono text-[9px] tracking-widest uppercase bg-black text-secondary px-2 py-0.5 border border-black/40 font-bold flex items-center gap-1 shrink-0">
                            <AlertTriangle className="w-2.5 h-2.5" /> URGENTE
                        </span>
                    )}
                </div>

                {/* Big italic title */}
                <h3 className="font-heading font-black italic uppercase leading-none tracking-tight text-[26px]">
                    {alert.title}
                </h3>

                {alert.description && (
                    <p className="text-[13px] font-medium opacity-95 line-clamp-3 leading-snug">
                        {alert.description}
                    </p>
                )}

                {/* Footer: location / time */}
                {(alert.starts_at || alert.ends_at) && (
                    <div className="flex justify-between items-center border-t-2 border-dashed border-current/40 mt-1 pt-2 gap-3 flex-wrap">
                        {alert.starts_at && (
                            <span className="font-mono text-[9px] tracking-widest uppercase font-bold">
                                {formatDate(alert.starts_at)}
                            </span>
                        )}
                        {alert.ends_at && (
                            <span className="font-mono text-[9px] tracking-widest uppercase font-bold opacity-75">
                                HASTA: {formatDate(alert.ends_at)}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
