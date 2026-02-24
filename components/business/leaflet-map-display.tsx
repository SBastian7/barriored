'use client'

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import '@/lib/leaflet-icon-fix'

type Props = {
  lat: number
  lng: number
  name: string
  address?: string | null
}

export default function LeafletMapDisplay({ lat, lng, name, address }: Props) {
  return (
    <MapContainer center={[lat, lng]} zoom={16} className="h-full w-full" scrollWheelZoom={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[lat, lng]}>
        <Popup>
          <div className="font-bold text-sm">{name}</div>
          {address && <div className="text-xs text-gray-600 mt-1">{address}</div>}
        </Popup>
      </Marker>
    </MapContainer>
  )
}
