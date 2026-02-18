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
    <div className="px-4 py-4 space-y-4">
      {description && <p className="text-gray-700">{description}</p>}
      <Separator />

      <div className="space-y-3">
        {address && (
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
            <span>{address}</span>
          </div>
        )}
        {phone && (
          <div className="flex items-center gap-3">
            <Phone className="h-5 w-5 text-gray-400" />
            <a href={`tel:${phone}`} className="text-blue-600">{phone}</a>
          </div>
        )}
        {website && (
          <div className="flex items-center gap-3">
            <Globe className="h-5 w-5 text-gray-400" />
            <a href={website} target="_blank" rel="noopener noreferrer" className="text-blue-600 truncate">{website}</a>
          </div>
        )}
      </div>

      {hours && Object.keys(hours).length > 0 && (
        <>
          <Separator />
          <div>
            <h3 className="font-semibold flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-gray-400" /> Horarios
            </h3>
            <div className="grid grid-cols-2 gap-1 text-sm">
              {Object.entries(hours).map(([day, h]) => (
                <div key={day} className="flex justify-between">
                  <span className="text-gray-500">{DAY_NAMES[day] ?? day}</span>
                  <span>{h.open} - {h.close}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
