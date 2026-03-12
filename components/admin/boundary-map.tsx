// @ts-nocheck - Pre-existing admin file with type inference issues
'use client'

import { useEffect, useState } from 'react'
import type { GeoJSONPolygon } from '@/lib/types/database'

interface Props {
  center: [number, number]
  initialBoundary: GeoJSONPolygon | null
  onPolygonCreated: (e: any) => void
  onPolygonEdited: (e: any) => void
  onPolygonDeleted: () => void
}

export function BoundaryMap({
  center,
  initialBoundary,
  onPolygonCreated,
  onPolygonEdited,
  onPolygonDeleted,
}: Props) {
  const [MapComponents, setMapComponents] = useState<any>(null)
  const [isClient, setIsClient] = useState(false)

  // Ensure we're on the client
  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!isClient) return

    let mounted = true

    async function loadLeaflet() {
      try {
        // 1. Import and initialize Leaflet FIRST
        const LeafletModule = await import('leaflet')
        const L = LeafletModule.default || LeafletModule

        // Make Leaflet available globally for leaflet-draw and other plugins
        if (typeof window !== 'undefined') {
          ;(window as any).L = L
        }

        // Configure Leaflet icons
        if ((L as any).Icon && (L as any).Icon.Default) {
          delete ((L as any).Icon.Default.prototype as any)._getIconUrl
          ;(L as any).Icon.Default.mergeOptions({
            iconRetinaUrl: '/leaflet/marker-icon-2x.png',
            iconUrl: '/leaflet/marker-icon.png',
            shadowUrl: '/leaflet/marker-shadow.png',
          })
        }

        // 2. Import CSS files
        await import('leaflet/dist/leaflet.css')

        // 3. Import leaflet-draw (this extends the global L object)
        // We do this after L is on window
        await import('leaflet-draw')
        await import('leaflet-draw/dist/leaflet.draw.css')

        // 4. Now import react-leaflet components (after Leaflet and leaflet-draw are ready)
        // We import them sequentially to be safer with dependencies
        const reactLeaflet = await import('react-leaflet')
        const reactLeafletDraw = await import('react-leaflet-draw')

        if (mounted) {
          setMapComponents({
            MapContainer: reactLeaflet.MapContainer,
            TileLayer: reactLeaflet.TileLayer,
            FeatureGroup: reactLeaflet.FeatureGroup,
            GeoJSON: reactLeaflet.GeoJSON,
            EditControl: reactLeafletDraw.EditControl,
          })
        }
      } catch (error) {
        console.error('Error loading map components:', error)
      }
    }

    loadLeaflet()

    return () => {
      mounted = false
    }
  }, [isClient])

  if (!MapComponents) {
    return (
      <div className="h-[600px] border-2 border-black bg-muted flex items-center justify-center">
        <p className="text-muted-foreground">Inicializando editor de límites...</p>
      </div>
    )
  }

  const { MapContainer, TileLayer, FeatureGroup, GeoJSON, EditControl } = MapComponents

  return (
    <MapContainer
      center={center}
      zoom={14}
      className="h-[600px] border-2 border-black"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <FeatureGroup>
        <EditControl
          position="topright"
          onCreated={onPolygonCreated}
          onEdited={onPolygonEdited}
          onDeleted={onPolygonDeleted}
          draw={{
            rectangle: false,
            circle: false,
            circlemarker: false,
            marker: false,
            polyline: false,
            polygon: {
              allowIntersection: false,
              showArea: true,
              shapeOptions: {
                color: '#E53E3E',
                weight: 3,
                opacity: 0.8,
                fillOpacity: 0.1,
              },
            },
          }}
          edit={{
            edit: false,
            remove: false,
          }}
        />

        {initialBoundary && (
          <GeoJSON
            data={{
              type: 'Feature',
              properties: {},
              geometry: initialBoundary,
            } as any}
            style={{
              color: '#E53E3E',
              weight: 3,
              opacity: 0.8,
              fillOpacity: 0.1,
            }}
          />
        )}
      </FeatureGroup>
    </MapContainer>
  )
}
