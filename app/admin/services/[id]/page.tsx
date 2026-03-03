'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PhoneInput } from '@/components/ui/phone-input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import {
  Siren,
  HeartPulse,
  Landmark,
  Bus,
  Wrench,
  ArrowLeft,
  Edit,
  Save,
  X,
  Loader2,
  Trash2,
  Phone as PhoneIcon,
  MapPin,
  Clock,
  Building2
} from 'lucide-react'
import Link from 'next/link'
import type { ServiceCategory } from '@/lib/types'

export default function AdminServiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const [service, setService] = useState<any>(null)
  const [communities, setCommunities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  const [formData, setFormData] = useState({
    community_id: '',
    category: 'emergency' as ServiceCategory,
    name: '',
    description: '',
    phone: '',
    address: '',
    hours: '',
    is_active: true,
    sort_order: 10
  })

  useEffect(() => {
    fetchService()
    fetchCommunities()
  }, [params.id])

  async function fetchService() {
    if (!params.id) return
    setLoading(true)
    const { data } = await supabase
      .from('public_services')
      .select('*, communities(name, slug)')
      .eq('id', params.id)
      .single()

    if (data) {
      setService(data)
      setFormData({
        community_id: data.community_id,
        category: data.category,
        name: data.name,
        description: data.description || '',
        phone: data.phone || '',
        address: data.address || '',
        hours: data.hours || '',
        is_active: data.is_active,
        sort_order: data.sort_order || 10
      })
    }
    setLoading(false)
  }

  async function fetchCommunities() {
    const { data } = await supabase
      .from('communities')
      .select('id, name')
      .order('name')
    setCommunities(data || [])
  }

  async function handleSave() {
    if (!formData.name || !formData.community_id) {
      toast.error('Nombre y comunidad son obligatorios')
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/admin/services/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al actualizar')
      }

      toast.success('Servicio actualizado con éxito')
      setService(result.data)
      setIsEditing(false)
      fetchService()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm('¿Estás seguro de eliminar este servicio? Esta acción no se puede deshacer.')) {
      return
    }

    setDeleting(true)
    try {
      const response = await fetch(`/api/admin/services/${params.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Error al eliminar')
      }

      toast.success('Servicio eliminado con éxito')
      router.push('/admin/services')
    } catch (error: any) {
      toast.error(error.message)
      setDeleting(false)
    }
  }

  const categoryIcons: any = {
    emergency: Siren,
    health: HeartPulse,
    government: Landmark,
    transport: Bus,
    utilities: Wrench
  }

  const categoryLabels: any = {
    emergency: 'Emergencias',
    health: 'Salud',
    government: 'Gobierno / CAI',
    transport: 'Transporte / Terminal',
    utilities: 'Servicios Públicos'
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    )
  }

  if (!service) {
    return (
      <div className="space-y-6">
        <Button
          variant="outline"
          onClick={() => router.push('/admin/services')}
          className="brutalist-button gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Volver
        </Button>
        <Card className="brutalist-card py-12 text-center">
          <p className="font-bold text-black/30 uppercase tracking-widest">Servicio no encontrado</p>
        </Card>
      </div>
    )
  }

  const Icon = categoryIcons[service.category] || Siren

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b-4 border-black">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push('/admin/services')}
            className="brutalist-button gap-2"
            size="sm"
          >
            <ArrowLeft className="h-4 w-4" /> Volver
          </Button>

          <div>
            <h1 className="text-3xl font-heading font-black uppercase italic tracking-tighter flex items-center gap-3">
              <Icon className="h-8 w-8 text-emerald-600" />
              {isEditing ? 'Editar Servicio' : service.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge className="text-[10px] rounded-none border-black bg-emerald-500 text-white">
                {categoryLabels[service.category]}
              </Badge>
              <Badge className="text-[10px] rounded-none border-black bg-white text-black">
                {service.communities?.name}
              </Badge>
              <Badge className={`text-[10px] rounded-none border-black ${service.is_active ? 'bg-green-200 text-black' : 'bg-gray-200 text-black'}`}>
                {service.is_active ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {!isEditing ? (
            <>
              <Button
                onClick={() => setIsEditing(true)}
                className="brutalist-button gap-2"
                size="sm"
              >
                <Edit className="h-4 w-4" /> Editar
              </Button>
              <Button
                onClick={handleDelete}
                disabled={deleting}
                variant="outline"
                className="brutalist-button gap-2 border-red-600 text-red-600 hover:bg-red-50"
                size="sm"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Eliminar
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="brutalist-button gap-2"
                size="sm"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Guardar
              </Button>
              <Button
                onClick={() => {
                  setIsEditing(false)
                  fetchService()
                }}
                variant="outline"
                className="brutalist-button gap-2"
                size="sm"
              >
                <X className="h-4 w-4" /> Cancelar
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      {!isEditing ? (
        <div className="grid gap-6">
          {/* Service Details */}
          <Card className="brutalist-card">
            <CardHeader className="border-b-2 border-black">
              <CardTitle className="font-heading font-black uppercase italic text-lg">
                Información del Servicio
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {service.phone && (
                <div className="flex items-start gap-3 pb-3 border-b border-black/10">
                  <PhoneIcon className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-1">Teléfono</p>
                    <p className="font-bold text-lg">{service.phone}</p>
                  </div>
                </div>
              )}

              {service.address && (
                <div className="flex items-start gap-3 pb-3 border-b border-black/10">
                  <MapPin className="h-5 w-5 text-accent mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-1">Dirección</p>
                    <p className="font-bold">{service.address}</p>
                  </div>
                </div>
              )}

              {service.hours && (
                <div className="flex items-start gap-3 pb-3 border-b border-black/10">
                  <Clock className="h-5 w-5 text-secondary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-1">Horario</p>
                    <p className="font-bold">{service.hours}</p>
                  </div>
                </div>
              )}

              {service.description && (
                <div className="flex items-start gap-3">
                  <Building2 className="h-5 w-5 text-black/40 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-1">Descripción</p>
                    <p className="text-black/70">{service.description}</p>
                  </div>
                </div>
              )}

              {!service.phone && !service.address && !service.hours && !service.description && (
                <p className="text-center text-black/30 font-bold uppercase tracking-widest py-4">
                  Sin información adicional
                </p>
              )}
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card className="brutalist-card">
            <CardHeader className="border-b-2 border-black">
              <CardTitle className="font-heading font-black uppercase italic text-lg">
                Metadatos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-black/40">Orden:</span>
                <span className="font-bold">{service.sort_order}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-black/40">Estado:</span>
                <Badge className={service.is_active ? 'bg-green-200 text-black border-black' : 'bg-gray-200 text-black border-black'}>
                  {service.is_active ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-black/40">Creado:</span>
                <span className="font-bold text-sm">{new Date(service.created_at).toLocaleDateString('es-CO')}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="brutalist-card">
          <CardContent className="p-6 space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase tracking-widest text-black/40">Comunidad</Label>
                <Select
                  value={formData.community_id}
                  onValueChange={(v) => setFormData({ ...formData, community_id: v })}
                >
                  <SelectTrigger className="brutalist-input h-10">
                    <SelectValue placeholder="Seleccionar Barrio" />
                  </SelectTrigger>
                  <SelectContent className="border-2 border-black rounded-none">
                    {communities.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase tracking-widest text-black/40">Categoría</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData({ ...formData, category: v as ServiceCategory })}
                >
                  <SelectTrigger className="brutalist-input h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-2 border-black rounded-none">
                    <SelectItem value="emergency">Emergencias</SelectItem>
                    <SelectItem value="health">Salud</SelectItem>
                    <SelectItem value="government">Gobierno / CAI</SelectItem>
                    <SelectItem value="transport">Transporte / Terminal</SelectItem>
                    <SelectItem value="utilities">Servicios Públicos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase tracking-widest text-black/40">Nombre del Servicio</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: CAI Galán"
                className="brutalist-input"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase tracking-widest text-black/40">Descripción (Opcional)</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Información adicional sobre el servicio..."
                className="brutalist-input min-h-[100px]"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase tracking-widest text-black/40">Teléfono</Label>
                <PhoneInput
                  value={formData.phone}
                  onChange={(val) => setFormData({ ...formData, phone: val })}
                  placeholder="312 345 6789"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase tracking-widest text-black/40">Orden de Visualización</Label>
                <Input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 10 })}
                  className="brutalist-input"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase tracking-widest text-black/40">Dirección</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Calle 123 # 45 - 67"
                className="brutalist-input"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase tracking-widest text-black/40">Horario</Label>
              <Input
                value={formData.hours}
                onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                placeholder="24/7 o Lun-Vie 8am-5pm"
                className="brutalist-input"
              />
            </div>

            <div className="flex items-center gap-3 p-4 border-2 border-black bg-black/5">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="h-5 w-5 border-2 border-black rounded-none"
              />
              <Label htmlFor="is_active" className="text-sm font-black uppercase tracking-widest cursor-pointer">
                Servicio Activo
              </Label>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
