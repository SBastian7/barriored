import { createClient } from '@/lib/supabase/server'
import { notFound }     from 'next/navigation'
import type { PublicService } from '@/lib/types'
import { ServicesPageClient } from '@/components/community/services-page-client'

export async function generateMetadata({ params }: { params: Promise<{ community: string }> }) {
    const { community: slug } = await params
    const supabase = await createClient()
    const { data: community } = await supabase
        .from('communities').select('name').eq('slug', slug).single<{ name: string }>()

    if (!community) return {}
    return { title: `Servicios y Emergencias · ${community.name} | BarrioRed` }
}

export default async function ServicesPage({
    params,
}: {
    params: Promise<{ community: string }>
}) {
    const { community: slug } = await params
    const supabase = await createClient()

    const { data: community } = await supabase
        .from('communities').select('id, name').eq('slug', slug).single<{ id: string; name: string }>()
    if (!community) notFound()

    const { data: servicesRes } = await supabase
        .from('public_services')
        .select('*')
        .eq('community_id', community.id)
        .eq('is_active', true)
        .in('category', ['emergency', 'health', 'utilities'])
        .order('category')
        .order('sort_order')

    const services = (servicesRes ?? []) as any as PublicService[]

    return (
        <div className="pb-24 md:pb-0">
            <ServicesPageClient
                services={services}
                communityName={community.name}
                communityId={community.id}
            />
        </div>
    )
}
