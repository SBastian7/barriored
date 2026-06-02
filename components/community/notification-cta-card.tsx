'use client'

import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'

export function NotificationCTACard() {
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
            setVisible(true)
        }
    }, [])

    if (!visible) return null

    return (
        <div className="border-2 border-black shadow-[4px_4px_0_black] p-5 bg-accent text-white">
            <div className="font-mono text-[11px] tracking-widest uppercase text-secondary font-bold mb-2">RECIBE ESTA INFO</div>
            <div className="font-heading font-black italic uppercase text-xl leading-tight">
                Activa las alertas del barrio
            </div>
            <p className="text-sm text-white/80 mt-2 leading-relaxed">
                Te avisamos en tu celular cuando haya cambios que te afecten.
            </p>
            <div className="flex flex-col gap-2 mt-4">
                <button
                    onClick={async () => {
                        const permission = await Notification.requestPermission()
                        if (permission === 'granted') setVisible(false)
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 bg-secondary text-black border-2 border-black shadow-[2px_2px_0_black] font-heading font-black uppercase tracking-widest text-xs px-4 py-2.5 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_black] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                >
                    <Bell className="w-3 h-3" /> ACTIVAR NOTIFICACIONES
                </button>
            </div>
        </div>
    )
}
