'use client'

import dynamic from 'next/dynamic'

const LeafletBusinessesMap = dynamic(
  () => import('./leaflet-businesses-map').then(m => m.LeafletBusinessesMap),
  { ssr: false, loading: () => <div className="h-full w-full bg-muted animate-pulse" /> }
)

type BusinessMarker = {
  id: string
  name: string
  slug: string
  latitude: number
  longitude: number
  address: string | null
  communitySlug: string
}

export function BusinessesMap({ businesses }: { businesses: BusinessMarker[] }) {
  const mapped = businesses.filter(b => b.latitude && b.longitude)
  if (mapped.length === 0) return null

  return (
    <div className="border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden h-[320px] md:h-[400px]">
      <LeafletBusinessesMap businesses={mapped} />
    </div>
  )
}
