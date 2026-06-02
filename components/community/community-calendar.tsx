'use client'

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'

export type CalendarEvent = {
    id: string
    title: string
    date: string   // ISO string
    href: string
}

const DAY_LABELS_SHORT = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const DAY_LABELS_LONG  = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM']

function toLocalMidnight(iso: string) {
    const d = new Date(iso)
    return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function isSameDay(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
}

function toLocalKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function useEventMap(events: CalendarEvent[]) {
    return useMemo(() => {
        const map = new Map<string, CalendarEvent[]>()
        events.forEach(ev => {
            const key = toLocalKey(toLocalMidnight(ev.date))
            if (!map.has(key)) map.set(key, [])
            map.get(key)!.push(ev)
        })
        return map
    }, [events])
}

// ── Mini 14-day strip ─────────────────────────────────────────────────────────
function MiniStrip({
    events,
    eventMap,
    today,
    onExpand,
}: {
    events: CalendarEvent[]
    eventMap: Map<string, CalendarEvent[]>
    today: Date
    onExpand: () => void
}) {
    // Start from Monday of current week so day labels align
    const startOfWeek = useMemo(() => {
        const d = new Date(today)
        const dow = (today.getDay() + 6) % 7  // 0=Mon … 6=Sun
        d.setDate(today.getDate() - dow)
        return d
    }, [today])

    const days = useMemo(() =>
        Array.from({ length: 14 }, (_, i) => {
            const d = new Date(startOfWeek)
            d.setDate(startOfWeek.getDate() + i)
            return d
        })
    , [startOfWeek])

    // Month label covers span of the 14-day window
    const lastDay = days[days.length - 1]
    const monthLabel = startOfWeek.getMonth() !== lastDay.getMonth()
        ? startOfWeek.toLocaleDateString('es-CO', { month: 'short' }).toUpperCase() +
          ' · ' +
          lastDay.toLocaleDateString('es-CO', { month: 'short' }).toUpperCase()
        : startOfWeek.toLocaleDateString('es-CO', { month: 'long' }).toUpperCase()

    const upcoming = events
        .filter(ev => toLocalMidnight(ev.date) >= today)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 3)

    return (
        <div className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white p-3.5">
            {/* Header */}
            <div className="flex justify-between items-baseline mb-3">
                <span className="font-heading font-black italic uppercase text-xl leading-none">{monthLabel}</span>
                <div className="flex items-center gap-3">
                    <span className="font-mono text-[9px] tracking-widest uppercase font-bold opacity-50">PRÓX. 14 DÍAS</span>
                    <button
                        onClick={onExpand}
                        className="font-mono text-[9px] tracking-widest uppercase font-bold text-primary hover:underline cursor-pointer"
                    >
                        VER MES ↗
                    </button>
                </div>
            </div>

            {/* Day-of-week labels — always Mon-Sun, grid now aligned */}
            <div className="grid grid-cols-7 gap-1 mb-1">
                {DAY_LABELS_SHORT.map((d, i) => (
                    <div key={i} className="font-mono text-[9px] tracking-widest text-center font-bold opacity-50">{d}</div>
                ))}
            </div>

            {/* 14-day grid */}
            <div className="grid grid-cols-7 gap-1">
                {days.map((d, i) => {
                    const isToday = isSameDay(d, today)
                    const isPast = d < today
                    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
                    const evs = eventMap.get(key) ?? []
                    const hasEv = evs.length > 0

                    return (
                        <div
                            key={i}
                            title={hasEv ? evs.map(e => e.title).join(', ') : undefined}
                            className={`aspect-square border-2 border-black relative flex items-center justify-center font-heading font-black italic text-sm leading-none transition-colors ${
                                isToday
                                    ? 'bg-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                                    : hasEv
                                    ? 'bg-primary text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer hover:bg-primary/80'
                                    : isPast
                                    ? 'bg-white text-black opacity-35'
                                    : 'bg-white text-black'
                            }`}
                        >
                            {d.getDate()}
                            {hasEv && !isToday && (
                                <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-black" />
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Upcoming events list */}
            {upcoming.length > 0 && (
                <div className="mt-3 pt-3 border-t-2 border-black space-y-1.5">
                    {upcoming.map(ev => {
                        const evDate = toLocalMidnight(ev.date)
                        const label = evDate.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }).toUpperCase()
                        return (
                            <Link key={ev.id} href={ev.href} className="flex items-center gap-1.5 group">
                                <span className="font-mono text-[9px] tracking-widest font-bold text-primary shrink-0">{label}</span>
                                <span className="w-1 h-1 bg-primary shrink-0" />
                                <span className="font-mono text-[9px] tracking-wider uppercase font-bold text-black group-hover:text-primary transition-colors truncate">
                                    {ev.title}
                                </span>
                            </Link>
                        )
                    })}
                </div>
            )}

            {upcoming.length === 0 && (
                <div className="mt-3 pt-3 border-t-2 border-black">
                    <p className="font-mono text-[9px] tracking-widest uppercase font-bold opacity-40 text-center">SIN EVENTOS PRÓXIMOS</p>
                </div>
            )}
        </div>
    )
}

// ── Full month view ───────────────────────────────────────────────────────────
function MonthView({
    eventMap,
    today,
    onCollapse,
}: {
    eventMap: Map<string, CalendarEvent[]>
    today: Date
    onCollapse: () => void
}) {
    const [offset, setOffset] = useState(0)

    const viewDate = new Date(today.getFullYear(), today.getMonth() + offset, 1)
    const year = viewDate.getFullYear()
    const month = viewDate.getMonth()
    const monthName = viewDate
        .toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
        .toUpperCase()

    // Monday-based grid
    const firstDow = (viewDate.getDay() + 6) % 7
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells: (number | null)[] = [
        ...Array<null>(firstDow).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ]
    while (cells.length % 7 !== 0) cells.push(null)

    return (
        <div className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white overflow-hidden">
            {/* Month navigation header */}
            <div className="bg-black text-white px-4 py-2.5 flex items-center justify-between border-b-2 border-black">
                <button
                    onClick={() => setOffset(o => o - 1)}
                    aria-label="Mes anterior"
                    className="w-7 h-7 border-2 border-white/20 hover:border-secondary hover:text-secondary transition-colors flex items-center justify-center cursor-pointer shrink-0"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-heading font-black italic uppercase text-base leading-none text-center">{monthName}</span>
                <button
                    onClick={() => setOffset(o => o + 1)}
                    aria-label="Mes siguiente"
                    className="w-7 h-7 border-2 border-white/20 hover:border-secondary hover:text-secondary transition-colors flex items-center justify-center cursor-pointer shrink-0"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>

            <div className="p-2.5">
                {/* Day labels */}
                <div className="grid grid-cols-7 gap-0.5 mb-1">
                    {DAY_LABELS_LONG.map(d => (
                        <div key={d} className="font-mono text-[8px] tracking-widest text-center font-bold opacity-40 py-0.5">{d}</div>
                    ))}
                </div>

                {/* Calendar cells */}
                <div className="grid grid-cols-7 gap-0.5">
                    {cells.map((day, i) => {
                        if (day === null) return <div key={`pad-${i}`} className="min-h-10" />

                        const cellDate = new Date(year, month, day)
                        const isToday = isSameDay(cellDate, today)
                        const key = toLocalKey(cellDate)
                        const evs = eventMap.get(key) ?? []
                        const hasEv = evs.length > 0

                        return (
                            <div
                                key={key}
                                className={`min-h-10 border-2 border-black p-0.5 ${
                                    isToday
                                        ? 'bg-black text-white'
                                        : hasEv
                                        ? 'bg-[#FFF7ED]'
                                        : 'bg-white'
                                }`}
                            >
                                <div className={`font-heading font-black italic text-sm leading-none mb-0.5 ${isToday ? 'text-white' : 'text-black'}`}>
                                    {day}
                                </div>
                                {evs.slice(0, 2).map(ev => (
                                    <Link key={ev.id} href={ev.href}>
                                        <div className="font-mono text-[7px] tracking-wider uppercase bg-primary text-white px-0.5 py-px truncate leading-tight mb-px hover:bg-primary/80 transition-colors block">
                                            {ev.title}
                                        </div>
                                    </Link>
                                ))}
                                {evs.length > 2 && (
                                    <div className="font-mono text-[7px] text-primary font-bold">+{evs.length - 2}</div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Footer actions */}
            <div className="border-t-2 border-black px-3 py-2 flex justify-between items-center bg-[#F5E6CB]">
                <button
                    onClick={() => setOffset(0)}
                    className="font-mono text-[9px] tracking-widest uppercase font-bold opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
                >
                    HOY
                </button>
                <button
                    onClick={onCollapse}
                    className="font-mono text-[9px] tracking-widest uppercase font-bold opacity-60 hover:opacity-100 transition-opacity cursor-pointer flex items-center gap-1"
                >
                    <CalendarDays className="w-3 h-3" /> MINI STRIP
                </button>
            </div>
        </div>
    )
}

// ── Public component ──────────────────────────────────────────────────────────
export function CommunityCalendar({ events }: { events: CalendarEvent[] }) {
    const [view, setView] = useState<'mini' | 'month'>('mini')
    const today = useMemo(() => {
        const d = new Date()
        return new Date(d.getFullYear(), d.getMonth(), d.getDate())
    }, [])
    const eventMap = useEventMap(events)

    if (view === 'month') {
        return <MonthView eventMap={eventMap} today={today} onCollapse={() => setView('mini')} />
    }

    return (
        <MiniStrip
            events={events}
            eventMap={eventMap}
            today={today}
            onExpand={() => setView('month')}
        />
    )
}
