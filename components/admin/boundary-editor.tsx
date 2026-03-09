'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import dynamic from 'next/dynamic'
import { MapPin } from 'lucide-react'

// Import Leaflet types
import type { Map as LeafletMap, Layer } from 'leaflet'
import type { GeoJSONPolygon } from '@/lib/types/database'

// Dynamically import map to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
)
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
)
const FeatureGroup = dynamic(
  () => import('react-leaflet').then((mod) => mod.FeatureGroup),
  { ssr: false }
)

interface Props {
  communityId: string
  communityName: string
  municipality: string
  department: string
  initialBoundary: GeoJSONPolygon | null
}

export function BoundaryEditor({
  communityId,
  communityName,
  municipality,
  department,
  initialBoundary,
}: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [center, setCenter] = useState<[number, number]>([4.8133, -75.6881]) // Default Pereira
  const [boundary, setBoundary] = useState<GeoJSONPolygon | null>(
    initialBoundary
  )
  const mapRef = useRef<LeafletMap | null>(null)

  // Geocode municipality to get center
  useEffect(() => {
    async function geocode() {
      try {
        const query = `${municipality}, ${department}, Colombia`
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`
        )
        const data = await response.json()
        if (data && data[0]) {
          setCenter([parseFloat(data[0].lat), parseFloat(data[0].lon)])
        }
      } catch (error) {
        console.error('Geocoding error:', error)
      }
    }

    geocode()
  }, [municipality, department])

  async function handleSave() {
    if (!boundary) {
      toast({
        title: 'Error',
        description: 'Debes dibujar un límite primero',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`/api/admin/communities/${communityId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boundary }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al guardar')
      }

      toast({
        title: 'Límites guardados',
        description: 'El límite de la comunidad se ha guardado correctamente',
      })

      router.refresh()
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Error al guardar límites',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="brutalist-card p-6">
        <div className="flex items-start gap-4 mb-4">
          <MapPin className="h-5 w-5 text-primary mt-1" />
          <div>
            <h3 className="font-bold text-lg mb-1">
              Dibuja el límite de {communityName}
            </h3>
            <p className="text-sm text-muted-foreground">
              Usa la herramienta de polígono para dibujar el límite geográfico
              de la comunidad en el mapa.
            </p>
          </div>
        </div>

        {/* Map placeholder - will add drawing tools in next task */}
        <div className="border-2 border-black h-[600px] bg-background flex items-center justify-center">
          <p className="text-muted-foreground">
            Mapa con herramientas de dibujo (próximo paso)
          </p>
        </div>

        {boundary && (
          <div className="mt-4 text-sm text-muted-foreground">
            Límite definido con {boundary.coordinates[0].length} vértices
          </div>
        )}
      </div>

      <div className="flex gap-4">
        <Button
          onClick={handleSave}
          disabled={loading || !boundary}
          className="brutalist-button flex-1"
        >
          {loading ? 'Guardando...' : 'Guardar Límites'}
        </Button>
      </div>
    </div>
  )
}
