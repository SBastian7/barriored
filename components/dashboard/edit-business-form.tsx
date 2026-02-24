'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { PhoneInput } from '@/components/ui/phone-input'
import { HoursEditor } from '@/components/ui/hours-editor'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import {
  Save, Loader2, MapPin, LocateFixed, X, ImagePlus, Star,
  Store, Phone as PhoneIcon, Clock, Camera, ChevronRight
} from 'lucide-react'

const LocationPicker = dynamic(() => import('@/components/registration/location-picker'), { ssr: false })

type TabKey = 'info' | 'contact' | 'location' | 'photos'

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'info', label: 'Info', icon: <Store className="h-4 w-4" /> },
  { key: 'contact', label: 'Contacto', icon: <PhoneIcon className="h-4 w-4" /> },
  { key: 'location', label: 'Ubicacion', icon: <MapPin className="h-4 w-4" /> },
  { key: 'photos', label: 'Fotos', icon: <Camera className="h-4 w-4" /> },
]

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { 'Accept-Language': 'es' } }
    )
    const data = await res.json()
    if (data.display_name) {
      const parts = data.display_name.split(', ')
      return parts.slice(0, 3).join(', ')
    }
    return ''
  } catch {
    return ''
  }
}

export function EditBusinessForm({ business }: { business: any }) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabKey>('info')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [geocoding, setGeocoding] = useState(false)
  const [requestedGeo, setRequestedGeo] = useState(false)

  // Extract lat/lng from PostGIS geography
  const location = business.location as any
  const initialLat = location?.coordinates?.[1] ?? 4.8133
  const initialLng = location?.coordinates?.[0] ?? -75.6961

  const [form, setForm] = useState({
    name: business.name ?? '',
    description: business.description ?? '',
    address: business.address ?? '',
    phone: business.phone ?? '',
    whatsapp: business.whatsapp ?? '',
    email: business.email ?? '',
    website: business.website ?? '',
    hours: (business.hours as Record<string, { open: string; close: string }>) ?? {},
    photos: (business.photos as string[]) ?? [],
    latitude: initialLat,
    longitude: initialLng,
    main_photo_index: 0,
  })

  const update = useCallback((partial: Partial<typeof form>) => {
    setForm((prev) => ({ ...prev, ...partial }))
  }, [])

  const handleMapChange = useCallback(async (lat: number, lng: number) => {
    update({ latitude: lat, longitude: lng })
    setRequestedGeo(false) // Reset so button can be clicked again
    setGeocoding(true)
    const address = await reverseGeocode(lat, lng)
    if (address) {
      update({ latitude: lat, longitude: lng, address })
    }
    setGeocoding(false)
  }, [update])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (form.photos.length >= 5) { toast.error('Maximo 5 fotos'); return }
    if (file.size > 5 * 1024 * 1024) { toast.error('La imagen no debe pesar mas de 5MB'); return }

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Error al subir imagen'); return }
      update({ photos: [...form.photos, data.url] })
    } catch {
      toast.error('Error de conexion al subir imagen')
    } finally {
      setUploading(false)
    }
  }

  function removePhoto(index: number) {
    const newPhotos = form.photos.filter((_: string, i: number) => i !== index)
    let newMainIndex = form.main_photo_index
    if (index === form.main_photo_index) newMainIndex = 0
    else if (index < form.main_photo_index) newMainIndex = form.main_photo_index - 1
    update({ photos: newPhotos, main_photo_index: newPhotos.length > 0 ? newMainIndex : 0 })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Basic validation
    if (!form.name || form.name.trim().length < 2) {
      toast.error('El nombre debe tener al menos 2 caracteres')
      setActiveTab('info')
      return
    }
    if (form.whatsapp && !/^57[0-9]{10}$/.test(form.whatsapp)) {
      toast.error('WhatsApp: numero colombiano 57 + 10 digitos')
      setActiveTab('contact')
      return
    }

    setLoading(true)

    // Reorder photos so main photo is first
    const reorderedPhotos = [...form.photos]
    if (form.main_photo_index > 0 && form.main_photo_index < reorderedPhotos.length) {
      const [main] = reorderedPhotos.splice(form.main_photo_index, 1)
      reorderedPhotos.unshift(main)
    }

    const { main_photo_index, ...submitData } = {
      ...form,
      photos: reorderedPhotos,
    }

    const res = await fetch(`/api/businesses/${business.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submitData),
    })
    setLoading(false)

    if (!res.ok) {
      toast.error('Error actualizando negocio')
      return
    }
    toast.success('Negocio actualizado exitosamente')
    router.push('/dashboard')
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
      {/* Tab Navigation */}
      <div className="flex border-b-4 border-black overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-4 px-3 text-xs font-black uppercase tracking-widest transition-all border-r-2 border-black last:border-r-0 min-w-[80px]',
              activeTab === tab.key
                ? 'bg-primary text-white shadow-inner'
                : 'bg-white hover:bg-black/5 text-black/50'
            )}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-6 md:p-8 min-h-[400px]">
        {/* INFO TAB */}
        {activeTab === 'info' && (
          <div className="space-y-6">
            <div>
              <Label className="text-xs font-black uppercase tracking-widest text-black/60 mb-2 block">
                Nombre del negocio *
              </Label>
              <Input
                value={form.name}
                onChange={(e) => update({ name: e.target.value })}
                placeholder="Ej: Tienda Don Pedro"
              />
            </div>
            <div>
              <Label className="text-xs font-black uppercase tracking-widest text-black/60 mb-2 block">
                Descripcion
              </Label>
              <Textarea
                value={form.description}
                onChange={(e) => update({ description: e.target.value })}
                placeholder="Que ofrece tu negocio? Cuentale a tus vecinos..."
                rows={4}
              />
              <p className="text-xs text-black/30 font-bold mt-1 text-right">{form.description?.length ?? 0}/500</p>
            </div>

            {/* Hours */}
            <div>
              <Label className="text-xs font-black uppercase tracking-widest text-black/60 mb-3 block">
                <Clock className="h-3.5 w-3.5 inline mr-1.5" />
                Horario de atencion
              </Label>
              <HoursEditor
                value={form.hours ?? {}}
                onChange={(hours) => update({ hours })}
              />
            </div>
          </div>
        )}

        {/* CONTACT TAB */}
        {activeTab === 'contact' && (
          <div className="space-y-6">
            <div>
              <Label className="text-xs font-black uppercase tracking-widest text-black/60 mb-2 block">
                WhatsApp *
              </Label>
              <PhoneInput
                value={form.whatsapp}
                onChange={(v) => update({ whatsapp: v })}
                placeholder="300 123 4567"
              />
              <p className="text-xs text-black/40 font-bold mt-1">Este es tu boton de contacto principal.</p>
            </div>
            <div>
              <Label className="text-xs font-black uppercase tracking-widest text-black/60 mb-2 block">
                Telefono fijo (opcional)
              </Label>
              <PhoneInput
                value={form.phone}
                onChange={(v) => update({ phone: v })}
                placeholder="606 123 4567"
              />
            </div>
            <div>
              <Label className="text-xs font-black uppercase tracking-widest text-black/60 mb-2 block">
                Email (opcional)
              </Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => update({ email: e.target.value })}
                placeholder="tunegocio@email.com"
              />
            </div>
            <div>
              <Label className="text-xs font-black uppercase tracking-widest text-black/60 mb-2 block">
                Sitio web (opcional)
              </Label>
              <Input
                value={form.website}
                onChange={(e) => update({ website: e.target.value })}
                placeholder="https://minegocio.com"
              />
            </div>
          </div>
        )}

        {/* LOCATION TAB */}
        {activeTab === 'location' && (
          <div className="space-y-6">
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRequestedGeo(true)}
                className="flex-1 gap-2 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
              >
                <LocateFixed className="h-4 w-4" />
                <span className="font-bold uppercase text-xs tracking-wider">Usar mi ubicacion actual</span>
              </Button>
            </div>
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
                  className="pl-9"
                />
                {geocoding && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />
                )}
              </div>
              <p className="text-xs text-black/40 font-bold mt-1">Se actualiza automaticamente al mover el marcador.</p>
            </div>
            <div>
              <Label className="text-xs font-black uppercase tracking-widest text-black/60 mb-2 block">
                Ubicacion en mapa
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
        )}

        {/* PHOTOS TAB */}
        {activeTab === 'photos' && (
          <div className="space-y-6">
            <div>
              <Label className="text-xs font-black uppercase tracking-widest text-black/60 mb-3 block">
                Fotos del negocio (max 5)
              </Label>
              <p className="text-xs text-black/40 font-bold mb-4">
                La foto principal aparecera en el directorio. Haz clic en la estrella para elegirla.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {form.photos.map((url: string, i: number) => (
                <div
                  key={i}
                  className={cn(
                    'relative aspect-square border-2 border-black overflow-hidden group cursor-pointer transition-all',
                    i === form.main_photo_index
                      ? 'ring-4 ring-secondary shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
                      : 'shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
                  )}
                  onClick={() => update({ main_photo_index: i })}
                >
                  <Image src={url} alt={`Foto ${i + 1}`} fill className="object-cover" />
                  {i === form.main_photo_index && (
                    <div className="absolute top-0 left-0 bg-secondary text-black px-2 py-1 border-r-2 border-b-2 border-black">
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-current" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Principal</span>
                      </div>
                    </div>
                  )}
                  {i !== form.main_photo_index && (
                    <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 border border-black rounded-full p-1">
                      <Star className="h-3 w-3" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removePhoto(i) }}
                    className="absolute top-1 right-1 bg-red-500 text-white border-2 border-black p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {form.photos.length < 5 && (
                <label className={cn(
                  'aspect-square border-2 border-dashed border-black/30 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all',
                  uploading && 'opacity-50 pointer-events-none'
                )}>
                  <input type="file" accept="image/*" onChange={handleUpload} className="sr-only" disabled={uploading} />
                  {uploading ? (
                    <div className="flex flex-col items-center gap-1">
                      <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span className="text-[10px] font-bold text-black/40 uppercase">Subiendo...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <ImagePlus className="h-6 w-6 text-black/30" />
                      <span className="text-[10px] font-bold text-black/40 uppercase">Agregar</span>
                    </div>
                  )}
                </label>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Submit Bar */}
      <div className="border-t-4 border-black p-6 bg-muted/20">
        <Button
          type="submit"
          disabled={loading}
          className="w-full py-6 text-base gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="font-black uppercase tracking-wider">Guardando...</span>
            </>
          ) : (
            <>
              <Save className="h-5 w-5" />
              <span className="font-black uppercase tracking-wider">Guardar Cambios</span>
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
