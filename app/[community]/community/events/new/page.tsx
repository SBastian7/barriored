import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { PostForm } from '@/components/community/post-form'
import { Breadcrumbs } from '@/components/shared/breadcrumbs'
import { CalendarDays } from 'lucide-react'

export async function generateMetadata({ params }: { params: Promise<{ community: string }> }) {
    const { community: slug } = await params
    const supabase = await createClient()
    const { data: community } = await supabase
        .from('communities').select('name').eq('slug', slug).single()

    if (!community) return {}
    return { title: `Nuevo Evento en ${community.name} | BarrioRed` }
}

export default async function NewEventPage({ params }: { params: Promise<{ community: string }> }) {
    const { community: slug } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect(`/auth/login?returnUrl=/${slug}/community/events/new`)

    const { data: community } = await supabase
        .from('communities').select('id, name').eq('slug', slug).single()
    if (!community) notFound()

    return (
        <div className="container mx-auto max-w-2xl px-4 py-8 pb-24">
            <Breadcrumbs items={[
                { label: community.name, href: `/${slug}` },
                { label: 'Comunidad', href: `/${slug}/community` },
                { label: 'Eventos', href: `/${slug}/community/events` },
                { label: 'Nuevo Evento', active: true },
            ]} />

            <header className="mt-8 space-y-2">
                <div className="flex items-center gap-2 text-accent-foreground font-black uppercase tracking-[0.2em] text-xs">
                    <CalendarDays className="h-4 w-4" />
                    Red Vecinal
                </div>
                <h1 className="text-4xl md:text-5xl font-heading font-black uppercase italic tracking-tighter leading-none">
                    Organizar <span className="text-accent not-italic">Evento</span>
                </h1>
                <p className="text-sm font-bold text-black/60 italic">Invita a tus vecinos a una actividad colectiva.</p>
            </header>

            <PostForm type="event" communityId={community.id} communitySlug={slug} />
        </div>
    )
}
