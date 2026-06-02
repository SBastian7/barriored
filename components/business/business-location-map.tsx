'use client'

import dynamic from 'next/dynamic'

const LeafletMapDisplay = dynamic(
  () => import('./leaflet-map-display'),
  {
    ssr: false,
    loading: () => (
      <div className="h-full bg-[#EAE2D2] flex items-center justify-center">
        <p className="font-mono text-[11px] tracking-widest uppercase text-black/40">Cargando mapa...</p>
      </div>
    ),
  }
)

export function BusinessLocationMap({ lat, lng, name, address }: { lat: number; lng: number; name: string; address?: string | null }) {
  return <LeafletMapDisplay lat={lat} lng={lng} name={name} address={address} />
}
