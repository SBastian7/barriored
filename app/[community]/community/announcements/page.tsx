import { createClient } from '@/lib/supabase/server'
import { PostCard } from '@/components/community/post-card'
import { Breadcrumbs } from '@/components/shared/breadcrumbs'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PenSquare, Megaphone } from 'lucide-react'
import type { CommunityPost } from '@/lib/types'
import { notFound } from 'next/navigation'

export async function generateMetadata({ params }: { params: Promise<{ community: string }> }) {
    const { community: slug } = await params
    const supabase = await createClient()
    const { data: community } = await supabase
        .from('communities').select('name').eq('slug', slug).single()

    if (!community) return {}
    return { title: `Anuncios en ${community.name} | BarrioRed` }
}

export default async function AnnouncementsPage({ params }: { params: Promise<{ community: string }> }) {
    const { community: slug } = await params
    const supabase = await createClient()

    const { data: community } = await supabase
        .from('communities').select('id, name').eq('slug', slug).single()
    if (!community) notFound()

    const { data: postsRes } = await supabase
        .from('community_posts')
        .select('*, profiles(full_name, avatar_url)')
        .eq('community_id', community.id)
        .eq('status', 'approved')
        .eq('type', 'announcement')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })

    const posts = (postsRes ?? []) as any as CommunityPost[]

    return (
        <div className="container mx-auto max-w-5xl px-4 py-8 pb-24">
            <Breadcrumbs items={[
                { label: community.name, href: `/${slug}` },
                { label: 'Comunidad', href: `/${slug}/community` },
                { label: 'Anuncios', active: true },
            ]} />

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 mt-4">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-primary font-black uppercase tracking-[0.2em] text-xs">
                        <Megaphone className="h-4 w-4" />
                        Tablón de Vecinos
                    </div>
                    <h1 className="text-5xl md:text-7xl font-heading font-black uppercase tracking-tighter italic leading-none">
                        Anuncios <span className="text-primary not-italic">del Barrio</span>
                    </h1>
                </div>
                <Link href={`/${slug}/community/announcements/new`}>
                    <Button size="lg" className="h-14 px-8 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all font-black uppercase tracking-widest text-xs gap-2">
                        <PenSquare className="h-5 w-5" /> Publicar Anuncio
                    </Button>
                </Link>
            </div>

            {posts.length === 0 ? (
                <div className="text-center py-32 border-4 border-dashed border-black bg-white/50 flex flex-col items-center">
                    <div className="w-16 h-16 border-2 border-black bg-accent/20 flex items-center justify-center rotate-3 mb-6">
                        <Megaphone className="h-8 w-8 text-black/20" />
                    </div>
                    <p className="text-3xl font-heading font-black uppercase italic tracking-tighter text-black/40">No hay anuncios todavía</p>
                    <p className="font-bold text-black/60 mt-2 max-w-xs mx-auto">Comparte noticias, avisos o cualquier cosa relevante con tus vecinos.</p>
                    <Link href={`/${slug}/community/announcements/new`} className="mt-8">
                        <Button variant="outline" className="border-2 border-black">Publicar el primero</Button>
                    </Link>
                </div>
            ) : (
                <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                    {posts.map((post) => (
                        <PostCard key={post.id} post={post} communitySlug={slug} />
                    ))}
                </div>
            )}
        </div>
    )
}
