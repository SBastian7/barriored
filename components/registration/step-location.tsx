'use client'

import { useState, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { MapPin, LocateFixed, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import dynamic from 'next/dynamic'

const LocationPicker = dynamic(() => import('./location-picker'), { ssr: false })

type Props = { form: any; update: (v: any) => void; errors?: Record<string, string> }

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { 'Accept-Language': 'es' } }
    )
    const data = await res.json()
    if (data.display_name) {
      // Simplify: take first 3 parts of the address
      const parts = data.display_name.split(', ')
      return parts.slice(0, 3).join(', ')
    }
    return ''
  } catch {
    return ''
  }
}

export function StepLocation({ form, update, errors }: Props) {
  const [geocoding, setGeocoding] = useState(false)
  const [requestedGeo, setRequestedGeo] = useState(false)

  const handleMapChange = useCallback(async (lat: number, lng: number) => {
    update({ latitude: lat, longitude: lng })
    setRequestedGeo(false) // Reset so button can be clicked again
    // Auto-fill address from coordinates
    setGeocoding(true)
    const address = await reverseGeocode(lat, lng)
    if (address) {
      update({ latitude: lat, longitude: lng, address })
    }
    setGeocoding(false)
  }, [update])

  function requestGeolocation() {
    if (!navigator.geolocation) return
    setRequestedGeo(true)
  }

  return (
    <div className="space-y-6">
      {/* Locate me button */}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={requestGeolocation}
          className="flex-1 gap-2 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
        >
          <LocateFixed className="h-4 w-4" />
          <span className="font-bold uppercase text-xs tracking-wider">Usar mi ubicacion actual</span>
        </Button>
      </div>

      {/* Address */}
      <div>
        <Label className="text-xs font-black uppercase tracking-widest text-black/60 mb-2 block">
          Direccion *
        </Label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black/40" />
          <Input
            value={form.address}
            onChange={(e) => update({ address: e.target.value })}
            placeholder="Calle 1 #2-3, Parque Industrial"
            className={cn('pl-9', errors?.address && 'border-red-500')}
          />
          {geocoding && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />
          )}
        </div>
        {errors?.address && <p className="text-xs font-bold text-red-500 mt-1">{errors.address}</p>}
        <p className="text-xs text-black/40 font-bold mt-1">Se actualiza automaticamente al mover el marcador en el mapa.</p>
      </div>

      {/* Map */}
      <div>
        <Label className="text-xs font-black uppercase tracking-widest text-black/60 mb-2 block">
          Ubicacion en mapa *
        </Label>
        <p className="text-xs text-black/40 font-bold mb-3">
          Haz clic en el mapa o arrastra el marcador a la ubicacion de tu negocio.
        </p>
        <LocationPicker
          lat={form.latitude}
          lng={form.longitude}
          onChange={handleMapChange}
          requestGeolocation={requestedGeo}
        />
        <div className="flex gap-4 mt-2 text-xs text-black/30 font-bold">
          <span>Lat: {form.latitude.toFixed(5)}</span>
          <span>Lng: {form.longitude.toFixed(5)}</span>
        </div>
      </div>
    </div>
  )
}
