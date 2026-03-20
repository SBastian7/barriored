'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Eye, Loader2, Search, Flag, CheckCircle, XCircle, Clock } from 'lucide-react'
import { toast } from 'sonner'

interface ReviewFlag {
  id: string
  review_id: string
  reason: string
  description: string | null
  status: 'pending' | 'dismissed' | 'removed'
  flagged_at: string
  resolved_at: string | null
  business_reviews: {
    id: string
    rating: number
    comment: string
    businesses: {
      name: string
    } | null
    profiles: {
      full_name: string | null
    } | null
  } | null
  profiles: {
    full_name: string | null
  } | null
}

interface FlaggedReviewsTableProps {
  communityId: string
}

const STATUS_CONFIG = {
  pending: {
    label: 'Pendiente',
    icon: Clock,
    variant: 'secondary' as const,
    color: 'text-secondary'
  },
  dismissed: {
    label: 'Desestimado',
    icon: XCircle,
    variant: 'default' as const,
    color: 'text-gray-600'
  },
  removed: {
    label: 'Eliminado',
    icon: CheckCircle,
    variant: 'destructive' as const,
    color: 'text-red-600'
  }
}

export function FlaggedReviewsTable({ communityId }: FlaggedReviewsTableProps) {
  const [flags, setFlags] = useState<ReviewFlag[]>([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  // Stats
  const totalPending = flags.filter(f => f.status === 'pending').length
  const totalDismissed = flags.filter(f => f.status === 'dismissed').length
  const totalRemoved = flags.filter(f => f.status === 'removed').length

  async function fetchFlags() {
    setLoading(true)
    try {
      let query = supabase
        .from('review_flags')
        .select(`
          id,
          review_id,
          reason,
          description,
          status,
          flagged_at,
          resolved_at,
          flagger_id,
          business_reviews!inner(
            id,
            rating,
            comment,
            business_id,
            user_id,
            businesses!inner(
              name,
              community_id
            ),
            profiles!business_reviews_user_id_fkey(full_name)
          ),
          profiles!review_flags_flagger_id_fkey(full_name)
        `)
        .eq('business_reviews.businesses.community_id', communityId)
        .order('flagged_at', { ascending: false })

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query

      if (error) throw error

      // Transform nested structure
      const transformedData = (data || []).map(flag => ({
        ...flag,
        business_reviews: {
          id: (flag.business_reviews as any)?.id,
          rating: (flag.business_reviews as any)?.rating,
          comment: (flag.business_reviews as any)?.comment,
          businesses: {
            name: (flag.business_reviews as any)?.businesses?.name || 'Unknown'
          },
          profiles: (flag.business_reviews as any)?.profiles
        },
        profiles: flag.profiles
      }))

      // Client-side search
      const filtered = searchQuery.trim()
        ? transformedData.filter(flag =>
            flag.business_reviews?.businesses?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            flag.business_reviews?.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : transformedData

      setFlags(filtered)
    } catch (error) {
      console.error('Error fetching flags:', error)
      toast.error('Error al cargar reportes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFlags()
  }, [statusFilter, searchQuery, communityId])

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
      <div className="grid grid-cols-3 gap-4">
        <Card className="brutalist-card border-secondary">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-black">{totalPending}</div>
            <div className="text-xs uppercase tracking-widest font-bold text-gray-600">
              Pendientes
            </div>
          </CardContent>
        </Card>
        <Card className="brutalist-card border-gray-600">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-black">{totalDismissed}</div>
            <div className="text-xs uppercase tracking-widest font-bold text-gray-600">
              Desestimados
            </div>
          </CardContent>
        </Card>
        <Card className="brutalist-card border-red-600">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-black">{totalRemoved}</div>
            <div className="text-xs uppercase tracking-widest font-bold text-gray-600">
              Eliminados
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
            placeholder="Buscar por negocio o usuario..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="brutalist-input pl-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="brutalist-input w-full sm:w-[200px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendientes</SelectItem>
            <SelectItem value="dismissed">Desestimados</SelectItem>
            <SelectItem value="removed">Eliminados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Flags List */}
      {flags.length === 0 ? (
        <div className="brutalist-card p-12 text-center">
          <Flag className="w-16 h-16 mx-auto text-black/20 mb-4" />
          <p className="font-bold uppercase tracking-widest text-sm text-black/40">
            No hay reseñas reportadas
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {flags.map((flag) => {
            const statusInfo = STATUS_CONFIG[flag.status]
            const Icon = statusInfo.icon
            const flaggedDate = new Date(flag.flagged_at).toLocaleDateString('es-CO', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })

            return (
              <Card key={flag.id} className="brutalist-card hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all">
                <CardContent className="p-6">
                  <div className="flex gap-6">
                    {/* Flag Icon */}
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-red-100 border-2 border-red-600 flex items-center justify-center">
                        <Flag className="w-6 h-6 text-red-600" />
                      </div>
                    </div>

                    {/* Flag Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-black text-lg uppercase truncate mb-1">
                            {flag.business_reviews?.businesses?.name || 'Negocio Desconocido'}
                          </h3>
                          <p className="text-sm text-gray-600 mb-2">
                            <strong>Reportado por:</strong> {flag.profiles?.full_name || 'Anónimo'}
                          </p>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className="bg-secondary text-black border-2 border-black text-xs">
                              {flag.reason}
                            </Badge>
                            <span className="text-xs text-gray-500">{flaggedDate}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0">
                          <Badge variant={statusInfo.variant} className="border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] gap-1">
                            <Icon className="w-3 h-3" />
                            {statusInfo.label}
                          </Badge>

                          <Link href={`/admin/review-flags/${flag.id}`}>
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

                      {/* Review Preview */}
                      <div className="border-l-4 border-gray-300 pl-4">
                        <p className="text-sm text-gray-600 mb-1">
                          <strong>Reseña por:</strong> {flag.business_reviews?.profiles?.full_name || 'Anónimo'}
                        </p>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <span key={star} className={star <= (flag.business_reviews?.rating || 0) ? 'text-secondary' : 'text-gray-300'}>
                                ★
                              </span>
                            ))}
                          </div>
                        </div>
                        <p className="text-sm line-clamp-2">
                          {flag.business_reviews?.comment || 'Sin comentario'}
                        </p>
                      </div>

                      {/* Flag Description */}
                      {flag.description && (
                        <div className="brutalist-card p-3 bg-red-50 border-red-600 mt-3">
                          <p className="text-xs text-red-700">
                            <strong>Descripción del reporte:</strong> {flag.description}
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
