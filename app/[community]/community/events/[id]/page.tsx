import { createClient } from '@/lib/supabase/server'
import { Breadcrumbs } from '@/components/shared/breadcrumbs'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { User, Pin, CalendarDays, MapPin, Clock, Share2 } from 'lucide-react'
import { notFound } from 'next/navigation'
import type { CommunityPost, EventMetadata } from '@/lib/types'

export async function generateMetadata({ params }: { params: Promise<{ community: string; id: string }> }) {
    const { id } = await params
    const supabase = await createClient()
    const { data: post } = await supabase
        .from('community_posts').select('title, content').eq('id', id).single()

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

    const { data: community } = await supabase
        .from('communities').select('id, name').eq('slug', slug).single()
    if (!community) return notFound()

    const { data: postRes } = await supabase
        .from('community_posts')
        .select('*, profiles(full_name, avatar_url)')
        .eq('id', id)
        .eq('community_id', community.id)
        .single()

    if (!postRes || postRes.status !== 'approved' || postRes.type !== 'event') return notFound()

    const post = postRes as any as CommunityPost
    const metadata = (post.metadata ?? {}) as Partial<EventMetadata>

    return (
        <div className="container mx-auto max-w-4xl px-4 py-8 pb-24">
            <Breadcrumbs items={[
                { label: community.name, href: `/${slug}` },
                { label: 'Comunidad', href: `/${slug}/community` },
                { label: 'Eventos', href: `/${slug}/community/events` },
                { label: post.title, active: true },
            ]} />

            <article className="mt-8 space-y-8">
                <header className="space-y-6">
                    <div className="flex flex-wrap items-center gap-3">
                        <Badge variant="default" className="border-black border uppercase tracking-widest text-xs px-3 py-1 bg-accent text-black">
                            <CalendarDays className="h-3.5 w-3.5 mr-2" /> Evento
                        </Badge>
                        {post.is_pinned && (
                            <Badge variant="outline" className="border-black border uppercase tracking-widest text-xs px-3 py-1 bg-yellow-200">
                                <Pin className="h-3.5 w-3.5 mr-2" /> Destacado
                            </Badge>
                        )}
                        <a
                            href={`https://wa.me/?text=${encodeURIComponent(`${post.title} - Evento en BarrioRed`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-black/40 ml-auto hover:text-black transition-colors"
                        >
                            <Share2 className="h-3.5 w-3.5" />
                            Compartir Evento
                        </a>
                    </div>

                    <h1 className="text-4xl md:text-6xl lg:text-7xl font-heading font-black uppercase italic tracking-tighter leading-[0.9] text-black">
                        {post.title}
                    </h1>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-6 border-y-2 border-black/10">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 border-2 border-black bg-accent/20 flex items-center justify-center overflow-hidden">
                                {post.profiles?.avatar_url ? (
                                    <img src={post.profiles.avatar_url} alt={post.profiles.full_name} className="w-full h-full object-cover" />
                                ) : (
                                    <User className="h-6 w-6 text-black/40" />
                                )}
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-black/40">Organizado por</p>
                                <p className="font-heading font-black text-xl uppercase italic leading-none">{post.profiles?.full_name ?? 'Vecino'}</p>
                            </div>
                        </div>

                        <div className="flex flex-col justify-center text-right md:items-end">
                            <p className="text-[10px] font-black uppercase tracking-widest text-black/40">Publicado el</p>
                            <p className="font-bold text-sm">{new Date(post.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        {post.image_url && (
                            <div className="relative aspect-video w-full border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                                <img
                                    src={post.image_url}
                                    alt={post.title}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        )}

                        <div className="bg-white border-4 border-black p-8 md:p-12 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                            <div className="prose prose-lg max-w-none text-black font-medium leading-relaxed whitespace-pre-wrap">
                                {post.content}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <Card className="border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-none bg-accent/10">
                            <CardContent className="p-6 space-y-6">
                                {metadata.date && (
                                <div className="space-y-4">
                                    <h3 className="font-heading font-black uppercase italic text-xl border-b-2 border-black pb-2">Cuándo</h3>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 border-2 border-black bg-white flex items-center justify-center">
                                                <CalendarDays className="h-4 w-4 text-primary" />
                                            </div>
                                            <span className="font-bold text-sm">
                                                {new Date(metadata.date).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 border-2 border-black bg-white flex items-center justify-center">
                                                <Clock className="h-4 w-4 text-primary" />
                                            </div>
                                            <span className="font-bold text-sm">
                                                {new Date(metadata.date).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                                                {metadata.end_date && ` - ${new Date(metadata.end_date).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                )}

                                {metadata.location && (
                                <div className="space-y-4">
                                    <h3 className="font-heading font-black uppercase italic text-xl border-b-2 border-black pb-2">Dónde</h3>
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 border-2 border-black bg-white flex items-center justify-center shrink-0">
                                            <MapPin className="h-4 w-4 text-primary" />
                                        </div>
                                        <span className="font-bold text-sm italic">
                                            {metadata.location}
                                        </span>
                                    </div>
                                </div>
                                )}

                                <Card className="border-2 border-black bg-white rounded-none">
                                    <CardContent className="p-4 text-[10px] font-black uppercase tracking-widest text-black/50 text-center italic">
                                        Evento abierto a la comunidad de {community.name}
                                    </CardContent>
                                </Card>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </article>
        </div>
    )
}
