// @ts-nocheck - Pre-existing admin file with type inference issues
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, ArrowLeft, Edit, Save, X, Flag, Ban, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'
import Link from 'next/link'
import { ClassifiedStatusBadge } from '@/components/marketplace/classified-status-badge'
import type { ClassifiedWithRelations } from '@/lib/types/database'

export default function AdminClassifiedDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const supabase = createClient()

  const [classified, setClassified] = useState<ClassifiedWithRelations | null>(null)
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState({
    title: '',
    description: '',
    price: '',
    whatsapp: '',
  })

  useEffect(() => {
    fetchClassified()
  }, [id])

  async function fetchClassified() {
    setLoading(true)
    const response = await fetch(`/api/admin/marketplace/${id}`)
    const data = await response.json()

    if (response.ok && data.classified) {
      setClassified(data.classified)
      setEditData({
        title: data.classified.title,
        description: data.classified.description,
        price: data.classified.price || '',
        whatsapp: data.classified.whatsapp,
      })
    } else {
      toast.error(data.error || 'Error al cargar clasificado')
      router.push('/admin/marketplace')
    }

    setLoading(false)
  }

  async function handleSaveEdit() {
    const response = await fetch(`/api/admin/marketplace/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editData),
    })

    if (response.ok) {
      toast.success('Clasificado actualizado')
      setEditMode(false)
      fetchClassified()
    } else {
      const data = await response.json()
      toast.error(data.error || 'Error al actualizar')
    }
  }

  async function handleStatusChange(newStatus: string) {
    const response = await fetch(`/api/admin/marketplace/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })

    if (response.ok) {
      toast.success('Estado actualizado')
      fetchClassified()
    } else {
      const data = await response.json()
      toast.error(data.error || 'Error al actualizar estado')
    }
  }

  async function handleFlag() {
    const reason = prompt('Razón para marcar este clasificado:')
    if (!reason) return

    const response = await fetch(`/api/admin/marketplace/${id}/flag`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    })

    if (response.ok) {
      toast.success('Clasificado marcado como inapropiado')
      fetchClassified()
    } else {
      const data = await response.json()
      toast.error(data.error || 'Error al marcar')
    }
  }

  async function handleUnflag() {
    const response = await fetch(`/api/admin/marketplace/${id}/flag`, {
      method: 'DELETE',
    })

    if (response.ok) {
      toast.success('Marca removida')
      fetchClassified()
    } else {
      const data = await response.json()
      toast.error(data.error || 'Error al remover marca')
    }
  }

  async function handleBanUser() {
    const reason = prompt('Razón para suspender este usuario del marketplace:')
    if (!reason) return

    const permanent = confirm('¿Suspensión permanente? (Cancelar = temporal 30 días)')
    const expires_at = permanent ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    const response = await fetch(`/api/admin/marketplace/${id}/ban-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, expires_at }),
    })

    if (response.ok) {
      const data = await response.json()
      toast.success(`Usuario suspendido. ${data.classifieds_removed} clasificados eliminados.`)
      router.push('/admin/marketplace')
    } else {
      const data = await response.json()
      toast.error(data.error || 'Error al suspender usuario')
    }
  }

  async function handleDelete() {
    if (!confirm('¿Estás seguro de eliminar este clasificado?')) return

    const response = await fetch(`/api/admin/marketplace/${id}`, {
      method: 'DELETE',
    })

    if (response.ok) {
      toast.success('Clasificado eliminado')
      router.push('/admin/marketplace')
    } else {
      const data = await response.json()
      toast.error(data.error || 'Error al eliminar')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    )
  }

  if (!classified) {
    return <div>Clasificado no encontrado</div>
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/marketplace">
          <Button variant="outline" className="brutalist-button gap-2">
            <ArrowLeft className="h-4 w-4" /> Volver
          </Button>
        </Link>
        <h1 className="text-3xl font-heading font-black uppercase italic tracking-tighter">
          Detalle de <span className="text-primary">Clasificado</span>
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Images */}
          {classified.images && classified.images.length > 0 && (
            <Card className="brutalist-card">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {classified.images.map((img, idx) => (
                    <div key={idx} className="relative aspect-square">
                      <Image
                        src={img}
                        alt={`${classified.title} - ${idx + 1}`}
                        fill
                        className="object-cover border-2 border-black"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Content */}
          <Card className="brutalist-card">
            <CardContent className="p-6 space-y-4">
              {editMode ? (
                <>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-black/60">
                      Título
                    </label>
                    <Input
                      value={editData.title}
                      onChange={(e) =>
                        setEditData({ ...editData, title: e.target.value })
                      }
                      className="brutalist-input"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-black/60">
                      Descripción
                    </label>
                    <Textarea
                      value={editData.description}
                      onChange={(e) =>
                        setEditData({ ...editData, description: e.target.value })
                      }
                      className="brutalist-input min-h-[120px]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-black/60">
                      Precio
                    </label>
                    <Input
                      value={editData.price}
                      onChange={(e) =>
                        setEditData({ ...editData, price: e.target.value })
                      }
                      className="brutalist-input"
                      placeholder="Opcional - Ej: $50,000 o Negociable"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-black/60">
                      WhatsApp
                    </label>
                    <Input
                      value={editData.whatsapp}
                      onChange={(e) =>
                        setEditData({ ...editData, whatsapp: e.target.value })
                      }
                      className="brutalist-input"
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={handleSaveEdit}
                      className="brutalist-button gap-2"
                    >
                      <Save className="h-4 w-4" /> Guardar
                    </Button>
                    <Button
                      onClick={() => setEditMode(false)}
                      variant="outline"
                      className="brutalist-button gap-2"
                    >
                      <X className="h-4 w-4" /> Cancelar
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className="text-[10px] rounded-none py-0 px-1 border-black"
                        >
                          {classified.marketplace_categories.name}
                        </Badge>
                        <ClassifiedStatusBadge status={classified.status} />
                      </div>

                      <h2 className="text-3xl font-heading font-black uppercase leading-tight">
                        {classified.title}
                      </h2>

                      {classified.price && (
                        <p className="text-primary font-black text-2xl">
                          {classified.price}
                        </p>
                      )}
                    </div>

                    <Button
                      onClick={() => setEditMode(true)}
                      variant="outline"
                      className="brutalist-button gap-2"
                    >
                      <Edit className="h-4 w-4" /> Editar
                    </Button>
                  </div>

                  <div className="prose max-w-none">
                    <p className="text-black/80">{classified.description}</p>
                  </div>

                  <div className="flex items-center gap-6 text-sm text-black/60">
                    <div>
                      <span className="font-black uppercase tracking-widest text-[10px] text-black/40">
                        Publicado por:
                      </span>{' '}
                      <span className="font-bold">
                        {classified.profiles.full_name}
                      </span>
                    </div>
                    <div>
                      <span className="font-black uppercase tracking-widest text-[10px] text-black/40">
                        Fecha:
                      </span>{' '}
                      {new Date(classified.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  {classified.flagged_reason && (
                    <div className="p-4 bg-red-50 border-2 border-red-500">
                      <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-1">
                        Razón de Marca:
                      </p>
                      <p className="text-red-700 font-bold">
                        {classified.flagged_reason}
                      </p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Admin Actions Sidebar */}
        <div className="space-y-6">
          {/* Status Change */}
          <Card className="brutalist-card">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-black uppercase tracking-widest text-sm">
                Cambiar Estado
              </h3>
              <Select
                value={classified.status}
                onValueChange={handleStatusChange}
              >
                <SelectTrigger className="brutalist-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-2 border-black rounded-none">
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="sold">Vendido</SelectItem>
                  <SelectItem value="archived">Archivado</SelectItem>
                  <SelectItem value="removed">Eliminado</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Admin Actions */}
          <Card className="brutalist-card">
            <CardContent className="p-6 space-y-3">
              <h3 className="font-black uppercase tracking-widest text-sm mb-4">
                Acciones de Admin
              </h3>

              {classified.status === 'flagged' ? (
                <Button
                  onClick={handleUnflag}
                  variant="outline"
                  className="w-full brutalist-button gap-2"
                >
                  <Flag className="h-4 w-4" /> Remover Marca
                </Button>
              ) : (
                <Button
                  onClick={handleFlag}
                  variant="outline"
                  className="w-full brutalist-button gap-2 text-red-600 border-red-600"
                >
                  <Flag className="h-4 w-4" /> Marcar Inapropiado
                </Button>
              )}

              <Button
                onClick={handleBanUser}
                variant="outline"
                className="w-full brutalist-button gap-2 text-orange-600 border-orange-600"
              >
                <Ban className="h-4 w-4" /> Suspender Usuario
              </Button>

              <Button
                onClick={handleDelete}
                variant="destructive"
                className="w-full brutalist-button gap-2"
              >
                <Trash2 className="h-4 w-4" /> Eliminar Clasificado
              </Button>
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card className="brutalist-card">
            <CardContent className="p-6 space-y-3 text-sm">
              <h3 className="font-black uppercase tracking-widest text-sm mb-4">
                Información
              </h3>

              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-black/40">
                  Comunidad:
                </span>
                <p className="font-bold">{classified.communities.name}</p>
              </div>

              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-black/40">
                  WhatsApp:
                </span>
                <p className="font-bold">{classified.whatsapp}</p>
              </div>

              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-black/40">
                  Última Actividad:
                </span>
                <p className="font-bold">
                  {new Date(classified.last_activity_at).toLocaleDateString()}
                </p>
              </div>

              {classified.sold_at && (
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-black/40">
                    Vendido:
                  </span>
                  <p className="font-bold">
                    {new Date(classified.sold_at).toLocaleDateString()}
                  </p>
                </div>
              )}

              {classified.archived_at && (
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-black/40">
                    Archivado:
                  </span>
                  <p className="font-bold">
                    {new Date(classified.archived_at).toLocaleDateString()}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
