import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Breadcrumbs } from '@/components/shared/breadcrumbs'
import { AlertsBanner } from '@/components/community/alerts-banner'
import { AnnouncementsSection } from '@/components/community/announcements-section'
import { EventsSection } from '@/components/community/events-section'
import { JobsSection } from '@/components/community/jobs-section'
import { ServicesSection } from '@/components/community/services-section'
import { CommunityCTA } from '@/components/community/community-cta'
import type { CommunityPost, CommunityAlert } from '@/lib/types'

export async function generateMetadata({ params }: { params: Promise<{ community: string }> }) {
    const { community: slug } = await params
    const supabase = await createClient()
    const { data: community } = await supabase
        .from('communities').select('name').eq('slug', slug).single()

    if (!community) return {}
    return { title: `Red Vecinal ${community.name} | BarrioRed` }
}

export default async function CommunityHubPage({ params }: { params: Promise<{ community: string }> }) {
    const { community: slug } = await params
    const supabase = await createClient()

    const { data: community } = await supabase
        .from('communities')
        .select('id, name')
        .eq('slug', slug)
        .single()

    if (!community) notFound()

    // Parallel data fetching for initial hub view
    const [alertsRes, announcementsRes, eventsRes, jobsRes] = await Promise.all([
        supabase.from('community_alerts')
            .select('*')
            .eq('community_id', community.id)
            .eq('is_active', true)
            .order('severity', { ascending: true })
            .order('created_at', { ascending: false }),

        supabase.from('community_posts')
            .select('*, profiles(full_name, avatar_url)')
            .eq('community_id', community.id)
            .eq('status', 'approved')
            .eq('type', 'announcement')
            .order('is_pinned', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(3),

        supabase.from('community_posts')
            .select('*, profiles(full_name, avatar_url)')
            .eq('community_id', community.id)
            .eq('status', 'approved')
            .eq('type', 'event')
            .order('created_at', { ascending: false })
            .limit(3),

        supabase.from('community_posts')
            .select('*, profiles(full_name, avatar_url)')
            .eq('community_id', community.id)
            .eq('status', 'approved')
            .eq('type', 'job')
            .order('created_at', { ascending: false })
            .limit(3),
    ])

    return (
        <div className="container mx-auto max-w-5xl px-4 py-8 pb-24 space-y-12">
            <Breadcrumbs
                items={[
                    { label: community.name, href: `/${slug}` },
                    { label: 'Comunidad', active: true },
                ]}
            />

            <header className="space-y-2">
                <h1 className="text-5xl md:text-7xl lg:text-8xl font-heading font-black uppercase tracking-tighter italic leading-none">
                    Red <span className="text-primary not-italic">Vecinal</span>
                </h1>
                <p className="text-lg md:text-xl font-bold text-black/60 uppercase tracking-widest max-w-2xl">
                    Conecta, comparte y cuida tu <span className="text-black">{community.name}</span>
                </p>
            </header>

            <div className="space-y-16">
                {/* Urgent Alerts First */}
                <AlertsBanner alerts={(alertsRes.data ?? []) as any} />

                {/* Content Sections */}
                <div className="grid gap-20">
                    <AnnouncementsSection posts={(announcementsRes.data ?? []) as any} communitySlug={slug} />
                    <EventsSection posts={(eventsRes.data ?? []) as any} communitySlug={slug} />
                    <JobsSection posts={(jobsRes.data ?? []) as any} communitySlug={slug} />
                    <ServicesSection communitySlug={slug} />
                </div>

                {/* Call to Action */}
                <CommunityCTA communitySlug={slug} />
            </div>
        </div>
    )
}
