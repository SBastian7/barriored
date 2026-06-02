'use client'

import Link from 'next/link'
import { CalendarDays, Megaphone, MapPin, Heart, Share2, ArrowRight, Pin } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CommunityPost, EventMetadata } from '@/lib/types'

const TYPE_CONFIG = {
    event: {
        label: 'EVENTO',
        Icon: CalendarDays,
        coverBg: 'bg-accent',
        badgeBg: 'bg-accent text-white',
        defaultTime: '',
        defaultPlace: 'Ver detalles',
    },
    announcement: {
        label: 'ANUNCIO',
        Icon: Megaphone,
        coverBg: 'bg-primary',
        badgeBg: 'bg-primary text-white',
        defaultTime: 'VIGENTE',
        defaultPlace: 'TODO EL BARRIO',
    },
    promotion: {
        label: 'PROMO',
        Icon: Megaphone,
        coverBg: 'bg-[#F97316]',
        badgeBg: 'bg-[#F97316] text-white',
        defaultTime: '',
        defaultPlace: 'Ver detalles',
    },
}

function getDateParts(post: CommunityPost) {
    const metadata = post.metadata as Partial<EventMetadata>
    const src = metadata?.date ?? post.created_at
    const d = new Date(src)
    return {
        day: d.getDate().toString().padStart(2, '0'),
        month: d.toLocaleDateString('es-CO', { month: 'short' }).toUpperCase(),
        dayShort: d.toLocaleDateString('es-CO', { weekday: 'short' }).toUpperCase(),
        time: metadata?.date
            ? d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
            : 'ANUNCIO',
    }
}

export function CommunityEventCard({
    post,
    communitySlug,
    rot = 0,
}: {
    post: CommunityPost
    communitySlug: string
    rot?: number
}) {
    const cfg = TYPE_CONFIG[post.type] ?? TYPE_CONFIG.announcement
    const Icon = cfg.Icon
    const linkPath = post.type === 'event' ? 'events' : post.type === 'announcement' ? 'announcements' : 'promotions'
    const href = `/${communitySlug}/community/${linkPath}/${post.id}`
    const { day, month, dayShort, time } = getDateParts(post)
    const metadata = post.metadata as Partial<EventMetadata>
    const place = metadata?.location ?? cfg.defaultPlace
    const organizer = metadata?.organizer ?? post.profiles?.full_name ?? 'Vecino'

    return (
        <div
            className="br-rot h-full"
            style={{ '--rot': `${rot}deg`, transform: `rotate(${rot}deg)` } as React.CSSProperties}
        >
            <Link href={href} className="block h-full">
                <div className="border-3 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] bg-white hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[9px_9px_0px_0px_rgba(0,0,0,1)] transition-all overflow-hidden flex flex-col h-full cursor-pointer group">
                    {/* Cover */}
                    <div className={cn('relative aspect-video border-b-2 border-black overflow-hidden flex items-center justify-center', cfg.coverBg)}>
                        <div className="absolute inset-0 br-pattern-diag opacity-20" />
                        <Icon className="relative w-20 h-20 text-white opacity-30" strokeWidth={1.5} />

                        {/* Date stamp */}
                        <div className="absolute top-3 left-3 bg-white border-2 text-black border-black shadow-[2px_2px_0_black] px-2 py-1 text-center min-w-13">
                            <div className="font-mono text-[8px] tracking-widest uppercase font-bold leading-none">{month}</div>
                            <div className="font-heading font-black italic text-2xl leading-none">{day}</div>
                        </div>

                        {/* Badges */}
                        <div className="absolute top-3 right-3 flex flex-col gap-1.5 items-end">
                            <span className={cn('font-heading font-black text-[10px] uppercase tracking-wide px-2 py-0.5 border-2 border-black shadow-[1px_1px_0_black] flex items-center gap-1', cfg.badgeBg)}>
                                <Icon className="w-2.5 h-2.5" /> {cfg.label}
                            </span>
                            {post.is_pinned && (
                                <span className="font-heading font-black text-[10px] uppercase tracking-wide px-2 py-0.5 border-2 border-black shadow-[1px_1px_0_black] bg-secondary text-black flex items-center gap-1">
                                    <Pin className="w-2.5 h-2.5" /> FIJADO
                                </span>
                            )}
                        </div>

                        {/* Time strip */}
                        <div className="absolute bottom-0 left-0 right-0 bg-black text-white px-3 py-1.5 flex justify-between items-center">
                            <span className="font-mono text-[9px] tracking-widest text-secondary font-bold">◉ {dayShort} · {time}</span>
                            <span className="font-mono text-[9px] tracking-widest uppercase font-bold opacity-70">{post.type.toUpperCase()}</span>
                        </div>
                    </div>

                    {/* Body — explicit text-black so it doesn't inherit text-white from dark parent sections */}
                    <div className="p-4 flex flex-col gap-2 flex-1 text-black">
                        <h3 className="font-heading font-black italic uppercase text-lg leading-tight tracking-tight text-black group-hover:text-primary transition-colors line-clamp-2">
                            {post.title}
                        </h3>
                        <p className="text-sm text-black/60 line-clamp-2 leading-snug">{post.content}</p>

                        {place && place !== 'Ver detalles' && (
                            <div className="flex items-center gap-2 text-xs mt-auto pt-1">
                                <MapPin className="w-3 h-3 text-primary shrink-0" />
                                <span className="font-bold text-black truncate">{place}</span>
                            </div>
                        )}

                        <div className="flex items-center justify-between border-t-2 border-black pt-2.5 mt-1">
                            <span className="font-mono text-[9px] tracking-widest uppercase font-bold text-black truncate max-w-32">
                                POR {organizer.toUpperCase()}
                            </span>
                        </div>

                        <div className="flex gap-1.5 mt-1">
                            <span className="flex-1 bg-primary text-white border-2 border-black shadow-[2px_2px_0_black] font-heading font-black text-[10px] uppercase tracking-wide px-3 py-1.5 flex items-center justify-center gap-1 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_black] transition-all">
                                VER <ArrowRight className="w-2.5 h-2.5" />
                            </span>
                            <span className="bg-white text-black border-2 border-black shadow-[2px_2px_0_black] font-heading font-black text-[10px] uppercase px-2.5 py-1.5 flex items-center justify-center hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_black] transition-all">
                                <Heart className="w-3 h-3" />
                            </span>
                            <span className="bg-white text-black border-2 border-black shadow-[2px_2px_0_black] font-heading font-black text-[10px] uppercase px-2.5 py-1.5 flex items-center justify-center hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_black] transition-all">
                                <Share2 className="w-3 h-3" />
                            </span>
                        </div>
                    </div>
                </div>
            </Link>
        </div>
    )
}
