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
            <Popup className="brutalist-popup">
              <div className="p-1 space-y-3 font-sans min-w-[200px]">
                <div className="border-b-2 border-black pb-2">
                  <Link href={`/${communitySlug}/business/${biz.slug}`} className="font-heading font-black uppercase italic text-lg hover:text-primary transition-colors block leading-tight no-underline text-black">
                    {biz.name}
                  </Link>
                  <p className="text-[10px] font-black uppercase tracking-widest text-black/50 mt-1">{biz.categories?.name}</p>
                </div>

                {biz.whatsapp && (
                  <a href={whatsappUrl(biz.whatsapp)} target="_blank" rel="noopener noreferrer" className="block w-full no-underline">
                    <Button size="sm" className="w-full bg-[#25D366] text-black border-2 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all font-black uppercase text-[10px] tracking-widest h-9">
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
