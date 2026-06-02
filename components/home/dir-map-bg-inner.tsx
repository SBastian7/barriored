'use client'

import { MapContainer, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

export default function DirMapBgInner() {
  return (
    <MapContainer
      center={[4.8133, -75.6961]}
      zoom={14}
      zoomControl={false}
      dragging={false}
      scrollWheelZoom={false}
      doubleClickZoom={false}
      touchZoom={false}
      keyboard={false}
      attributionControl={false}
      className="absolute inset-0 w-full h-full"
    >
      <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_matter/{z}/{x}/{y}{r}.png" />
    </MapContainer>
  )
}
