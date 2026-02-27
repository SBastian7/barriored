'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, MapPin, Phone, Mail, Globe, Clock, Camera, User, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import Image from 'next/image'
import { Breadcrumbs } from '@/components/shared/breadcrumbs'
import { FeaturedBusinessControls } from '@/components/admin/featured-business-controls'
import { RejectionDialog } from '@/components/admin/rejection-dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { getPermissions } from '@/lib/auth/permissions'
import dynamic from 'next/dynamic'

const MapContainer = dynamic(() => import('react-leaflet').then((mod) => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then((mod) => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then((mod) => mod.Marker), { ssr: false })

const DAY_NAMES: Record<string, string> = {
  lunes: 'Lunes', martes: 'Martes', miercoles: 'Miercoles', jueves: 'Jueves',
  viernes: 'Viernes', sabado: 'Sabado', domingo: 'Domingo',
  mon: 'Lunes', tue: 'Martes', wed: 'Miercoles', thu: 'Jueves',
  fri: 'Viernes', sat: 'Sabado', sun: 'Domingo',
}

export default function AdminBusinessReviewPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()
  const [business, setBusiness] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [currentProfile, setCurrentProfile] = useState<any>(null)

  useEffect(() => {
    // Fetch business with featured fields
    supabase
      .from('businesses')
      .select('*, categories(name), profiles(full_name, phone)')
      .eq('id', id)
      .single()
      .then(({ data }) => setBusiness(data))

    // Fetch current user profile to determine permissions
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from('profiles')
          .select('role, is_super_admin, community_id')
          .eq('id', user.id)
          .single()
          .then(({ data }) => setCurrentProfile(data))
      }
    })
  }, [id, supabase])

  async function handleApprove() {
    setLoading(true)
    const res = await fetch(`/api/businesses/${id}/approve`, { method: 'POST' })
    setLoading(false)
    if (res.ok) {
      toast.success('Negocio aprobado')
      router.push('/admin/businesses')
    } else {
      toast.error('Error procesando acción')
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/businesses/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Negocio eliminado exitosamente')
        router.push('/admin/businesses')
      } else {
        const data = await res.json()
        toast.error(data.error || 'Error al eliminar negocio')
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al eliminar negocio')
    } finally {
      setDeleting(false)
    }
  }

  if (!business) return <p>Cargando...</p>

  const location = business.location as any
  const lat = location?.coordinates?.[1]
  const lng = location?.coordinates?.[0]
  const hours = business.hours as Record<string, { open: string; close: string }> | null

  // Calculate permissions
  const permissions = currentProfile
    ? getPermissions(currentProfile.role, currentProfile.is_super_admin)
    : null

  return (
    <div className="space-y-8">
      <Breadcrumbs
        items={[
          { label: 'Administracion', href: '/admin/businesses' },
          { label: 'Negocios', href: '/admin/businesses' },
          { label: `Revisar: ${business.name}`, active: true }
        ]}
      />

      <Card className="border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-none overflow-hidden">
        {/* Header with main photo */}
        <CardHeader className="border-b-4 border-black bg-muted p-0">
          {business.photos?.[0] && (
            <div className="relative h-48 md:h-64 w-full border-b-4 border-black">
              <Image src={business.photos[0]} alt={business.name} fill className="object-cover" />
            </div>
          )}
          <div className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-4xl font-heading font-black uppercase italic tracking-tighter">{business.name}</CardTitle>
                <p className="text-xs font-black uppercase tracking-widest text-black/50 italic mt-2">
                  {business.categories?.name}
                </p>
              </div>
              <Badge variant={business.status === 'pending' ? 'secondary' : business.status === 'approved' ? 'default' : 'destructive'}>
                {business.status}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Description */}
          {business.description && (
            <div className="relative pl-5">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
              <p className="text-lg leading-relaxed italic text-black/80">{business.description}</p>
            </div>
          )}

          {/* Featured Business Controls */}
          {currentProfile && business && (
            <FeaturedBusinessControls
              business={{
                id: business.id,
                is_featured: business.is_featured,
                featured_order: business.featured_order,
                featured_requested: business.featured_requested,
                featured_requested_at: business.featured_requested_at,
              }}
              isSuperAdmin={currentProfile.is_super_admin === true}
              isCommunityAdmin={
                currentProfile.role === 'admin' &&
                !currentProfile.is_super_admin &&
                currentProfile.community_id === business.community_id
              }
            />
          )}

          {/* Contact & Details Grid */}
          <div className="grid gap-3">
            {/* Submitter info */}
            <div className="flex items-center gap-3 border-2 border-black p-3 bg-secondary/10 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <div className="bg-secondary p-2 border-2 border-black">
                <User className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-black/40">Registrado por</p>
                <p className="font-bold text-sm">{business.profiles?.full_name ?? 'N/A'} {business.profiles?.phone && `— ${business.profiles.phone}`}</p>
              </div>
            </div>

            {business.whatsapp && (
              <div className="flex items-center gap-3 border-2 border-black p-3 bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <div className="bg-[#25D366] p-2 border-2 border-black">
                  <Phone className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-black/40">WhatsApp</p>
                  <p className="font-bold text-sm">+{business.whatsapp}</p>
                </div>
              </div>
            )}

            {business.phone && (
              <div className="flex items-center gap-3 border-2 border-black p-3 bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <div className="bg-secondary p-2 border-2 border-black">
                  <Phone className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-black/40">Telefono</p>
                  <p className="font-bold text-sm">{business.phone}</p>
                </div>
              </div>
            )}

            {business.email && (
              <div className="flex items-center gap-3 border-2 border-black p-3 bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <div className="bg-accent p-2 border-2 border-black">
                  <Mail className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-black/40">Email</p>
                  <p className="font-bold text-sm">{business.email}</p>
                </div>
              </div>
            )}

            {business.address && (
              <div className="flex items-center gap-3 border-2 border-black p-3 bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <div className="bg-primary p-2 border-2 border-black">
                  <MapPin className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-black/40">Direccion</p>
                  <p className="font-bold text-sm">{business.address}</p>
                </div>
              </div>
            )}

            {business.website && (
              <div className="flex items-center gap-3 border-2 border-black p-3 bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <div className="bg-accent p-2 border-2 border-black">
                  <Globe className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-black/40">Sitio Web</p>
                  <a href={business.website} target="_blank" rel="noopener noreferrer" className="font-bold text-sm hover:text-primary transition-colors">{business.website}</a>
                </div>
              </div>
            )}
          </div>

          {/* Business Hours */}
          {hours && Object.keys(hours).length > 0 && (
            <div className="border-2 border-black bg-white p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <h3 className="text-lg font-heading font-black uppercase italic flex items-center gap-2 mb-4">
                <Clock className="h-5 w-5 text-primary" /> Horarios
              </h3>
              <div className="space-y-2">
                {Object.entries(hours).map(([day, h]) => (
                  <div key={day} className="flex justify-between items-center border-b border-black/10 pb-1 px-2">
                    <span className="font-black uppercase tracking-tighter text-sm">{DAY_NAMES[day] ?? day}</span>
                    <span className="font-mono font-bold bg-black text-white px-2 py-0.5 text-xs">{h.open} - {h.close}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Location Map */}
          {lat && lng && (
            <div className="border-2 border-black overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="bg-black/5 px-4 py-2 border-b-2 border-black">
                <h3 className="text-sm font-black uppercase tracking-widest text-black/60 flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> Ubicacion en mapa
                </h3>
              </div>
              <div className="h-56">
                <MapContainer center={[lat, lng]} zoom={16} className="h-full w-full" scrollWheelZoom={false}>
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={[lat, lng]} />
                </MapContainer>
              </div>
            </div>
          )}

          {/* Photos Gallery */}
          {business.photos?.length > 0 && (
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-black/60 flex items-center gap-2 mb-3">
                <Camera className="h-4 w-4" /> Fotos ({business.photos.length})
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {business.photos.map((url: string, i: number) => (
                  <div key={i} className="relative aspect-square border-2 border-black overflow-hidden shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <Image src={url} alt={`Foto ${i + 1}`} fill className="object-cover" />
                    {i === 0 && (
                      <div className="absolute top-0 left-0 bg-secondary text-black px-2 py-1 border-r-2 border-b-2 border-black">
                        <span className="text-[9px] font-black uppercase tracking-widest">Principal</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {business.status === 'pending' && (
            <div className="flex gap-4 pt-6 mt-6 border-t-4 border-dashed border-black">
              <Button
                onClick={handleApprove}
                disabled={loading}
                className="flex-1 bg-green-500 hover:bg-green-600 border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-white font-black uppercase italic h-14 text-base"
              >
                <CheckCircle className="h-5 w-5 mr-2" /> Aprobar Negocio
              </Button>
              <RejectionDialog
                businessId={id}
                businessName={business.name}
              />
            </div>
          )}

          {/* Edit & Delete Actions */}
          {permissions && (permissions.canEditAnyBusiness || permissions.canDeleteBusinesses) && (
            <div className="flex gap-4 pt-6 mt-6 border-t-2 border-black">
              {permissions.canEditAnyBusiness && (
                <Link href={`/admin/businesses/${id}/edit`} className="flex-1">
                  <Button
                    variant="outline"
                    className="brutalist-button w-full h-12 border-accent bg-accent/5 hover:bg-accent/10"
                  >
                    <Pencil className="h-4 w-4 mr-2" /> Editar Negocio
                  </Button>
                </Link>
              )}

              {permissions.canDeleteBusinesses && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      className="brutalist-button flex-1 h-12"
                      disabled={deleting}
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Eliminar Negocio?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción es permanente. Se eliminará <strong>{business.name}</strong> y todas sus fotos.
                        Esta acción no se puede deshacer.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        {deleting ? 'Eliminando...' : 'Sí, Eliminar'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
