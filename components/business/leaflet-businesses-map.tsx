'use client'

import { useEffect } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

type BusinessMarker = {
  id: string
  name: string
  slug: string
  latitude: number
  longitude: number
  address: string | null
  communitySlug: string
}

const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
})

export function LeafletBusinessesMap({ businesses }: { businesses: BusinessMarker[] }) {
  useEffect(() => {
    const container = document.getElementById('businesses-map')
    if (!container || (container as any)._leaflet_id) return

    const valid = businesses.filter(b => b.latitude && b.longitude)
    if (valid.length === 0) return

    const avgLat = valid.reduce((s, b) => s + b.latitude, 0) / valid.length
    const avgLng = valid.reduce((s, b) => s + b.longitude, 0) / valid.length

    const map = L.map('businesses-map').setView([avgLat, avgLng], 15)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map)

    valid.forEach(b => {
      L.marker([b.latitude, b.longitude], { icon })
        .addTo(map)
        .bindPopup(
          `<div style="font-weight:bold;font-size:14px">${b.name}</div>` +
          (b.address ? `<div style="font-size:12px;color:#666">${b.address}</div>` : '') +
          `<a href="/${b.communitySlug}/business/${b.slug}" style="font-size:12px;color:#e11d48;font-weight:bold">Ver perfil →</a>`
        )
    })

    if (valid.length > 1) {
      const bounds = L.latLngBounds(valid.map(b => [b.latitude, b.longitude] as [number, number]))
      map.fitBounds(bounds, { padding: [30, 30] })
    }

    return () => { map.remove() }
  }, [businesses])

  return <div id="businesses-map" style={{ height: '100%', width: '100%' }} />
}
