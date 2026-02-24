import Image from 'next/image'
import { MapPin, Phone, Mail, Globe, Clock, Camera, Star } from 'lucide-react'

type Props = { form: any }

const DAY_LABELS: Record<string, string> = {
  lunes: 'Lun', martes: 'Mar', miercoles: 'Mie',
  jueves: 'Jue', viernes: 'Vie', sabado: 'Sab', domingo: 'Dom'
}

export function StepConfirmation({ form }: Props) {
  const mainPhoto = form.photos?.[form.main_photo_index ?? 0]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        {mainPhoto && (
          <div className="relative h-32 border-b-2 border-black">
            <Image src={mainPhoto} alt={form.name} fill className="object-cover" />
          </div>
        )}
        <div className="p-4">
          <h3 className="font-heading font-black text-xl uppercase italic tracking-tight">{form.name || 'Sin nombre'}</h3>
          <p className="text-sm text-black/60 mt-1 line-clamp-2">{form.description || 'Sin descripcion'}</p>
        </div>
      </div>

      {/* Details grid */}
      <div className="grid gap-2">
        {form.whatsapp && (
          <div className="flex items-center gap-3 border-2 border-black p-3 bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <Phone className="h-4 w-4 text-primary shrink-0" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-black/40">WhatsApp</p>
              <p className="font-bold text-sm">+{form.whatsapp}</p>
            </div>
          </div>
        )}
        {form.address && (
          <div className="flex items-center gap-3 border-2 border-black p-3 bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <MapPin className="h-4 w-4 text-primary shrink-0" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-black/40">Direccion</p>
              <p className="font-bold text-sm">{form.address}</p>
            </div>
          </div>
        )}
        {form.email && (
          <div className="flex items-center gap-3 border-2 border-black p-3 bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <Mail className="h-4 w-4 text-primary shrink-0" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-black/40">Email</p>
              <p className="font-bold text-sm">{form.email}</p>
            </div>
          </div>
        )}
        {form.website && (
          <div className="flex items-center gap-3 border-2 border-black p-3 bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <Globe className="h-4 w-4 text-primary shrink-0" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-black/40">Sitio web</p>
              <p className="font-bold text-sm">{form.website}</p>
            </div>
          </div>
        )}
        {Object.keys(form.hours ?? {}).length > 0 && (
          <div className="flex items-start gap-3 border-2 border-black p-3 bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <Clock className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-1">Horario</p>
              {Object.entries(form.hours).map(([day, h]: [string, any]) => (
                <p key={day} className="text-xs font-bold">
                  <span className="uppercase tracking-wider text-black/50 w-8 inline-block">{DAY_LABELS[day] || day}</span> {h.open} - {h.close}
                </p>
              ))}
            </div>
          </div>
        )}
        <div className="flex items-center gap-3 border-2 border-black p-3 bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          <Camera className="h-4 w-4 text-primary shrink-0" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-black/40">Fotos</p>
            <p className="font-bold text-sm">{form.photos?.length ?? 0} foto(s) subida(s)</p>
          </div>
        </div>
      </div>

      {/* Warning */}
      <div className="border-2 border-secondary bg-secondary/20 p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
        <p className="text-xs font-black uppercase tracking-wider text-black/70">
          <Star className="h-3 w-3 inline mr-1" />
          Tu negocio sera revisado por un administrador antes de aparecer en el directorio.
        </p>
      </div>
    </div>
  )
}
