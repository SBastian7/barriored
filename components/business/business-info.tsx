import { MapPin, Clock, Phone, Globe } from 'lucide-react'
import { Separator } from '@/components/ui/separator'

type Props = {
  address: string | null
  phone: string | null
  email: string | null
  website: string | null
  hours: Record<string, { open: string; close: string }> | null
  description: string | null
}

const DAY_NAMES: Record<string, string> = {
  mon: 'Lunes', tue: 'Martes', wed: 'Miercoles', thu: 'Jueves',
  fri: 'Viernes', sat: 'Sabado', sun: 'Domingo',
}

export function BusinessInfo({ address, phone, email, website, hours, description }: Props) {
  return (
    <div className="p-8 space-y-10">
      {description && (
        <div className="relative">
          <div className="absolute -left-4 top-0 bottom-0 w-1 bg-primary" />
          <p className="text-xl font-medium leading-relaxed italic text-black/80">{description}</p>
        </div>
      )}

      <div className="grid gap-6">
        {address && (
          <div className="flex items-start gap-4 p-4 border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="bg-primary p-2 border-2 border-black -rotate-3">
              <MapPin className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest text-black/50">Dirección</span>
              <span className="font-bold">{address}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {phone && (
            <div className="flex items-center gap-4 p-4 border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="bg-secondary p-2 border-2 border-black rotate-3">
                <Phone className="h-5 w-5 text-black" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-black/50">Teléfono</span>
                <a href={`tel:${phone}`} className="font-black hover:text-primary transition-colors italic">{phone}</a>
              </div>
            </div>
          )}
          {website && (
            <div className="flex items-center gap-4 p-4 border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="bg-accent p-2 border-2 border-black -rotate-2">
                <Globe className="h-5 w-5 text-white" />
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-[10px] font-black uppercase tracking-widest text-black/50">Sitio Web</span>
                <a href={website} target="_blank" rel="noopener noreferrer" className="font-black hover:text-primary transition-colors italic truncate">{website.replace(/^https?:\/\//, '')}</a>
              </div>
            </div>
          )}
        </div>
      </div>

      {hours && Object.keys(hours).length > 0 && (
        <div className="border-4 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <h3 className="text-2xl font-heading font-black uppercase italic italic flex items-center gap-3 mb-6">
            <Clock className="h-6 w-6 text-primary" /> Horarios de Atención
          </h3>
          <div className="space-y-3">
            {Object.entries(hours).map(([day, h]) => (
              <div key={day} className="flex justify-between items-center border-b-2 border-black/5 pb-1 hover:bg-muted/30 transition-colors px-2">
                <span className="font-black uppercase tracking-tighter text-sm">{DAY_NAMES[day] ?? day}</span>
                <span className="font-mono font-bold bg-black text-white px-2 py-0.5 text-xs">{h.open} - {h.close}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
