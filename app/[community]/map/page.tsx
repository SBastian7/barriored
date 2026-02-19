'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useCommunity } from '@/components/community/community-provider'
import { createClient } from '@/lib/supabase/client'
import { Skeleton } from '@/components/ui/skeleton'
import { Breadcrumbs } from '@/components/shared/breadcrumbs'

const MapView = dynamic(() => import('@/components/map/map-view'), { ssr: false, loading: () => <Skeleton className="h-[calc(100vh-12rem)] w-full" /> })

export default function MapPage() {
  const community = useCommunity()
  const supabase = createClient()
  const [businesses, setBusinesses] = useState<any[]>([])

  useEffect(() => {
    supabase
      .from('businesses')
      .select('id, name, slug, address, whatsapp, location, categories(name)')
      .eq('community_id', community.id)
      .eq('status', 'approved')
      .then(({ data }) => { if (data) setBusinesses(data) })
  }, [community.id, supabase])

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] md:h-[calc(100vh-4rem)]">
      <div className="px-4 py-3 bg-background border-b-4 border-black">
        <Breadcrumbs
          items={[
            { label: community.name, href: `/${community.slug}` },
            { label: 'Mapa', active: true }
          ]}
          className="mb-0"
        />
      </div>
      <div className="flex-1 relative">
        <MapView businesses={businesses} communitySlug={community.slug} />
      </div>
    </div>
  )
}
