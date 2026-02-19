import { AlertTriangle, Droplets, Zap, Shield, Construction, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CommunityAlert, AlertType } from '@/lib/types'

const alertIcons = {
    water: Droplets,
    power: Zap,
    security: Shield,
    construction: Construction,
    general: Info,
}

const alertTypeLabels: Record<AlertType, string> = {
    water: 'Agua',
    power: 'Energía',
    security: 'Seguridad',
    construction: 'Obras',
    general: 'General',
}

const severityStyles = {
    critical: 'bg-primary border-black text-primary-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
    warning: 'bg-yellow-400 border-black text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
    info: 'bg-white border-black text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
}

const iconStyles = {
    critical: 'bg-white text-primary border-black',
    warning: 'bg-black text-yellow-400 border-black',
    info: 'bg-black text-white border-black',
}

export function AlertCard({ alert }: { alert: CommunityAlert }) {
    const Icon = alertIcons[alert.type] || Info

    return (
        <div className={cn(
            'flex items-start gap-4 p-5 border-2 transition-all',
            severityStyles[alert.severity]
        )}>
            <div className={cn(
                "shrink-0 w-10 h-10 border-2 flex items-center justify-center",
                iconStyles[alert.severity]
            )}>
                <Icon className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">
                        Alerta de {alertTypeLabels[alert.type] ?? alert.type}
                    </span>
                    {alert.severity === 'critical' && (
                        <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest bg-white text-primary px-1 border border-black italic">
                            <AlertTriangle className="h-3 w-3" /> Urgente
                        </span>
                    )}
                </div>
                <h3 className="font-heading font-black uppercase tracking-tight text-lg italic leading-tight">{alert.title}</h3>
                {alert.description && (
                    <p className="text-sm mt-2 font-medium opacity-90 line-clamp-3">{alert.description}</p>
                )}
                {(alert.starts_at || alert.ends_at) && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-4 pt-3 border-t border-black/10">
                        {alert.starts_at && (
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">
                                Inicio: {new Date(alert.starts_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </p>
                        )}
                        {alert.ends_at && (
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">
                                Fin: {new Date(alert.ends_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
