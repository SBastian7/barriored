'use client'

import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import { useState } from 'react'
import 'leaflet/dist/leaflet.css'

function DraggableMarker({ lat, lng, onChange }: { lat: number; lng: number; onChange: (lat: number, lng: number) => void }) {
  const [position, setPosition] = useState<[number, number]>([lat, lng])

  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng])
      onChange(e.latlng.lat, e.latlng.lng)
    },
  })

  return <Marker position={position} />
}

export default function LocationPicker({ lat, lng, onChange }: { lat: number; lng: number; onChange: (lat: number, lng: number) => void }) {
  return (
    <div className="h-64 rounded-lg overflow-hidden">
      <MapContainer center={[lat, lng]} zoom={15} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <DraggableMarker lat={lat} lng={lng} onChange={onChange} />
      </MapContainer>
    </div>
  )
}
