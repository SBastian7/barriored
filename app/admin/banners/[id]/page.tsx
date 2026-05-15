'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, ArrowLeft, Image as ImageIcon, Clock, CheckCircle, XCircle, Pause, Play, Trash2, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { Breadcrumbs } from '@/components/shared/breadcrumbs'

interface BannerAd {
  id: string
  business_id: string
  title: string
  image_url: string
  placement: 'homepage' | 'directory'
  link_url: string | null
  status: 'requested' | 'active' | 'paused' | 'expired' | 'rejected'
  requested_at: string
  approved_at: string | null
  starts_at: string | null
  ends_at: string | null
  rejection_reason: string | null
  businesses: {
    name: string
    owner_id: string
    profiles: {
      full_name: string | null
      phone: string | null
    } | null
  } | null
}

const STATUS_CONFIG = {
  requested: {
    label: 'Pendiente',
    icon: Clock,
    variant: 'secondary' as const,
    color: 'text-secondary bg-secondary/10'
  },
  active: {
    label: 'Activo',
    icon: CheckCircle,
    variant: 'default' as const,
    color: 'text-primary bg-primary/10'
  },
  paused: {
    label: 'Pausado',
    icon: Pause,
    variant: 'secondary' as const,
    color: 'text-gray-600 bg-gray-50'
  },
  expired: {
    label: 'Expirado',
    icon: Clock,
    variant: 'outline' as const,
    color: 'text-gray-400 bg-gray-50'
  },
  rejected: {
    label: 'Rechazado',
    icon: XCircle,
    variant: 'destructive' as const,
    color: 'text-red-600 bg-red-50'
  }
}

