import { createClient } from '@/lib/supabase/server'
import { PostEditActions } from '@/components/community/post-edit-actions'
import { SharePostButton } from '@/components/community/share-post-button'
import { ReportButton } from '@/components/shared/report-button'
import { CommunityEventCard } from '@/components/community/community-event-card'
import { CalendarDays, MapPin, Clock, Users, Pin, ArrowLeft } from 'lucide-react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { CommunityPost, EventMetadata } from '@/lib/types'
import { EventAttendanceButtons } from '@/components/community/event-attendance-buttons'

export async function generateMetadata({ params }: { params: Promise<{ community: string; id: string }> }) {
    const { id } = await params
    const supabase = await createClient()
    const { data: post } = await supabase
        .from('community_posts').select('title, content').eq('id', id).single<{ title: string; content: string }>()
    if (!post) return {}
    return {
        title: `${post.title} | Evento | BarrioRed`,
        description: post.content.substring(0, 160)
    }
}

export default async function EventDetailPage({
    params,
}: {
    params: Promise<{ community: string; id: string }>
}) {
    const { community: slug, id } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    const { data: community } = await supabase
        .from('communities').select('id, name').eq('slug', slug).single<{ id: string; name: string }>()
    if (!community) return notFound()

    const { data: postRes } = await supabase
        .from('community_posts')
        .select('*, profiles(full_name, avatar_url)')
        .eq('id', id)
        .eq('community_id', community.id)
        .single<CommunityPost & { profiles: { full_name: string; avatar_url: string | null } | null }>()

    if (!postRes || postRes.status !== 'approved' || postRes.type !== 'event') return notFound()

    const post = postRes as any as CommunityPost
    const metadata = (post.metadata ?? {}) as Partial<EventMetadata>

    let isAuthor = false
    let isAdmin = false

    if (user) {
        isAuthor = post.author_id === user.id
        const { data: profile } = await supabase
            .from('profiles').select('role').eq('id', user.id).single<{ role: string }>()
        isAdmin = profile?.role === 'admin'
    }

    // Fetch attendance count and current user's status
    const { count: attendeeCount } = await (supabase as any)
        .from('event_attendees')
        .select('*', { count: 'exact', head: true })
        .eq('event_post_id', id)

    let isAttending = false
    if (user) {
        const { data: attendeeRow } = await (supabase as any)
            .from('event_attendees')
            .select('id')
            .eq('event_post_id', id)
            .eq('user_id', user.id)
            .single()
        isAttending = !!attendeeRow
    }

    // Related events
    const { data: relatedRes } = await supabase
        .from('community_posts')
        .select('*, profiles(full_name, avatar_url)')
        .eq('community_id', community.id)
        .eq('status', 'approved')
        .eq('type', 'event')
        .neq('id', id)
        .order('created_at', { ascending: false })
        .limit(3)
    const related = (relatedRes ?? []) as any as CommunityPost[]

    const shareUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://barriored.co'}/${slug}/community/events/${id}`
    const organizer = metadata.organizer ?? post.profiles?.full_name ?? 'Comunidad'
    const publishedDate = new Date(post.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()

    const eventDate = metadata.date ? new Date(metadata.date) : null
    const eventDay = eventDate ? eventDate.getDate().toString().padStart(2, '0') : '—'
    const eventMonth = eventDate ? eventDate.toLocaleDateString('es-CO', { month: 'short' }).toUpperCase() : '—'
    const eventDayShort = eventDate ? eventDate.toLocaleDateString('es-CO', { weekday: 'long' }).toUpperCase() : ''
    const eventTime = eventDate ? eventDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : ''
    const eventEndTime = metadata.end_date
        ? new Date(metadata.end_date).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
        : null

    return (
        <div className="min-h-screen bg-background">

            {/* ── SPLIT HERO ── */}
            <section className="border-b-4 border-black">
                <div className="grid grid-cols-1 lg:grid-cols-2 min-h-105">
                    {/* Left slab: accent blue */}
                    <div className="bg-accent text-white px-6 md:px-8 py-8 relative overflow-hidden">
                        <div className="absolute inset-0 br-pattern-diag opacity-18" />
                        <div className="relative">
                            {/* Breadcrumb */}
                            <div className="flex items-center gap-1.5 flex-wrap text-[9px] font-mono tracking-widest uppercase mb-5">
                                <Link href={`/${slug}`} className="opacity-70 hover:opacity-100 transition-opacity">INICIO</Link>
                                <span className="opacity-40">›</span>
                                <Link href={`/${slug}/community`} className="opacity-70 hover:opacity-100 transition-opacity">COMUNIDAD</Link>
                                <span className="opacity-40">›</span>
                                <Link href={`/${slug}/community/events`} className="opacity-70 hover:opacity-100 transition-opacity">EVENTOS</Link>
                                <span className="opacity-40">›</span>
                                <span className="bg-black text-secondary px-1.5 py-0.5 font-bold">
                                    {post.title.length > 20 ? post.title.slice(0, 18) + '…' : post.title}
                                </span>
                            </div>

                            {/* Badges */}
                            <div className="flex flex-wrap gap-2 mb-4">
                                <span className="font-heading font-black text-[10px] uppercase tracking-wide px-2.5 py-1 border-2 border-black/40 bg-white/20 text-white flex items-center gap-1.5 shadow-[1px_1px_0_black]">
                                    <CalendarDays className="w-3 h-3" /> EVENTO
                                </span>
                                {post.is_pinned && (
                                    <span className="font-heading font-black text-[10px] uppercase tracking-wide px-2.5 py-1 border-2 border-black bg-secondary text-black flex items-center gap-1.5 shadow-[1px_1px_0_black]">
                                        <Pin className="w-3 h-3" /> DESTACADO
                                    </span>
                                )}
                                {metadata.organizer && (
                                    <span className="font-heading font-black text-[10px] uppercase tracking-wide px-2.5 py-1 border-2 border-black/30 bg-black/20 text-white shadow-[1px_1px_0_black]">
                                        {metadata.organizer}
                                    </span>
                                )}
                            </div>

                            <h1 className="font-heading font-black italic uppercase tracking-tight leading-[0.88] text-[44px] md:text-[64px] text-white">
                                {post.title}
                            </h1>

                            {/* Actions */}
                            <div className="flex flex-wrap gap-2 mt-6">
                                <SharePostButton title={post.title} content={post.content} url={shareUrl} />
                                <ReportButton entityType="post" entityId={post.id} variant="outline" className="border-white/50 text-white hover:bg-white/10 hover:text-white" />
                                <PostEditActions
                                    postId={post.id}
                                    postType="event"
                                    communitySlug={slug}
                                    isAuthor={isAuthor}
                                    isAdmin={isAdmin}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Right poster: event image or fallback pattern */}
                    <div className="relative border-t-4 lg:border-t-0 lg:border-l-4 border-black flex items-center justify-center min-h-55 overflow-hidden"
                        style={post.image_url ? { backgroundColor: '#000' } : { backgroundColor: '#F5E6CB' }}>
                        {post.image_url ? (
                            <>
                                <img src={post.image_url} alt={post.title} className="absolute inset-0 w-full h-full object-cover opacity-80" />
                                <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/10 to-transparent" />
                            </>
                        ) : (
                            <>
                                <div className="absolute inset-0 br-pattern-checker opacity-35" />
                                <CalendarDays className="w-40 h-40 text-black opacity-10" strokeWidth={1} />
                            </>
                        )}
                        {/* Date sticker */}
                        <span className="absolute bottom-4 right-4 inline-block px-4 py-1.5 bg-white border-2 border-black shadow-[2px_2px_0_black] font-heading font-black italic uppercase text-sm -rotate-[4deg]">
                            ★ {eventMonth} {eventDay}
                        </span>
                        {/* Day sticker */}
                        <div className="absolute top-4 right-4 inline-block px-3 py-1 bg-secondary border-2 border-black shadow-[2px_2px_0_black] font-heading font-black italic uppercase text-xs rotate-6">
                            {eventDayShort || 'EVENTO'}
                        </div>
                        {/* Time sticker */}
                        {eventTime && (
                            <div className="absolute bottom-4 left-4 inline-block px-3 py-1 bg-primary text-white border-2 border-black shadow-[2px_2px_0_black] font-heading font-black italic uppercase text-xs -rotate-[4deg]">
                                {eventTime}
                            </div>
                        )}
                    </div>
                </div>

                {/* Meta strip */}
                <div className="grid grid-cols-2 md:grid-cols-4 border-t-2 border-black bg-background">
                    {([
                        ['ORGANIZADO POR', organizer, Users],
                        ['PUBLICADO EL', publishedDate, CalendarDays],
                        ['FECHA DEL EVENTO', eventDate ? `${eventDay} ${eventMonth} ${eventDate.getFullYear()}` : 'POR CONFIRMAR', CalendarDays],
                        ['ALCANCE', 'TODO EL BARRIO', MapPin],
                    ] as const).map(([label, value, Icon], i) => (
                        <div key={label} className={`flex items-center gap-3 px-5 py-4 ${i < 3 ? 'border-b-2 md:border-b-0 md:border-r-2 border-black' : ''}`}>
                            <div className="w-9 h-9 bg-[#FFEFD9] border-2 border-black flex items-center justify-center shrink-0">
                                <Icon className="w-4 h-4" />
                            </div>
                            <div>
                                <div className="font-mono text-[9px] tracking-widest uppercase opacity-60 font-bold">{label}</div>
                                <div className="font-heading font-black italic uppercase text-sm leading-tight">{value}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── MAIN CONTENT ── */}
            <section className="px-4 md:px-8 py-8 grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-8 items-start max-w-6xl mx-auto">

                {/* Left: content */}
                <div className="flex flex-col gap-6">
                    {/* Description */}
                    <div className="border-2 border-black shadow-[6px_6px_0_black] bg-white">
                        <div className="bg-black text-white px-4 py-2.5 flex justify-between items-center">
                            <span className="font-mono text-[10px] tracking-widest uppercase text-secondary font-bold">◉ DESCRIPCIÓN</span>
                        </div>
                        <div className="p-6 md:p-8">
                            <p className="text-lg font-medium leading-relaxed whitespace-pre-wrap text-black">
                                {post.content}
                            </p>
                        </div>
                    </div>

                    {/* Verified + Community cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="border-2 border-black shadow-[4px_4px_0_black] p-5 bg-[#FFEFD9]">
                            <div className="flex items-center gap-2.5 mb-2">
                                <div className="w-8 h-8 bg-[#16A34A] border-2 border-black flex items-center justify-center shrink-0">
                                    <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></svg>
                                </div>
                                <span className="font-heading font-black italic uppercase text-sm">VERIFICADO POR MODERADORES</span>
                            </div>
                            <p className="text-xs text-black/60 leading-relaxed">
                                Este evento fue revisado el equipo de BarrioRed para garantizar información confiable.
                            </p>
                        </div>
                        <div className="border-2 border-black shadow-[4px_4px_0_black] p-5 bg-[#F5E6CB]">
                            <div className="flex items-center gap-2.5 mb-2">
                                <div className="w-8 h-8 bg-primary border-2 border-black flex items-center justify-center shrink-0">
                                    <Users className="w-4 h-4 text-white" />
                                </div>
                                <span className="font-heading font-black italic uppercase text-sm">EVENTO ABIERTO</span>
                            </div>
                            <p className="text-xs text-black/60 leading-relaxed">
                                Para toda la comunidad de {community.name}. ¡Tu asistencia fortalece el tejido vecinal!
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right: sidebar */}
                <div className="flex flex-col gap-5 lg:sticky lg:top-6">
                    {/* When + Where card */}
                    <div className="border-2 border-black shadow-[6px_6px_0_black] overflow-hidden">
                        <div className="bg-accent text-white px-4 py-2.5 flex justify-between items-center border-b-2 border-black">
                            <span className="font-mono text-[10px] tracking-widest uppercase text-white font-bold">◉ CUÁNDO + DÓNDE</span>
                            <span className="font-mono text-[9px] tracking-widest uppercase bg-black text-secondary px-1.5 py-0.5 font-bold">VERIFICADO</span>
                        </div>
                        <div className="p-5 bg-white flex flex-col gap-5">
                            {/* Date */}
                            {eventDate && (
                                <div className="grid grid-cols-[auto_1fr] gap-4 items-center">
                                    <div className="bg-black text-white px-3 py-2 text-center border-2 border-black shadow-[2px_2px_0_black]">
                                        <div className="font-mono text-[8px] tracking-widest uppercase text-secondary font-bold">{eventMonth}</div>
                                        <div className="font-heading font-black italic text-4xl leading-none">{eventDay}</div>
                                    </div>
                                    <div>
                                        <div className="font-heading font-black italic uppercase text-base leading-tight">{eventDayShort}</div>
                                        <div className="font-mono text-[10px] tracking-widest uppercase mt-1 font-bold opacity-70">
                                            ◷ {eventTime}{eventEndTime ? ` – ${eventEndTime}` : ''}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Location */}
                            {metadata.location && (
                                <div className="flex gap-3 items-start">
                                    <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                                    <div>
                                        <div className="font-heading font-black italic uppercase text-base leading-tight">{metadata.location}</div>
                                        <div className="font-mono text-[9px] tracking-widest uppercase mt-0.5 opacity-60">{community.name}</div>
                                    </div>
                                </div>
                            )}

                            <a
                                href={`https://maps.google.com/?q=${encodeURIComponent(metadata.location ?? community.name)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full inline-flex items-center justify-center gap-2 bg-white border-2 border-black shadow-[2px_2px_0_black] font-heading font-black uppercase tracking-widest text-xs px-4 py-2.5 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_black] transition-all"
                            >
                                <MapPin className="w-3 h-3" /> CÓMO LLEGAR
                            </a>
                        </div>
                    </div>

                    {/* Action panel */}
                    <div className="border-2 border-black shadow-[4px_4px_0_black] p-5 bg-secondary">
                        <div className="font-mono text-[11px] tracking-widest uppercase font-bold mb-2">SUMÁTE</div>
                        <div className="font-heading font-black italic uppercase text-xl leading-tight">
                            {eventDate
                                ? `${eventDate.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}`
                                : 'Evento próximo'
                            }
                        </div>
                        <div className="mt-4">
                            <EventAttendanceButtons
                                postId={post.id}
                                initialCount={attendeeCount ?? 0}
                                initialAttending={isAttending}
                                eventTitle={post.title}
                                eventContent={post.content}
                                eventDate={metadata.date ?? null}
                                eventLocation={metadata.location ?? null}
                            />
                        </div>
                    </div>

                    {/* Community badge */}
                    <div className="border-2 border-black shadow-[2px_2px_0_black] p-4 bg-[#FFEFD9] flex gap-3 items-center">
                        <div className="w-10 h-10 bg-primary border-2 border-black flex items-center justify-center shrink-0">
                            <Users className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <div className="font-mono text-[10px] tracking-widest uppercase font-bold">EVENTO ABIERTO</div>
                            <div className="text-xs font-bold mt-0.5">Para toda la comunidad de {community.name}</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── RELATED EVENTS ── */}
            {related.length > 0 && (
                <section className="px-4 md:px-8 py-8 border-t-4 border-black bg-[#F5E6CB]">
                    <div className="flex justify-between items-end mb-6 flex-wrap gap-3 max-w-5xl mx-auto">
                        <h2 className="font-heading font-black italic uppercase tracking-tight leading-none text-[36px] md:text-[44px]">
                            OTROS <span className="text-primary">EVENTOS</span>
                        </h2>
                        <Link href={`/${slug}/community/events`}>
                            <button className="inline-flex items-center gap-1.5 bg-white border-2 border-black shadow-[2px_2px_0_black] font-mono text-[10px] tracking-widest uppercase font-bold px-3 py-2 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_black] transition-all cursor-pointer">
                                VER TODOS <ArrowLeft className="w-3 h-3 rotate-180" />
                            </button>
                        </Link>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
                        {related.map((ev, i) => (
                            <CommunityEventCard key={ev.id} post={ev} communitySlug={slug} rot={([-1, 1, 0] as const)[i % 3]} />
                        ))}
                    </div>
                </section>
            )}
        </div>
    )
}
