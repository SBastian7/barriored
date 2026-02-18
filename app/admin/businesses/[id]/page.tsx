'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import Image from 'next/image'

export default function AdminBusinessReviewPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()
  const [business, setBusiness] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase
      .from('businesses')
      .select('*, categories(name), profiles(full_name, phone)')
      .eq('id', id)
      .single()
      .then(({ data }) => setBusiness(data))
  }, [id, supabase])

  async function handleAction(action: 'approve' | 'reject') {
    setLoading(true)
    const res = await fetch(`/api/businesses/${id}/${action}`, { method: 'POST' })
    setLoading(false)
    if (res.ok) {
      toast.success(action === 'approve' ? 'Negocio aprobado' : 'Negocio rechazado')
      router.push('/admin/businesses')
    } else {
      toast.error('Error procesando accion')
    }
  }

  if (!business) return <p>Cargando...</p>

  return (
    <div>
      <Link href="/admin/businesses">
        <Button variant="ghost" size="sm" className="mb-4"><ArrowLeft className="h-4 w-4 mr-1" /> Volver</Button>
      </Link>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>{business.name}</CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                {business.categories?.name} | Registrado por: {business.profiles?.full_name}
              </p>
            </div>
            <Badge variant="secondary">{business.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {business.description && <p>{business.description}</p>}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <p><strong>WhatsApp:</strong> {business.whatsapp}</p>
            <p><strong>Telefono:</strong> {business.phone ?? 'N/A'}</p>
            <p><strong>Email:</strong> {business.email ?? 'N/A'}</p>
            <p><strong>Direccion:</strong> {business.address ?? 'N/A'}</p>
          </div>

          {business.photos?.length > 0 && (
            <div className="flex gap-2 overflow-x-auto">
              {business.photos.map((url: string, i: number) => (
                <Image key={i} src={url} alt={`Foto ${i + 1}`} width={200} height={150} className="rounded-lg object-cover" />
              ))}
            </div>
          )}

          {business.status === 'pending' && (
            <div className="flex gap-3 pt-4">
              <Button onClick={() => handleAction('approve')} disabled={loading} className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="h-4 w-4 mr-2" /> Aprobar
              </Button>
              <Button variant="destructive" onClick={() => handleAction('reject')} disabled={loading}>
                <XCircle className="h-4 w-4 mr-2" /> Rechazar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
