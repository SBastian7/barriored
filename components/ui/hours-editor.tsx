'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Clock, Copy } from 'lucide-react'

const DAYS = [
  { key: 'lunes', label: 'Lun' },
  { key: 'martes', label: 'Mar' },
  { key: 'miercoles', label: 'Mie' },
  { key: 'jueves', label: 'Jue' },
  { key: 'viernes', label: 'Vie' },
  { key: 'sabado', label: 'Sab' },
  { key: 'domingo', label: 'Dom' },
]

type DayHours = { open: string; close: string }
type HoursMap = Record<string, DayHours>

type HoursEditorProps = {
  value: HoursMap
  onChange: (hours: HoursMap) => void
  error?: string
}

export function HoursEditor({ value, onChange, error }: HoursEditorProps) {
  const [activeDays, setActiveDays] = useState<Set<string>>(() => new Set(Object.keys(value)))

  function toggleDay(day: string) {
    const next = new Set(activeDays)
    if (next.has(day)) {
      next.delete(day)
      const updated = { ...value }
      delete updated[day]
      onChange(updated)
    } else {
      next.add(day)
      onChange({ ...value, [day]: value[day] ?? { open: '08:00', close: '18:00' } })
    }
    setActiveDays(next)
  }

  function updateDay(day: string, field: 'open' | 'close', val: string) {
    onChange({ ...value, [day]: { ...value[day], [field]: val } })
  }

  function copyToAll() {
    const firstActive = DAYS.find(d => activeDays.has(d.key))
    if (!firstActive || !value[firstActive.key]) return
    const source = value[firstActive.key]
    const updated: HoursMap = {}
    activeDays.forEach(day => {
      updated[day] = { ...source }
    })
    onChange(updated)
  }

  return (
    <div className="space-y-3">
      {/* Day toggle chips */}
      <div className="flex flex-wrap gap-2">
        {DAYS.map(d => (
          <button
            key={d.key}
            type="button"
            onClick={() => toggleDay(d.key)}
            className={cn(
              'px-3 py-1.5 text-xs font-black uppercase tracking-widest border-2 border-black transition-all',
              activeDays.has(d.key)
                ? 'bg-primary text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                : 'bg-white text-black/40 shadow-none'
            )}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* Copy to all button */}
      {activeDays.size > 1 && (
        <button
          type="button"
          onClick={copyToAll}
          className="flex items-center gap-1.5 text-xs font-bold text-black/50 hover:text-primary transition-colors uppercase tracking-wider"
        >
          <Copy className="h-3 w-3" />
          Copiar horario a todos los dias activos
        </button>
      )}

      {/* Time inputs per active day */}
      <div className="space-y-2">
        {DAYS.filter(d => activeDays.has(d.key)).map(d => (
          <div key={d.key} className="flex items-center gap-3 bg-white border-2 border-black p-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <span className="w-10 text-xs font-black uppercase tracking-widest text-black/60">{d.label}</span>
            <div className="flex items-center gap-2 flex-1">
              <Clock className="h-3.5 w-3.5 text-black/40" />
              <input
                type="time"
                value={value[d.key]?.open ?? '08:00'}
                onChange={(e) => updateDay(d.key, 'open', e.target.value)}
                className="bg-transparent font-bold text-sm outline-none border-b-2 border-dashed border-black/20 focus:border-primary px-1 py-0.5"
              />
              <span className="text-xs font-black text-black/30">—</span>
              <input
                type="time"
                value={value[d.key]?.close ?? '18:00'}
                onChange={(e) => updateDay(d.key, 'close', e.target.value)}
                className="bg-transparent font-bold text-sm outline-none border-b-2 border-dashed border-black/20 focus:border-primary px-1 py-0.5"
              />
            </div>
          </div>
        ))}
      </div>

      {activeDays.size === 0 && (
        <p className="text-xs font-bold text-black/40 uppercase tracking-wider text-center py-3">
          Selecciona los dias que abres
        </p>
      )}

      {error && <p className="text-xs font-bold text-red-500 uppercase tracking-wider">{error}</p>}
    </div>
  )
}
