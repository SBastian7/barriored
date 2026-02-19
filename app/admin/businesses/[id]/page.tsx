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
import { Breadcrumbs } from '@/components/shared/breadcrumbs'

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
    <div className="space-y-8">
      <Breadcrumbs
        items={[
          { label: 'Administración', href: '/admin/businesses' },
          { label: 'Negocios', href: '/admin/businesses' },
          { label: `Revisar: ${business.name}`, active: true }
        ]}
      />

      <Card className="border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-none overflow-hidden">
        <CardHeader className="border-b-4 border-black bg-muted">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-4xl font-heading font-black uppercase italic tracking-tighter">{business.name}</CardTitle>
              <p className="text-xs font-black uppercase tracking-widest text-black/50 italic mt-2">
                {business.categories?.name} — Registrado por: <span className="text-black">{business.profiles?.full_name}</span>
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
            <div className="flex gap-4 pt-6 mt-6 border-t-2 border-dashed border-black">
              <Button onClick={() => handleAction('approve')} disabled={loading} className="bg-green-500 hover:bg-green-600 border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-white font-black uppercase italic h-12 px-8">
                <CheckCircle className="h-5 w-5 mr-2" /> Aprobar Negocio
              </Button>
              <Button variant="destructive" onClick={() => handleAction('reject')} disabled={loading} className="border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-black uppercase italic h-12 px-8">
                <XCircle className="h-5 w-5 mr-2" /> Rechazar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
