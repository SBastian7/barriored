'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useCommunity } from '@/components/community/community-provider'
import { createClient } from '@/lib/supabase/client'
import { Skeleton } from '@/components/ui/skeleton'

const MapView = dynamic(() => import('@/components/map/map-view'), { ssr: false, loading: () => <Skeleton className="h-[calc(100vh-8rem)] w-full" /> })

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
    <div className="h-[calc(100vh-8rem)]">
      <MapView businesses={businesses} communitySlug={community.slug} />
    </div>
  )
}