export default function AdminBannerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const supabase = createClient()

  const [banner, setBanner] = useState<BannerAd | null>(null)
  const [loading, setLoading] = useState(true)
  const [showApproveForm, setShowApproveForm] = useState(false)
  const [showRejectForm, setShowRejectForm] = useState(false)

  // Approve form state
  const [approveData, setApproveData] = useState({
    starts_at: new Date().toISOString().split('T')[0],
    ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    amount: '',
    payment_method: 'manual_transfer'
  })

  // Reject form state
  const [rejectReason, setRejectReason] = useState('')

  const [showScheduleForm, setShowScheduleForm] = useState(false)
  const [scheduleData, setScheduleData] = useState({ starts_at: '', ends_at: '' })

  useEffect(() => {
    fetchBanner()
  }, [id])

  async function fetchBanner() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('banner_ads')
        .select(`
          *,
          businesses!inner(
            name,
            owner_id,
            profiles!businesses_owner_id_profiles_fkey(full_name, phone)
          )
        `)
        .eq('id', id)
        .single()

      if (error) throw error

      // Transform nested structure
      const transformedBanner = {
        ...data,
        businesses: {
          name: (data.businesses as any)?.name,
          owner_id: (data.businesses as any)?.owner_id,
          profiles: (data.businesses as any)?.profiles
        }
      }

      setBanner(transformedBanner)
    } catch (error) {
      console.error('Error fetching banner:', error)
      toast.error('Error al cargar banner')
      router.push('/admin/banners')
    } finally {
      setLoading(false)
    }
  }

  async function handleApproveBanner() {
    if (!approveData.amount) {
      toast.error('Ingresa el monto del pago')
      return
    }
    if (!approveData.starts_at || !approveData.ends_at) {
      toast.error('Ingresa las fechas de inicio y fin')
      return
    }
    if (new Date(approveData.ends_at) <= new Date(approveData.starts_at)) {
      toast.error('La fecha de fin debe ser posterior a la fecha de inicio')
      return
    }

    try {
      const res = await fetch(`/api/admin/banners/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startsAt: new Date(approveData.starts_at).toISOString(),
          endsAt: new Date(approveData.ends_at).toISOString(),
          paymentAmount: parseFloat(approveData.amount),
          paymentMethod: approveData.payment_method
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al aprobar banner')
      }

      toast.success('Banner aprobado exitosamente')
      setShowApproveForm(false)
      fetchBanner()
    } catch (err: any) {
      toast.error(err.message || 'Error al aprobar banner')
    }
  }

  async function handleRejectBanner() {
    if (!rejectReason.trim()) {
      toast.error('Ingresa la razón del rechazo')
      return
    }

    try {
      const res = await fetch(`/api/admin/banners/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'rejected',
          rejection_reason: rejectReason.trim()
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al rechazar banner')
      }

      toast.success('Banner rechazado')
      setShowRejectForm(false)
      fetchBanner()
    } catch (err: any) {
      toast.error(err.message || 'Error al rechazar banner')
    }
  }

  async function handlePauseBanner() {
    try {
      const res = await fetch(`/api/admin/banners/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paused' })
      })

      if (!res.ok) throw new Error('Error al pausar banner')

      toast.success('Banner pausado')
      fetchBanner()
    } catch (err) {
      toast.error('Error al pausar banner')
    }
  }

  async function handleResumeBanner() {
    try {
      const res = await fetch(`/api/admin/banners/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' })
      })

      if (!res.ok) throw new Error('Error al reanudar banner')

      toast.success('Banner reanudado')
      fetchBanner()
    } catch (err) {
      toast.error('Error al reanudar banner')
    }
  }

  async function handleDeleteBanner() {
    if (!confirm('¿Estás seguro de eliminar este banner? Esta acción no se puede deshacer.')) {
      return
    }

    try {
      const res = await fetch(`/api/admin/banners/${id}`, {
        method: 'DELETE'
      })

      if (!res.ok) throw new Error('Error al eliminar banner')

      toast.success('Banner eliminado')
      router.push('/admin/banners')
    } catch (err) {
      toast.error('Error al eliminar banner')
    }
  }

  async function handleUpdateSchedule() {
    if (!scheduleData.starts_at || !scheduleData.ends_at) {
      toast.error('Ingresa ambas fechas')
      return
    }
    if (new Date(scheduleData.ends_at) <= new Date(scheduleData.starts_at)) {
      toast.error('La fecha de fin debe ser posterior')
      return
    }
    try {
      const res = await fetch(`/api/admin/banners/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          starts_at: new Date(scheduleData.starts_at).toISOString(),
          ends_at: new Date(scheduleData.ends_at).toISOString(),
        })
      })
      if (!res.ok) throw new Error('Error al actualizar fechas')
      toast.success('Fechas actualizadas')
      setShowScheduleForm(false)
      fetchBanner()
    } catch (err) {
      toast.error('Error al actualizar fechas')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!banner) {
    return null
  }

  const statusInfo = STATUS_CONFIG[banner.status]
  const Icon = statusInfo.icon

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <Breadcrumbs
        items={[
          { label: 'Admin', href: '/admin' },
          { label: 'Banners', href: '/admin/banners' },
          { label: banner.title, active: true }
        ]}
      />

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-heading font-black uppercase tracking-tighter italic">
          Banner <span className="text-primary">Publicitario</span>
        </h1>
        <Link href="/admin/banners">
          <Button variant="outline" className="brutalist-button gap-2">
            <ArrowLeft className="w-4 h-4" />
            Volver
          </Button>
        </Link>
      </div>

      <div className="space-y-6">
        {/* Status Card */}
        <Card className={`brutalist-card border-4 ${statusInfo.color}`}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Icon className="w-12 h-12" />
              <div className="flex-1">
                <h2 className="font-black text-2xl uppercase tracking-widest mb-2">
                  {banner.title}
                </h2>
                <Badge variant={statusInfo.variant} className="border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  {statusInfo.label}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Full Banner Preview */}
        <Card className="brutalist-card">
          <CardHeader>
            <CardTitle className="font-black uppercase tracking-widest flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              Vista Previa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border-4 border-black overflow-hidden">
              <img
                src={banner.image_url}
                alt={banner.title}
                className="w-full"
              />
            </div>
            {banner.link_url && (
              <p className="text-sm text-gray-600 mt-4">
                <strong>URL de Destino:</strong>{' '}
                <a
                  href={banner.link_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline hover:no-underline"
                >
                  {banner.link_url}
                </a>
              </p>
            )}
          </CardContent>
        </Card>

        {/* Business & Info */}
        <Card className="brutalist-card">
          <CardHeader>
            <CardTitle className="font-black uppercase tracking-widest">
              Información
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs uppercase tracking-widest font-bold text-gray-600 mb-1">
                  Negocio
                </p>
                <p className="font-bold">{banner.businesses?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest font-bold text-gray-600 mb-1">
                  Propietario
                </p>
                <p className="font-bold">{banner.businesses?.profiles?.full_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest font-bold text-gray-600 mb-1">
                  Teléfono
                </p>
                <p className="font-bold">{banner.businesses?.profiles?.phone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest font-bold text-gray-600 mb-1">
                  Ubicación
                </p>
                <p className="font-bold">{banner.placement === 'homepage' ? 'Homepage' : 'Directorio'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest font-bold text-gray-600 mb-1">
                  Solicitado
                </p>
                <p className="font-bold">
                  {new Date(banner.requested_at).toLocaleDateString('es-CO', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              </div>
              {banner.approved_at && (
                <div>
                  <p className="text-xs uppercase tracking-widest font-bold text-gray-600 mb-1">
                    Aprobado
                  </p>
                  <p className="font-bold">
                    {new Date(banner.approved_at).toLocaleDateString('es-CO', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              )}
              {banner.starts_at && (
                <div>
                  <p className="text-xs uppercase tracking-widest font-bold text-gray-600 mb-1">
                    Fecha Inicio
                  </p>
                  <p className="font-bold">
                    {new Date(banner.starts_at).toLocaleDateString('es-CO', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              )}
              {banner.ends_at && (
                <div>
                  <p className="text-xs uppercase tracking-widest font-bold text-gray-600 mb-1">
                    Fecha Fin
                  </p>
                  <p className="font-bold">
                    {new Date(banner.ends_at).toLocaleDateString('es-CO', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              )}
            </div>
            {banner.rejection_reason && (
              <div className="pt-4 border-t-2 border-black">
                <p className="text-xs uppercase tracking-widest font-bold text-gray-600 mb-1">
                  Razón de Rechazo
                </p>
                <p className="text-sm">{banner.rejection_reason}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons - Requested */}
        {banner.status === 'requested' && (
          <div className="grid md:grid-cols-2 gap-4">
            {/* Approve Form */}
            <Card className="brutalist-card border-primary">
              <CardHeader>
                <CardTitle className="font-black uppercase tracking-widest text-sm flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Aprobar Banner
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!showApproveForm ? (
                  <Button
                    onClick={() => setShowApproveForm(true)}
                    className="brutalist-button bg-primary text-white hover:bg-primary/90 w-full"
                  >
                    Aprobar
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold uppercase tracking-widest mb-2 block">
                          Fecha Inicio
                        </label>
                        <input
                          type="date"
                          value={approveData.starts_at}
                          onChange={(e) => setApproveData({ ...approveData, starts_at: e.target.value })}
                          className="brutalist-input w-full"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold uppercase tracking-widest mb-2 block">
                          Fecha Fin
                        </label>
                        <input
                          type="date"
                          value={approveData.ends_at}
                          onChange={(e) => setApproveData({ ...approveData, ends_at: e.target.value })}
                          className="brutalist-input w-full"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase tracking-widest mb-2 block">
                        Monto (COP)
                      </label>
                      <input
                        type="number"
                        value={approveData.amount}
                        onChange={(e) => setApproveData({ ...approveData, amount: e.target.value })}
                        placeholder="30000"
                        className="brutalist-input w-full"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase tracking-widest mb-2 block">
                        Método de Pago
                      </label>
                      <select
                        value={approveData.payment_method}
                        onChange={(e) => setApproveData({ ...approveData, payment_method: e.target.value })}
                        className="brutalist-input w-full"
                      >
                        <option value="manual_transfer">Transferencia Manual</option>
                        <option value="nequi">Nequi</option>
                        <option value="cash">Efectivo</option>
                      </select>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        onClick={handleApproveBanner}
                        className="brutalist-button bg-primary text-white hover:bg-primary/90 flex-1"
                      >
                        Confirmar
                      </Button>
                      <Button
                        onClick={() => setShowApproveForm(false)}
                        variant="outline"
                        className="brutalist-button"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Reject Form */}
            <Card className="brutalist-card border-red-600">
              <CardHeader>
                <CardTitle className="font-black uppercase tracking-widest text-sm flex items-center gap-2">
                  <XCircle className="w-4 h-4" />
                  Rechazar Banner
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!showRejectForm ? (
                  <Button
                    onClick={() => setShowRejectForm(true)}
                    className="brutalist-button bg-red-600 text-white hover:bg-red-700 w-full"
                  >
                    Rechazar
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-widest mb-2 block">
                        Razón del Rechazo
                      </label>
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Ej: Imagen de baja calidad, contenido inapropiado..."
                        className="brutalist-input w-full min-h-[100px]"
                        maxLength={500}
                      />
                    </div>

                    <div className="flex gap-3">
                      <Button
                        onClick={handleRejectBanner}
                        className="brutalist-button bg-red-600 text-white hover:bg-red-700 flex-1"
                      >
                        Confirmar Rechazo
                      </Button>
                      <Button
                        onClick={() => setShowRejectForm(false)}
                        variant="outline"
                        className="brutalist-button"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Action Buttons - Approved/Paused */}
        {(banner.status === 'active' || banner.status === 'paused') && (
          <Card className="brutalist-card">
            <CardHeader>
              <CardTitle className="font-black uppercase tracking-widest">
                Acciones
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                {banner.status === 'active' && (
                  <Button
                    onClick={handlePauseBanner}
                    variant="outline"
                    className="brutalist-button gap-2"
                  >
                    <Pause className="w-4 h-4" />
                    Pausar Banner
                  </Button>
                )}
                {banner.status === 'paused' && (
                  <Button
                    onClick={handleResumeBanner}
                    className="brutalist-button bg-primary text-white hover:bg-primary/90 gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Reanudar Banner
                  </Button>
                )}
                <Button
                  onClick={handleDeleteBanner}
                  variant="outline"
                  className="brutalist-button border-red-600 text-red-600 hover:bg-red-50 gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar
                </Button>
              </div>

              {/* Edit Schedule */}
              <div className="border-t-2 border-black pt-4">
                {!showScheduleForm ? (
                  <Button
                    onClick={() => {
                      setScheduleData({
                        starts_at: banner.starts_at ? banner.starts_at.split('T')[0] : '',
                        ends_at: banner.ends_at ? banner.ends_at.split('T')[0] : '',
                      })
                      setShowScheduleForm(true)
                    }}
                    variant="outline"
                    className="brutalist-button gap-2"
                  >
                    <Calendar className="w-4 h-4" />
                    Editar Fechas
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold uppercase tracking-widest mb-2 block">Inicio</label>
                        <input
                          type="date"
                          value={scheduleData.starts_at}
                          onChange={(e) => setScheduleData({ ...scheduleData, starts_at: e.target.value })}
                          className="brutalist-input w-full"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold uppercase tracking-widest mb-2 block">Fin</label>
                        <input
                          type="date"
                          value={scheduleData.ends_at}
                          onChange={(e) => setScheduleData({ ...scheduleData, ends_at: e.target.value })}
                          className="brutalist-input w-full"
                        />
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Button onClick={handleUpdateSchedule} className="brutalist-button bg-primary text-white flex-1">
                        Guardar Fechas
                      </Button>
                      <Button onClick={() => setShowScheduleForm(false)} variant="outline" className="brutalist-button">
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Delete Button - Rejected */}
        {banner.status === 'rejected' && (
          <Card className="brutalist-card border-red-600">
            <CardHeader>
              <CardTitle className="font-black uppercase tracking-widest">
                Acciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleDeleteBanner}
                className="brutalist-button bg-red-600 text-white hover:bg-red-700 gap-2 w-full"
              >
                <Trash2 className="w-4 h-4" />
                Eliminar Banner
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
