import { createClient } from '@/lib/supabase/server'
import { Breadcrumbs } from '@/components/shared/breadcrumbs'
import { PostEditForm } from '@/components/community/post-edit-form'
import { notFound, redirect } from 'next/navigation'
import type { CommunityPost } from '@/lib/types'

export async function generateMetadata({ params }: { params: Promise<{ community: string; id: string }> }) {
    const { id } = await params
    const supabase = await createClient()
    const { data: post } = await supabase
        .from('community_posts').select('title').eq('id', id).single<{ title: string }>()

    if (!post) return {}
    return {
        title: `Editar: ${post.title} | BarrioRed`,
        description: 'Editar evento'
    }
}

export default async function EditEventPage({
    params,
}: {
    params: Promise<{ community: string; id: string }>
}) {
    const { community: slug, id } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const { data: community } = await supabase
        .from('communities').select('id, name').eq('slug', slug).single<{ id: string; name: string }>()
    if (!community) return notFound()

    const { data: postRes } = await supabase
        .from('community_posts')
        .select('*')
        .eq('id', id)
        .eq('community_id', community.id)
        .eq('type', 'event')
        .single<CommunityPost>()

    if (!postRes) return notFound()

    const post = postRes as any as CommunityPost

    // Check authorization
    let isAuthorized = false
    if (post.author_id === user.id) {
        isAuthorized = true
    } else {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single<{ role: string }>()
        if (profile?.role === 'admin') {
            isAuthorized = true
        }
    }

    if (!isAuthorized) return notFound()

    return (
        <div className="container mx-auto max-w-4xl px-4 py-8 pb-24">
            <Breadcrumbs items={[
                { label: community.name, href: `/${slug}` },
                { label: 'Comunidad', href: `/${slug}/community` },
                { label: 'Eventos', href: `/${slug}/community/events` },
                { label: post.title, href: `/${slug}/community/eventos/${post.id}` },
                { label: 'Editar', active: true },
            ]} />

            <div className="mt-8">
                <h1 className="text-4xl md:text-5xl font-heading font-black uppercase italic tracking-tighter leading-none">
                    Editar Evento
                </h1>

                <PostEditForm post={post} communitySlug={slug} />
            </div>
        </div>
    )
}
