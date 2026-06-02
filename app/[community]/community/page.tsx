import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AlertsBanner } from '@/components/community/alerts-banner'
import { CommunityCTA } from '@/components/community/community-cta'
import { CommunityPostsFilter } from '@/components/community/community-posts-filter'
import Link from 'next/link'
import { CalendarDays, Megaphone, Bell } from 'lucide-react'
import type { CommunityPost, CommunityAlert, AlertSeverity, EventMetadata } from '@/lib/types'
import type { CalendarEvent } from '@/components/community/community-calendar'

const SEVERITY_ORDER: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 }

const MARQUEE_ITEMS = [
    'ÚNETE A LA RED VECINAL',
    'PARQUE INDUSTRIAL PRESENTE',
    'TU BARRIO EN VIVO',
    'COMUNIDAD ACTIVA',
    'VECINOS CONECTADOS',
]

export async function generateMetadata({ params }: { params: Promise<{ community: string }> }) {
    const { community: slug } = await params
    const supabase = await createClient()
    const { data: community } = await supabase
        .from('communities').select('name').eq('slug', slug).single<{ name: string }>()
    if (!community) return {}
    return { title: `Red Vecinal ${community.name} | BarrioRed` }
}

export default async function CommunityHubPage({ params }: { params: Promise<{ community: string }> }) {
    const { community: slug } = await params
    const supabase = await createClient()

    const { data: community } = await supabase
        .from('communities')
        .select('id, name, municipality, cover_image_url')
        .eq('slug', slug)
        .single<{ id: string; name: string; municipality: string; cover_image_url: string | null }>()

    if (!community) notFound()

    const [alertsRes, postsRes] = await Promise.all([
        supabase.from('community_alerts')
            .select('*')
            .eq('community_id', community.id)
            .eq('is_active', true)
            .order('created_at', { ascending: false }),

        supabase.from('community_posts')
            .select('*, profiles(full_name, avatar_url)')
            .eq('community_id', community.id)
            .eq('status', 'approved')
            .in('type', ['event', 'announcement'])
            .order('is_pinned', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(12),
    ])

    const alerts = ((alertsRes.data ?? []) as any as CommunityAlert[])
        .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
    const posts = (postsRes.data ?? []) as any as CommunityPost[]
    const eventsCount = posts.filter(p => p.type === 'event').length

    const calendarEvents: CalendarEvent[] = posts
        .filter(p => p.type === 'event')
        .map(p => ({
            id: p.id,
            title: p.title,
            date: (p.metadata as Partial<EventMetadata>)?.date ?? p.created_at,
            href: `/${slug}/community/events/${p.id}`,
        }))

    const hasCover = !!community.cover_image_url

    return (
        <div className="min-h-screen bg-background">

            {/* ── HERO ── */}
            <section
                className={`relative overflow-hidden border-b-4 border-black px-6 md:px-8 py-8 md:py-10 ${hasCover ? '' : 'bg-background'}`}
                style={hasCover ? { backgroundImage: `url(${community.cover_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
            >
                {hasCover ? (
                    <div className="absolute inset-0 bg-black/65 pointer-events-none" />
                ) : (
                    <>
                        <div className="absolute inset-0 br-pattern-diag opacity-35" />
                        {/* Decorative circle */}
                        <div className="absolute -top-16 -right-16 w-72 h-72 bg-accent border-4 border-black rounded-full shadow-[-10px_10px_0_black] pointer-events-none" />
                        {/* Decorative square */}
                        <div className="absolute top-16 right-16 w-20 h-20 bg-secondary border-4 border-black rotate-10 shadow-[4px_4px_0_black] pointer-events-none hidden md:block" />
                    </>
                )}

                <div className="relative max-w-5xl">
                    <div className="flex gap-2 items-center mt-1 flex-wrap">
                        <span className="inline-block px-4 py-1.5 bg-secondary border-2 border-black shadow-[2px_2px_0_black] font-heading font-black italic uppercase text-sm -rotate-2 tracking-wide">
                            ✦ TU BARRIO EN VIVO
                        </span>
                        <span className="font-mono text-xs tracking-widest uppercase bg-black text-white px-2.5 py-1 font-bold">
                            {community.municipality?.toUpperCase() ?? 'COMUNIDAD'}
                        </span>
                    </div>

                    <h1 className="mt-4 font-heading font-black italic uppercase tracking-tighter leading-[0.86]">
                        <span className={`block text-[64px] md:text-[88px] lg:text-[108px] ${hasCover ? 'text-white' : ''}`}>RED</span>
                        <span className="block text-[64px] md:text-[88px] lg:text-[108px] text-primary ml-6 md:ml-8">VECINAL</span>
                    </h1>

                    <p className={`mt-4 max-w-xl text-base font-medium ${hasCover ? 'text-white/80' : 'text-black/80'}`}>
                        Conecta, comparte y cuida tu <strong>{community.name}</strong>. Eventos, anuncios y alertas hechos por y para los vecinos.
                    </p>

                    <div className="flex gap-2 mt-6 flex-wrap">
                        <Link href={`/${slug}/community/events/new`}>
                            <button className="inline-flex items-center gap-2 bg-primary text-white border-2 border-black shadow-[4px_4px_0_black] font-heading font-black uppercase tracking-widest text-sm px-5 py-3 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_black] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer">
                                <CalendarDays className="w-3.5 h-3.5" /> CREAR EVENTO
                            </button>
                        </Link>
                        <Link href={`/${slug}/community/announcements/new`}>
                            <button className="inline-flex items-center gap-2 bg-black text-white border-2 border-black shadow-[4px_4px_0_black] font-heading font-black uppercase tracking-widest text-sm px-5 py-3 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_black] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer">
                                <Megaphone className="w-3.5 h-3.5" /> PUBLICAR ANUNCIO
                            </button>
                        </Link>
                        <button className="inline-flex items-center gap-2 bg-secondary text-black border-2 border-black shadow-[4px_4px_0_black] font-heading font-black uppercase tracking-widest text-sm px-5 py-3 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_black] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer">
                            <Bell className="w-3.5 h-3.5" /> NOTIFÍCAME
                        </button>
                    </div>

                    {/* Stats chips */}
                    <div className="flex gap-2 mt-6 flex-wrap">
                        {([
                            [eventsCount.toString(), 'EVENTOS', 'bg-accent text-white'],
                            [alerts.length.toString(), 'ALERTAS', 'bg-primary text-white'],
                            ['30K', 'VECINOS', 'bg-secondary text-black'],
                        ] as const).map(([v, k, cls]) => (
                            <div key={k} className={`border-2 border-black shadow-[4px_4px_0_black] px-4 py-2 flex items-baseline gap-2.5 ${cls}`}>
                                <span className="font-heading font-black italic text-[28px] leading-none">{v}</span>
                                <span className="font-mono text-[11px] tracking-widest font-bold">{k}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── ALERTAS ── */}
            {alerts.length > 0 && <AlertsBanner alerts={alerts} />}

            <CommunityPostsFilter posts={posts} calendarEvents={calendarEvents} communitySlug={slug} />

            {/* ── MARQUEE ── */}
            <div className="bg-accent text-white border-t-4 border-b-4 border-black py-3 overflow-hidden">
                <div className="flex">
                    <div className="br-marquee-track flex shrink-0">
                        {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((text, i) => (
                            <span key={i} className="flex items-center gap-6 px-6 whitespace-nowrap">
                                <span className="font-heading font-black italic uppercase text-2xl">{text}</span>
                                <span className="text-secondary text-xl">✦</span>
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── CTA ── */}
            <CommunityCTA communitySlug={slug} />
        </div>
    )
}
