'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Eye, Loader2, Search, Crown, Clock, XCircle } from 'lucide-react'
import { toast } from 'sonner'

interface Subscription {
  id: string
  business_id: string
  status: 'requested' | 'active' | 'cancelled'
  requested_at: string
  activated_at: string | null
  expires_at: string | null
  cancelled_at: string | null
  businesses: {
    name: string
  } | null
  profiles: {
    full_name: string | null
  } | null
}

interface SubscriptionsTableProps {
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
    icon: Crown,
    variant: 'default' as const,
    color: 'text-primary'
  },
  cancelled: {
    label: 'Cancelado',
    icon: XCircle,
    variant: 'destructive' as const,
    color: 'text-red-600'
  }
}

export function SubscriptionsTable({ communityId }: SubscriptionsTableProps) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  // Stats
  const totalRequested = subscriptions.filter(s => s.status === 'requested').length
  const totalActive = subscriptions.filter(s => s.status === 'active').length
  const totalCancelled = subscriptions.filter(s => s.status === 'cancelled').length

  async function fetchSubscriptions() {
    setLoading(true)
    try {
      let query = supabase
        .from('business_subscriptions')
        .select(`
          id,
          business_id,
          status,
          requested_at,
          activated_at,
          expires_at,
          cancelled_at,
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

      const { data, error } = await query

      if (error) throw error

      // Transform the nested data structure
      const transformedData = (data || []).map(sub => ({
        ...sub,
        profiles: (sub.businesses as any)?.profiles || null,
        businesses: {
          name: (sub.businesses as any)?.name || 'Unknown'
        }
      }))

      // Client-side search filter
      const filtered = searchQuery.trim()
        ? transformedData.filter(sub =>
            sub.businesses?.name.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : transformedData

      setSubscriptions(filtered as any)
    } catch (error) {
      console.error('Error fetching subscriptions:', error)
      toast.error('Error al cargar suscripciones')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSubscriptions()
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
            <div className="text-3xl font-black">{totalRequested}</div>
            <div className="text-xs uppercase tracking-widest font-bold text-gray-600">
              Pendientes
            </div>
          </CardContent>
        </Card>
        <Card className="brutalist-card border-primary">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-black">{totalActive}</div>
            <div className="text-xs uppercase tracking-widest font-bold text-gray-600">
              Activos
            </div>
          </CardContent>
        </Card>
        <Card className="brutalist-card border-red-600">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-black">{totalCancelled}</div>
            <div className="text-xs uppercase tracking-widest font-bold text-gray-600">
              Cancelados
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
            placeholder="Buscar por negocio..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="brutalist-input pl-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="brutalist-input w-full sm:w-[200px]">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="requested">Pendientes</SelectItem>
            <SelectItem value="active">Activos</SelectItem>
            <SelectItem value="cancelled">Cancelados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Subscriptions List */}
      {subscriptions.length === 0 ? (
        <div className="brutalist-card p-12 text-center">
          <Crown className="w-16 h-16 mx-auto text-black/20 mb-4" />
          <p className="font-bold uppercase tracking-widest text-sm text-black/40">
            No hay suscripciones
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {subscriptions.map((subscription) => {
            const statusInfo = STATUS_CONFIG[subscription.status]
            const Icon = statusInfo.icon
            const requestedDate = new Date(subscription.requested_at).toLocaleDateString('es-CO', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })

            return (
              <Card key={subscription.id} className="brutalist-card hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <Icon className={`w-5 h-5 ${statusInfo.color} flex-shrink-0`} />
                        <h3 className="font-black text-lg uppercase truncate">
                          {subscription.businesses?.name || 'Unknown'}
                        </h3>
                      </div>

                      <div className="space-y-1 text-sm">
                        <p className="text-gray-600">
                          <strong>Propietario:</strong> {subscription.profiles?.full_name || 'N/A'}
                        </p>
                        <p className="text-gray-600">
                          <strong>Solicitado:</strong> {requestedDate}
                        </p>

                        {subscription.status === 'active' && subscription.expires_at && (
                          <p className="text-gray-600">
                            <strong>Expira:</strong>{' '}
                            {new Date(subscription.expires_at).toLocaleDateString('es-CO', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </p>
                        )}

                        {subscription.status === 'cancelled' && subscription.cancelled_at && (
                          <p className="text-gray-600">
                            <strong>Cancelado:</strong>{' '}
                            {new Date(subscription.cancelled_at).toLocaleDateString('es-CO', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <Badge variant={statusInfo.variant} className="border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        {statusInfo.label}
                      </Badge>

                      <Link href={`/admin/subscriptions/${subscription.id}`}>
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
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
