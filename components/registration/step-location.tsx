'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import dynamic from 'next/dynamic'

const LocationPicker = dynamic(() => import('./location-picker'), { ssr: false })

type Props = { form: any; update: (v: any) => void }

export function StepLocation({ form, update }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Direccion</Label>
        <Input value={form.address} onChange={(e) => update({ address: e.target.value })} placeholder="Calle 1 #2-3, Parque Industrial" />
      </div>
      <div>
        <Label>Ubicacion en mapa</Label>
        <p className="text-xs text-gray-500 mb-2">Arrastra el marcador a la ubicacion de tu negocio</p>
        <LocationPicker lat={form.latitude} lng={form.longitude} onChange={(lat: number, lng: number) => update({ latitude: lat, longitude: lng })} />
      </div>
    </div>
  )
}
