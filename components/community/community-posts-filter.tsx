'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CalendarDays } from 'lucide-react'
import { CommunityEventCard } from '@/components/community/community-event-card'
import { CommunityCalendar } from '@/components/community/community-calendar'
import type { CalendarEvent } from '@/components/community/community-calendar'
import type { CommunityPost } from '@/lib/types'

type FilterLabel = 'TODO' | 'EVENTOS' | 'ANUNCIOS' | 'TALLERES' | 'MERCADOS' | 'CONVOCATORIAS'

const FILTER_PILLS: FilterLabel[] = ['TODO', 'EVENTOS', 'ANUNCIOS', 'TALLERES', 'MERCADOS', 'CONVOCATORIAS']

function matchesFilter(post: CommunityPost, filter: FilterLabel): boolean {
    if (filter === 'TODO') return true
    if (filter === 'EVENTOS') return post.type === 'event'
    if (filter === 'ANUNCIOS') return post.type === 'announcement'
    return false
}

export function CommunityPostsFilter({
    posts,
    calendarEvents,
    communitySlug,
}: {
    posts: CommunityPost[]
    calendarEvents: CalendarEvent[]
    communitySlug: string
}) {
    const [activeFilter, setActiveFilter] = useState<FilterLabel>('TODO')

    const filtered = posts.filter(p => matchesFilter(p, activeFilter))
    const pinnedPosts = filtered.filter(p => p.is_pinned)
    const regularPosts = filtered.filter(p => !p.is_pinned)

    return (
        <>
            {/* ── FILTER PILLS + CALENDAR ── */}
            <section className="px-4 md:px-8 py-7 border-b-4 border-black">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 items-start">
                    <div className="border-2 border-black shadow-[4px_4px_0_black] bg-[#F5E6CB] p-5">
                        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                            <span className="font-mono text-[11px] tracking-widest uppercase font-bold">
                                FILTRAR · {filtered.length} PUBLICACIONES
                            </span>
                            <span className="font-mono text-[10px] tracking-widest uppercase opacity-50">
                                ORDENAR: PRÓXIMO PRIMERO ⇣
                            </span>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            {FILTER_PILLS.map((label) => (
                                <button
                                    key={label}
                                    onClick={() => setActiveFilter(label)}
                                    className={`font-heading font-black text-[11px] uppercase tracking-widest px-3 py-2 border-2 border-black shadow-[1px_1px_0_black] transition-all cursor-pointer ${
                                        activeFilter === label
                                            ? 'bg-primary text-white shadow-[2px_2px_0_black]'
                                            : 'bg-white text-black hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_black]'
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <CommunityCalendar events={calendarEvents} />
                </div>
            </section>

            {/* ── FIJADOS ── */}
            {pinnedPosts.length > 0 && (
                <section className="bg-black text-white border-b-4 border-black px-6 md:px-8 py-8">
                    <div className="flex justify-between items-end mb-6 flex-wrap gap-3">
                        <div>
                            <div className="font-mono text-[11px] tracking-widest uppercase text-secondary font-bold mb-1">
                                📌 EVENTOS DE INTERÉS
                            </div>
                            <h2 className="font-heading font-black italic uppercase tracking-tight leading-none text-[40px] md:text-[56px]">
                                NO TE LO <span className="text-primary">PIERDAS</span>
                            </h2>
                        </div>
                        <span className="inline-block px-4 py-1.5 bg-secondary border-2 border-black shadow-[2px_2px_0_black] font-heading font-black italic uppercase text-sm -rotate-[3deg]">
                            {pinnedPosts.length} ARRIBA
                        </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-5xl">
                        {pinnedPosts.slice(0, 4).map((post, i) => (
                            <CommunityEventCard
                                key={post.id}
                                post={post}
                                communitySlug={communitySlug}
                                rot={i % 2 === 0 ? -1 : 1}
                            />
                        ))}
                    </div>
                </section>
            )}

            {/* ── EVENTOS & ANUNCIOS PRÓXIMOS ── */}
            <section className="px-6 md:px-8 py-9">
                <div className="flex justify-between items-end mb-6 flex-wrap gap-3 max-w-5xl">
                    <h2 className="font-heading font-black italic uppercase tracking-tight leading-none text-[40px] md:text-[56px]">
                        {activeFilter === 'EVENTOS' ? 'EVENTOS' : activeFilter === 'ANUNCIOS' ? 'ANUNCIOS' : 'PUBLICACIONES'}{' '}
                        <span className="text-primary">
                            {activeFilter === 'EVENTOS' ? 'PRÓXIMOS' : 'RECIENTES'}
                        </span>
                    </h2>
                    <div className="flex gap-2">
                        <Link href={`/${communitySlug}/community/events`}>
                            <button className="inline-flex items-center gap-1.5 bg-black text-white border-2 border-black shadow-[2px_2px_0_black] font-mono text-[10px] tracking-widest uppercase font-bold px-3 py-2 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_black] transition-all cursor-pointer">
                                <CalendarDays className="w-3 h-3" /> VER EVENTOS
                            </button>
                        </Link>
                        <Link href={`/${communitySlug}/community/announcements`}>
                            <button className="inline-flex items-center gap-1.5 bg-white border-2 border-black shadow-[2px_2px_0_black] font-mono text-[10px] tracking-widest uppercase font-bold px-3 py-2 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_black] transition-all cursor-pointer">
                                VER ANUNCIOS
                            </button>
                        </Link>
                    </div>
                </div>

                {regularPosts.length === 0 ? (
                    <div className="text-center py-20 border-4 border-dashed border-black bg-white/50 flex flex-col items-center max-w-5xl">
                        <p className="text-2xl font-heading font-black uppercase italic text-black/30">Sin publicaciones aún</p>
                        <p className="font-bold text-black/50 mt-2">¡Sé el primero en compartir algo con el barrio!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl">
                        {regularPosts.map((post, i) => (
                            <CommunityEventCard
                                key={post.id}
                                post={post}
                                communitySlug={communitySlug}
                                rot={([-1, 0.5, -0.5, 1, 0, -0.5] as const)[i % 6]}
                            />
                        ))}
                    </div>
                )}

                <div className="flex justify-center gap-3 mt-8 flex-wrap">
                    {activeFilter !== 'ANUNCIOS' && (
                        <Link href={`/${communitySlug}/community/events`}>
                            <button className="inline-flex items-center gap-2 bg-primary text-white border-2 border-black shadow-[4px_4px_0_black] font-heading font-black uppercase tracking-widest text-sm px-7 py-3.5 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_black] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer">
                                VER TODOS LOS EVENTOS
                            </button>
                        </Link>
                    )}
                    {activeFilter !== 'EVENTOS' && (
                        <Link href={`/${communitySlug}/community/announcements`}>
                            <button className="inline-flex items-center gap-2 bg-white border-2 border-black shadow-[4px_4px_0_black] font-heading font-black uppercase tracking-widest text-sm px-7 py-3.5 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_black] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer">
                                VER TODOS LOS ANUNCIOS
                            </button>
                        </Link>
                    )}
                </div>
            </section>
        </>
    )
}
