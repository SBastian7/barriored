'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Eye, Loader2, Search, Image as ImageIcon, Calendar, CheckCircle, XCircle, Clock, PauseCircle } from 'lucide-react'
import { toast } from 'sonner'

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
  } | null
  profiles: {
    full_name: string | null
  } | null
}

interface BannersTableProps {
  communityId: string
}

const STATUS_CONFIG = {
  requested: {
    label: 'Pendiente',
    icon: Clock,
    variant: 'secondary' as const,
    color: 'text-secondary'
  },
  active: {
    label: 'Activo',
    icon: CheckCircle,
    variant: 'default' as const,
    color: 'text-primary'
  },
  rejected: {
    label: 'Rechazado',
    icon: XCircle,
    variant: 'destructive' as const,
    color: 'text-red-600'
  },
  paused: {
    label: 'Pausado',
    icon: PauseCircle,
    variant: 'secondary' as const,
    color: 'text-gray-600'
  },
  expired: {
    label: 'Expirado',
    icon: Clock,
    variant: 'outline' as const,
    color: 'text-gray-400'
  }
}

export function BannersTable({ communityId }: BannersTableProps) {
  const [banners, setBanners] = useState<BannerAd[]>([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [placementFilter, setPlacementFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  // Stats
  const totalRequested = banners.filter(b => b.status === 'requested').length
  const totalApproved = banners.filter(b => b.status === 'active').length
  const totalRejected = banners.filter(b => b.status === 'rejected').length
  const totalPaused = banners.filter(b => b.status === 'paused').length

  async function fetchBanners() {
    setLoading(true)
    try {
      let query = supabase
        .from('banner_ads')
        .select(`
          id,
          business_id,
          title,
          image_url,
          placement,
          link_url,
          status,
          requested_at,
          approved_at,
          starts_at,
          ends_at,
          rejection_reason,
          businesses!inner(
            name,
            community_id,
            owner_id,
            profiles!businesses_owner_id_profiles_fkey(full_name)
          )
        `)
        .eq('businesses.community_id', communityId)
        .order('requested_at', { ascending: false })

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      if (placementFilter !== 'all') {
        query = query.eq('placement', placementFilter)
      }

      const { data, error } = await query

      if (error) throw error

      // Transform the nested data structure
      const transformedData = (data || []).map(banner => ({
        ...banner,
        profiles: (banner.businesses as any)?.profiles || null,
        businesses: {
          name: (banner.businesses as any)?.name || 'Unknown'
        }
      }))

      // Client-side search filter
      const filtered = searchQuery.trim()
        ? transformedData.filter(banner =>
            banner.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            banner.businesses?.name.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : transformedData

      setBanners(filtered as any)
    } catch (error) {
      console.error('Error fetching banners:', error)
      toast.error('Error al cargar banners')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBanners()
  }, [statusFilter, placementFilter, searchQuery, communityId])

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="brutalist-card border-secondary">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-black">{totalRequested}</div>
            <div className="text-xs uppercase tracking-widest font-bold text-gray-600">
              Pendientes
            </div>
          </CardContent>
        </Card>
        <Card className="brutalist-card border-primary">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-black">{totalApproved}</div>
            <div className="text-xs uppercase tracking-widest font-bold text-gray-600">
              Aprobados
            </div>
          </CardContent>
        </Card>
        <Card className="brutalist-card border-red-600">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-black">{totalRejected}</div>
            <div className="text-xs uppercase tracking-widest font-bold text-gray-600">
              Rechazados
            </div>
          </CardContent>
        </Card>
        <Card className="brutalist-card border-gray-600">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-black">{totalPaused}</div>
            <div className="text-xs uppercase tracking-widest font-bold text-gray-600">
              Pausados
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Buscar por título o negocio..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="brutalist-input pl-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="brutalist-input w-full sm:w-[180px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="requested">Pendientes</SelectItem>
            <SelectItem value="active">Activos</SelectItem>
            <SelectItem value="rejected">Rechazados</SelectItem>
            <SelectItem value="paused">Pausados</SelectItem>
            <SelectItem value="expired">Expirados</SelectItem>
          </SelectContent>
        </Select>

        <Select value={placementFilter} onValueChange={setPlacementFilter}>
          <SelectTrigger className="brutalist-input w-full sm:w-[180px]">
            <SelectValue placeholder="Ubicación" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="homepage">Homepage</SelectItem>
            <SelectItem value="directory">Directorio</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Banners List */}
      {banners.length === 0 ? (
        <div className="brutalist-card p-12 text-center">
          <ImageIcon className="w-16 h-16 mx-auto text-black/20 mb-4" />
          <p className="font-bold uppercase tracking-widest text-sm text-black/40">
            No hay banners
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {banners.map((banner) => {
            const statusInfo = STATUS_CONFIG[banner.status]
            const Icon = statusInfo.icon
            const requestedDate = new Date(banner.requested_at).toLocaleDateString('es-CO', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })

            return (
              <Card key={banner.id} className="brutalist-card hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all">
                <CardContent className="p-6">
                  <div className="flex gap-6">
                    {/* Banner Image Thumbnail */}
                    <div className="w-48 h-32 flex-shrink-0 border-2 border-black overflow-hidden bg-gray-100">
                      <img
                        src={banner.image_url}
                        alt={banner.title}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Banner Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-black text-xl uppercase truncate mb-1">
                            {banner.title}
                          </h3>
                          <p className="text-sm text-gray-600 mb-1">
                            <strong>Negocio:</strong> {banner.businesses?.name || 'N/A'}
                          </p>
                          <p className="text-sm text-gray-600 mb-1">
                            <strong>Propietario:</strong> {banner.profiles?.full_name || 'N/A'}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge className="bg-gray-200 text-black border-2 border-black text-xs">
                              {banner.placement === 'homepage' ? 'Homepage' : 'Directorio'}
                            </Badge>
                            <span className="text-xs text-gray-500">{requestedDate}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0">
                          <Badge variant={statusInfo.variant} className="border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] gap-1">
                            <Icon className="w-3 h-3" />
                            {statusInfo.label}
                          </Badge>

                          <Link href={`/admin/banners/${banner.id}`}>
                            <Button
                              variant="outline"
                              size="icon"
                              className="brutalist-button"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
                        </div>
                      </div>

                      {/* Dates */}
                      {banner.status === 'active' && (banner.starts_at || banner.ends_at) && (
                        <div className="flex items-center gap-4 text-xs text-gray-600 mt-2">
                          {banner.starts_at && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>
                                Inicia: {new Date(banner.starts_at).toLocaleDateString('es-CO', {
                                  day: 'numeric',
                                  month: 'short'
                                })}
                              </span>
                            </div>
                          )}
                          {banner.ends_at && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>
                                Termina: {new Date(banner.ends_at).toLocaleDateString('es-CO', {
                                  day: 'numeric',
                                  month: 'short'
                                })}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Rejection Reason */}
                      {banner.status === 'rejected' && banner.rejection_reason && (
                        <div className="brutalist-card p-2 bg-red-50 border-red-600 mt-2">
                          <p className="text-xs text-red-700">
                            <strong>Razón:</strong> {banner.rejection_reason}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
