'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Navigation, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'

const LeafletMap = dynamic(
  () => import('./leaflet-map-display'),
  { ssr: false, loading: () => <div className="h-64 md:h-80 bg-muted animate-pulse flex items-center justify-center"><span className="text-black/30 font-bold text-sm uppercase tracking-widest">Cargando mapa...</span></div> }
)

function getDirectionsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`
}

export function LocationMap({ lat, lng, name, address }: { lat: number; lng: number; name: string; address?: string | null }) {
  return (
    <div className="p-4 md:p-8 space-y-4">
      <h3 className="text-2xl font-heading font-black uppercase italic tracking-tighter flex items-center gap-3">
        <MapPin className="h-6 w-6 text-primary" /> Ubicacion
      </h3>

      <div className="border-2 border-black overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="h-64 md:h-80">
          <LeafletMap lat={lat} lng={lng} name={name} address={address} />
        </div>
      </div>

      {/* Directions button */}
      <a
        href={getDirectionsUrl(lat, lng)}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        <Button
          type="button"
          className="w-full gap-3 py-5 bg-accent hover:bg-accent/90 text-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
        >
          <Navigation className="h-5 w-5" />
          <span className="font-black uppercase tracking-wider text-sm">Como llegar</span>
        </Button>
      </a>
    </div>
  )
}
