'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { whatsappUrl } from '@/lib/utils'
import { MessageCircle } from 'lucide-react'
import '@/lib/leaflet-icon-fix'

// Parque Industrial / Vía Combia, Pereira — derived from actual business coordinates
const COMMUNITY_BOUNDARY: [number, number][] = [
  [4.835, -75.748],
  [4.835, -75.710],
  [4.810, -75.710],
  [4.810, -75.748],
]

const COMMUNITY_CENTER: [number, number] = [4.823, -75.729]

function BoundsFitter({ boundary }: { boundary: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (boundary.length > 0) {
      map.fitBounds(L.latLngBounds(boundary), { padding: [30, 30] })
    }
  }, [boundary, map])
  return null
}

function MapCenterTracker({ onCenterChange }: { onCenterChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    moveend: (e) => {
      const c = e.target.getCenter()
      onCenterChange(c.lat, c.lng)
    },
  })
  return null
}

type Props = {
  businesses: any[]
  communitySlug: string
  onCenterChange?: (lat: number, lng: number) => void
  communityBoundary?: [number, number][]
  communityCenter?: [number, number]
}

export default function MapView({ businesses, communitySlug, onCenterChange, communityBoundary, communityCenter }: Props) {
  const boundary = communityBoundary?.length ? communityBoundary : COMMUNITY_BOUNDARY
  const center = communityCenter ?? COMMUNITY_CENTER

  const markers = businesses.filter((b) => {
    const loc = b.location as any
    const hasLoc = loc?.coordinates?.[0] != null && loc?.coordinates?.[1] != null
    const hasLatLng = b.latitude != null && b.longitude != null
    return hasLoc || hasLatLng
  })

  return (
    <MapContainer center={center} zoom={15} className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Fit map to community polygon */}
      <BoundsFitter boundary={boundary} />

      {/* Community boundary */}
      <Polygon
        positions={boundary}
        pathOptions={{ color: '#E11D48', weight: 2, fillColor: '#E11D48', fillOpacity: 0.06, dashArray: '6 4' }}
      />

      {/* Track map center changes */}
      {onCenterChange && <MapCenterTracker onCenterChange={onCenterChange} />}

      {/* Business markers */}
      {markers.map((biz) => {
        const loc = biz.location as any
        let lat: number, lng: number
        if (loc?.coordinates?.[0] != null && loc?.coordinates?.[1] != null) {
          lat = loc.coordinates[1]
          lng = loc.coordinates[0]
        } else {
          lat = biz.latitude
          lng = biz.longitude
        }
        return (
          <Marker key={biz.id} position={[lat, lng]}>
            <Popup className="brutalist-popup">
              <div className="p-1 space-y-3 font-sans min-w-50">
                <div className="border-b-2 border-black pb-2">
                  <Link href={`/${communitySlug}/business/${biz.slug}`} className="font-heading font-black uppercase italic text-lg hover:text-primary transition-colors block leading-tight no-underline text-black">
                    {biz.name}
                  </Link>
                  <p className="text-[10px] font-black uppercase tracking-widest text-black/50 mt-1">{biz.categories?.name}</p>
                </div>
                {biz.whatsapp && (
                  <a href={whatsappUrl(biz.whatsapp)} target="_blank" rel="noopener noreferrer" className="block w-full no-underline">
                    <Button size="sm" className="w-full bg-[#25D366] text-black border-2 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-px hover:-translate-y-px transition-all font-black uppercase text-[10px] tracking-widest h-9">
                      <MessageCircle className="h-4 w-4 mr-1.5 fill-current" /> WhatsApp
                    </Button>
                  </a>
                )}
                <Link href={`/${communitySlug}/business/${biz.slug}`} className="block w-full no-underline">
                  <Button variant="outline" size="sm" className="w-full border-2 border-black rounded-none font-black text-[10px] uppercase tracking-widest h-9 bg-white">Ver Perfil</Button>
                </Link>
              </div>
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}
