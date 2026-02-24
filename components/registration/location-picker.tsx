'use client'

import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import { useState, useEffect, useRef, useCallback } from 'react'
import 'leaflet/dist/leaflet.css'
import '@/lib/leaflet-icon-fix'

function DraggableMarker({ lat, lng, onChange }: { lat: number; lng: number; onChange: (lat: number, lng: number) => void }) {
  const [position, setPosition] = useState<[number, number]>([lat, lng])

  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng])
      onChange(e.latlng.lat, e.latlng.lng)
    },
  })

  useEffect(() => {
    setPosition([lat, lng])
  }, [lat, lng])

  return <Marker position={position} />
}

function FlyToLocation({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => {
    map.flyTo([lat, lng], map.getZoom())
  }, [lat, lng, map])
  return null
}

function LocateUser({ requestId, onLocate }: { requestId: number; onLocate: (lat: number, lng: number) => void }) {
  const map = useMap()
  const processedRef = useRef(0)

  useEffect(() => {
    if (requestId === 0 || requestId <= processedRef.current) return
    processedRef.current = requestId

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        onLocate(latitude, longitude)
        map.flyTo([latitude, longitude], 16)
      },
      (error) => {
        console.warn('Geolocation error:', error.message)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }, [requestId, map, onLocate])

  return null
}

type LocationPickerProps = {
  lat: number
  lng: number
  onChange: (lat: number, lng: number) => void
  requestGeolocation?: boolean
}

export default function LocationPicker({ lat, lng, onChange, requestGeolocation = false }: LocationPickerProps) {
  const [geoRequestId, setGeoRequestId] = useState(0)
  const prevRequestGeo = useRef(false)

  // Detect rising edge of requestGeolocation prop
  useEffect(() => {
    if (requestGeolocation && !prevRequestGeo.current) {
      setGeoRequestId((prev) => prev + 1)
    }
    prevRequestGeo.current = requestGeolocation
  }, [requestGeolocation])

  // Stable callback ref to avoid re-renders inside map
  const onLocateRef = useRef(onChange)
  onLocateRef.current = onChange
  const stableOnLocate = useCallback((lat: number, lng: number) => {
    onLocateRef.current(lat, lng)
  }, [])

  return (
    <div className="h-72 border-2 border-black overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      <MapContainer center={[lat, lng]} zoom={15} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <DraggableMarker lat={lat} lng={lng} onChange={onChange} />
        <FlyToLocation lat={lat} lng={lng} />
        <LocateUser requestId={geoRequestId} onLocate={stableOnLocate} />
      </MapContainer>
    </div>
  )
}
