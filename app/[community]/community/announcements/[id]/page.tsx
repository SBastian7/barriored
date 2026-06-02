import { createClient } from '@/lib/supabase/server'
import { PostEditActions } from '@/components/community/post-edit-actions'
import { SharePostButton } from '@/components/community/share-post-button'
import { ReportButton } from '@/components/shared/report-button'
import { CommunityEventCard } from '@/components/community/community-event-card'
import { NotificationCTACard } from '@/components/community/notification-cta-card'
import { Megaphone, Pin, Users, Calendar, ArrowLeft } from 'lucide-react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { CommunityPost } from '@/lib/types'

export async function generateMetadata({ params }: { params: Promise<{ community: string; id: string }> }) {
    const { id } = await params
    const supabase = await createClient()
    const { data: post } = await supabase
        .from('community_posts').select('title, content').eq('id', id).single<{ title: string; content: string }>()
    if (!post) return {}
    return {
        title: `${post.title} | Anuncio | BarrioRed`,
        description: post.content.substring(0, 160)
    }
}

export default async function AnnouncementDetailPage({
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

    if (!postRes || postRes.status !== 'approved' || postRes.type !== 'announcement') return notFound()

    const post = postRes as any as CommunityPost

    let isAuthor = false
    let isAdmin = false

    if (user) {
        isAuthor = post.author_id === user.id
        const { data: profile } = await supabase
            .from('profiles').select('role').eq('id', user.id).single<{ role: string }>()
        isAdmin = profile?.role === 'admin'
    }

    // Related announcements
    const { data: relatedRes } = await supabase
        .from('community_posts')
        .select('*, profiles(full_name, avatar_url)')
        .eq('community_id', community.id)
        .eq('status', 'approved')
        .eq('type', 'announcement')
        .neq('id', id)
        .order('created_at', { ascending: false })
        .limit(2)
    const related = (relatedRes ?? []) as any as CommunityPost[]

    const shareUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://barriored.co'}/${slug}/community/announcements/${id}`
    const publishedDate = new Date(post.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()
    const publishedDay = new Date(post.created_at).getDate().toString().padStart(2, '0')
    const publishedMonth = new Date(post.created_at).toLocaleDateString('es-CO', { month: 'short' }).toUpperCase()
    const authorName = post.profiles?.full_name ?? 'Vecino'

    return (
        <div className="min-h-screen bg-background">

            {/* ── SPLIT HERO ── */}
            <section className="border-b-4 border-black">
                <div className="grid grid-cols-1 lg:grid-cols-2 min-h-105">
                    {/* Left slab: primary red */}
                    <div className="bg-primary text-white px-6 md:px-8 py-8 relative overflow-hidden">
                        <div className="absolute inset-0 br-pattern-diag opacity-18" />
                        <div className="relative">
                            {/* Breadcrumb */}
                            <div className="flex items-center gap-1.5 flex-wrap text-[9px] font-mono tracking-widest uppercase mb-5">
                                <Link href={`/${slug}`} className="opacity-70 hover:opacity-100 transition-opacity">INICIO</Link>
                                <span className="opacity-40">›</span>
                                <Link href={`/${slug}/community`} className="opacity-70 hover:opacity-100 transition-opacity">COMUNIDAD</Link>
                                <span className="opacity-40">›</span>
                                <Link href={`/${slug}/community/announcements`} className="opacity-70 hover:opacity-100 transition-opacity">ANUNCIOS</Link>
                                <span className="opacity-40">›</span>
                                <span className="bg-black text-secondary px-1.5 py-0.5 font-bold">
                                    {post.title.length > 20 ? post.title.slice(0, 18) + '…' : post.title}
                                </span>
                            </div>

                            {/* Badges */}
                            <div className="flex flex-wrap gap-2 mb-4">
                                <span className="font-heading font-black text-[10px] uppercase tracking-wide px-2.5 py-1 border-2 border-black/40 bg-white/20 text-white flex items-center gap-1.5 shadow-[1px_1px_0_black]">
                                    <Megaphone className="w-3 h-3" /> ANUNCIO
                                </span>
                                {post.is_pinned && (
                                    <span className="font-heading font-black text-[10px] uppercase tracking-wide px-2.5 py-1 border-2 border-black bg-secondary text-black flex items-center gap-1.5 shadow-[1px_1px_0_black]">
                                        <Pin className="w-3 h-3" /> DESTACADO
                                    </span>
                                )}
                            </div>

                            <h1 className="font-heading font-black italic uppercase tracking-tight leading-[0.88] text-[44px] md:text-[64px] text-white">
                                {post.title}
                            </h1>

                            {/* Actions */}
                            <div className="flex flex-wrap gap-2 mt-6">
                                <SharePostButton title={post.title} content={post.content} url={shareUrl} />
                                <ReportButton entityType="post" entityId={post.id} variant="outline" className="bg-transparent text-white border-white/50 hover:bg-white/10 hover:text-white" />
                                <PostEditActions
                                    postId={post.id}
                                    postType="announcement"
                                    communitySlug={slug}
                                    isAuthor={isAuthor}
                                    isAdmin={isAdmin}
                                    onDark
                                />
                            </div>
                        </div>
                    </div>

                    {/* Right poster: image or pattern + big icon */}
                    <div
                        className="relative border-t-4 lg:border-t-0 lg:border-l-4 border-black flex items-center justify-center min-h-55 overflow-hidden"
                        style={post.image_url ? { backgroundColor: '#000' } : { backgroundColor: '#F5E6CB' }}
                    >
                        {post.image_url ? (
                            <>
                                <img src={post.image_url} alt={post.title} className="absolute inset-0 w-full h-full object-cover opacity-80" />
                                <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/10 to-transparent" />
                            </>
                        ) : (
                            <>
                                <div className="absolute inset-0 br-pattern-checker opacity-35" />
                                <Megaphone className="w-36 h-36 text-black opacity-10" strokeWidth={1} />
                            </>
                        )}
                        {/* Date sticker */}
                        <span className="absolute bottom-4 right-4 inline-block px-3 py-1.5 bg-white border-2 border-black shadow-[2px_2px_0_black] font-heading font-black italic uppercase text-sm -rotate-[4deg]">
                            ★ {publishedMonth} {publishedDay}
                        </span>
                        {/* Corner stickers */}
                        <div className="absolute top-4 right-4 inline-block px-3 py-1 bg-secondary border-2 border-black shadow-[2px_2px_0_black] font-heading font-black italic uppercase text-xs rotate-6">
                            ANUNCIO
                        </div>
                        <div className="absolute bottom-4 left-4 inline-block px-3 py-1 bg-accent text-white border-2 border-black shadow-[2px_2px_0_black] font-heading font-black italic uppercase text-xs -rotate-[4deg]">
                            VIGENTE
                        </div>
                    </div>
                </div>

                {/* Meta strip */}
                <div className="grid grid-cols-2 md:grid-cols-4 border-t-2 border-black bg-background">
                    {([
                        ['PUBLICADO POR', authorName, Users],
                        ['PUBLICADO EL', publishedDate, Calendar],
                        ['TIPO', 'ANUNCIO COMUNITARIO', Megaphone],
                        ['ALCANCE', 'TODO EL BARRIO', Megaphone],
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
                    {/* EN RESUMEN / TLDR — only shown when content is long enough to be worth summarizing */}
                    {post.content.length > 200 && (
                        <div className="border-2 border-black shadow-[6px_6px_0_black] overflow-hidden">
                            <div className="bg-primary text-white px-4 py-2.5 flex justify-between items-center">
                                <span className="font-mono text-[10px] tracking-widest uppercase text-white font-bold">◉ EN RESUMEN</span>
                                <span className="font-mono text-[9px] tracking-widest uppercase opacity-70">LECTURA · 30 SEG</span>
                            </div>
                            <div className="p-6 md:p-8 bg-white">
                                <p className="text-xl font-heading font-black leading-snug text-black">
                                    {post.content.slice(0, 200)}…
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Full content */}
                    <div className="border-2 border-black shadow-[4px_4px_0_black] bg-white">
                        <div className="px-4 py-2.5 border-b-2 border-black">
                            <span className="font-mono text-[10px] tracking-widest uppercase font-bold opacity-60">DETALLE DEL ANUNCIO</span>
                        </div>
                        <div className="p-6 md:p-8">
                            <p className="text-base font-medium leading-relaxed whitespace-pre-wrap text-black">
                                {post.content}
                            </p>
                        </div>
                    </div>

                    {/* Verified + Vigencia cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="border-2 border-black shadow-[4px_4px_0_black] p-5 bg-[#FFEFD9]">
                            <div className="flex items-center gap-2.5 mb-2">
                                <div className="w-8 h-8 bg-[#16A34A] border-2 border-black flex items-center justify-center shrink-0">
                                    <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></svg>
                                </div>
                                <span className="font-heading font-black italic uppercase text-sm">VERIFICADO</span>
                            </div>
                            <p className="text-xs text-black/60 leading-relaxed">
                                Este anuncio fue confirmado por el equipo de BarrioRed.
                            </p>
                        </div>
                        <div className="border-2 border-black shadow-[4px_4px_0_black] p-5 bg-[#F5E6CB]">
                            <div className="flex items-center gap-2.5 mb-2">
                                <div className="w-8 h-8 bg-accent border-2 border-black flex items-center justify-center shrink-0">
                                    <Calendar className="w-4 h-4 text-white" />
                                </div>
                                <span className="font-heading font-black italic uppercase text-sm">VIGENCIA</span>
                            </div>
                            <p className="text-xs text-black/60 leading-relaxed">
                                Publicado el {publishedDate}. Aplica hasta nuevo aviso del organizador.
                            </p>
                        </div>
                    </div>

                    {/* WhatsApp share */}
                    <a
                        href={`https://wa.me/?text=${encodeURIComponent(`${post.title} - Anuncio en BarrioRed: ${shareUrl}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block border-2 border-black shadow-[4px_4px_0_black] bg-[#16A34A] text-white p-5 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_black] transition-all"
                    >
                        <div className="flex items-center gap-3">
                            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white shrink-0" xmlns="http://www.w3.org/2000/svg">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                            <div>
                                <div className="font-heading font-black italic uppercase text-base">COMPARTIR POR WHATSAPP</div>
                                <div className="text-sm text-white/80">Avisa a tus vecinos en los grupos del barrio</div>
                            </div>
                        </div>
                    </a>
                </div>

                {/* Right: sidebar */}
                <div className="flex flex-col gap-5 lg:sticky lg:top-6">
                    {/* Author card */}
                    <div className="border-2 border-black shadow-[4px_4px_0_black] overflow-hidden">
                        <div className="bg-black text-white px-4 py-2.5 flex justify-between items-center">
                            <span className="font-mono text-[10px] tracking-widest uppercase text-secondary font-bold">◉ PUBLICADO POR</span>
                            <span className="font-mono text-[9px] tracking-widest uppercase bg-primary text-white px-1.5 py-0.5 font-bold">VERIFICADO</span>
                        </div>
                        <div className="p-4 bg-white flex items-center gap-3">
                            <div className="w-12 h-12 bg-primary border-2 border-black flex items-center justify-center shrink-0 font-heading font-black italic text-white text-xl">
                                {authorName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div className="font-heading font-black italic uppercase text-base leading-tight">{authorName}</div>
                                <div className="font-mono text-[9px] tracking-widest uppercase opacity-60 mt-0.5">VECINO · {publishedDate}</div>
                            </div>
                        </div>
                    </div>

                    {/* Notifications panel — hidden when permission already granted */}
                    <NotificationCTACard />

                    {/* Community badge */}
                    <div className="border-2 border-black shadow-[2px_2px_0_black] p-4 bg-[#FFEFD9] flex gap-3 items-center">
                        <div className="w-10 h-10 bg-primary border-2 border-black flex items-center justify-center shrink-0">
                            <Users className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <div className="font-mono text-[10px] tracking-widest uppercase font-bold">INFORMACIÓN COMUNITARIA</div>
                            <div className="text-xs font-bold mt-0.5">Para toda la comunidad de {community.name}</div>
                        </div>
                    </div>

                    {/* Back link */}
                    <Link href={`/${slug}/community`}>
                        <button className="w-full inline-flex items-center justify-center gap-2 bg-white border-2 border-black shadow-[2px_2px_0_black] font-mono text-[10px] tracking-widest uppercase font-bold px-4 py-2.5 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_black] transition-all cursor-pointer">
                            <ArrowLeft className="w-3 h-3" /> VOLVER A COMUNIDAD
                        </button>
                    </Link>
                </div>
            </section>

            {/* ── RELATED ANNOUNCEMENTS ── */}
            {related.length > 0 && (
                <section className="px-4 md:px-8 py-8 border-t-4 border-black bg-[#F5E6CB]">
                    <div className="flex justify-between items-end mb-6 flex-wrap gap-3 max-w-5xl mx-auto">
                        <h2 className="font-heading font-black italic uppercase tracking-tight leading-none text-[36px] md:text-[44px]">
                            OTROS <span className="text-primary">ANUNCIOS</span>
                        </h2>
                        <Link href={`/${slug}/community/announcements`}>
                            <button className="inline-flex items-center gap-1.5 bg-white border-2 border-black shadow-[2px_2px_0_black] font-mono text-[10px] tracking-widest uppercase font-bold px-3 py-2 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_black] transition-all cursor-pointer">
                                VER HISTORIAL <ArrowLeft className="w-3 h-3 rotate-180" />
                            </button>
                        </Link>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-5xl mx-auto">
                        {related.map((ev, i) => (
                            <CommunityEventCard key={ev.id} post={ev} communitySlug={slug} rot={i === 0 ? -1 : 1} />
                        ))}
                    </div>
                </section>
            )}
        </div>
    )
}
