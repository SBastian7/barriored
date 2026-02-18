'use client'

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { whatsappUrl } from '@/lib/utils'
import { MessageCircle } from 'lucide-react'
import 'leaflet/dist/leaflet.css'

type Props = {
  businesses: any[]
  communitySlug: string
}

export default function MapView({ businesses, communitySlug }: Props) {
  // Center on Parque Industrial, Pereira
  const center: [number, number] = [4.8133, -75.6961]

  const markers = businesses.filter((b) => {
    const loc = b.location as any
    return loc?.coordinates?.[0] && loc?.coordinates?.[1]
  })

  return (
    <MapContainer center={center} zoom={15} className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {markers.map((biz) => {
        const loc = biz.location as any
        return (
          <Marker key={biz.id} position={[loc.coordinates[1], loc.coordinates[0]]}>
            <Popup>
              <div className="text-sm">
                <Link href={`/${communitySlug}/business/${biz.slug}`} className="font-semibold text-blue-600 hover:underline">
                  {biz.name}
                </Link>
                <p className="text-gray-500">{biz.categories?.name}</p>
                {biz.address && <p className="text-xs">{biz.address}</p>}
                {biz.whatsapp && (
                  <a href={whatsappUrl(biz.whatsapp)} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" className="mt-2 bg-green-600 hover:bg-green-700 w-full">
                      <MessageCircle className="h-3 w-3 mr-1" /> WhatsApp
                    </Button>
                  </a>
                )}
              </div>
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}
