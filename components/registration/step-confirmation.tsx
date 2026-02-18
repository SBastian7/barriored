import { Card, CardContent } from '@/components/ui/card'

type Props = { form: any }

export function StepConfirmation({ form }: Props) {
  return (
    <Card>
      <CardContent className="p-4 space-y-2 text-sm">
        <h3 className="font-semibold text-lg">{form.name}</h3>
        <p className="text-gray-600">{form.description}</p>
        <p><strong>WhatsApp:</strong> {form.whatsapp}</p>
        {form.phone && <p><strong>Telefono:</strong> {form.phone}</p>}
        {form.email && <p><strong>Email:</strong> {form.email}</p>}
        <p><strong>Direccion:</strong> {form.address}</p>
        <p><strong>Fotos:</strong> {form.photos.length}</p>
        <p className="text-amber-600 text-xs mt-4">
          Tu negocio sera revisado por un administrador antes de aparecer en el directorio.
        </p>
      </CardContent>
    </Card>
  )
}
