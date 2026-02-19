import { createClient } from '@/lib/supabase/server'
import { Breadcrumbs } from '@/components/shared/breadcrumbs'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { User, Pin, Megaphone, Calendar } from 'lucide-react'
import { notFound } from 'next/navigation'
import type { CommunityPost } from '@/lib/types'

export async function generateMetadata({ params }: { params: Promise<{ community: string; id: string }> }) {
    const { id } = await params
    const supabase = await createClient()
    const { data: post } = await supabase
        .from('community_posts').select('title, content').eq('id', id).single()

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

    const { data: community } = await supabase
        .from('communities').select('id, name').eq('slug', slug).single()
    if (!community) return notFound()

    const { data: postRes } = await supabase
        .from('community_posts')
        .select('*, profiles(full_name, avatar_url)')
        .eq('id', id)
        .single()

    if (!postRes || postRes.status !== 'approved' || postRes.type !== 'announcement') return notFound()

    const post = postRes as any as CommunityPost

    return (
        <div className="container mx-auto max-w-4xl px-4 py-8 pb-24">
            <Breadcrumbs items={[
                { label: community.name, href: `/${slug}` },
                { label: 'Comunidad', href: `/${slug}/community` },
                { label: 'Anuncios', href: `/${slug}/community/announcements` },
                { label: post.title, active: true },
            ]} />

            <article className="mt-8 space-y-8">
                <header className="space-y-6">
                    <div className="flex flex-wrap items-center gap-3">
                        <Badge variant="default" className="border-black border uppercase tracking-widest text-xs px-3 py-1 bg-primary text-white">
                            <Megaphone className="h-3.5 w-3.5 mr-2" /> Anuncio
                        </Badge>
                        {post.is_pinned && (
                            <Badge variant="outline" className="border-black border uppercase tracking-widest text-xs px-3 py-1 bg-yellow-200">
                                <Pin className="h-3.5 w-3.5 mr-2" /> Destacado
                            </Badge>
                        )}
                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-black/40 ml-auto">
                            <Calendar className="h-3.5 w-3.5" />
                            {new Date(post.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </div>
                    </div>

                    <h1 className="text-4xl md:text-6xl lg:text-7xl font-heading font-black uppercase italic tracking-tighter leading-[0.9] text-black">
                        {post.title}
                    </h1>

                    <div className="flex items-center gap-4 py-4 border-y-2 border-black/10">
                        <div className="w-12 h-12 border-2 border-black bg-accent/20 flex items-center justify-center overflow-hidden">
                            {post.profiles?.avatar_url ? (
                                <img src={post.profiles.avatar_url} alt={post.profiles.full_name} className="w-full h-full object-cover" />
                            ) : (
                                <User className="h-6 w-6 text-black/40" />
                            )}
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-black/40">Publicado por</p>
                            <p className="font-heading font-black text-xl uppercase italic leading-none">{post.profiles?.full_name ?? 'Vecino'}</p>
                        </div>
                    </div>
                </header>

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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-12">
                    <Card className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-none bg-accent/5">
                        <CardContent className="p-6">
                            <h3 className="font-heading font-black uppercase italic text-lg mb-2">Seguridad Vecinal</h3>
                            <p className="text-sm text-black/60">Esta publicación ha sido verificada por los moderadores de BarrioRed para garantizar la seguridad de la comunidad.</p>
                        </CardContent>
                    </Card>
                    <Card className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-none bg-secondary/5">
                        <CardContent className="p-6">
                            <h3 className="font-heading font-black uppercase italic text-lg mb-2">Compartir</h3>
                            <p className="text-sm text-black/60">Ayuda a tus vecinos compartiendo este anuncio en tus grupos de WhatsApp o redes sociales.</p>
                        </CardContent>
                    </Card>
                </div>
            </article>
        </div>
    )
}
