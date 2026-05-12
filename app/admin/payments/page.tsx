'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { redirect } from 'next/navigation'
import { Breadcrumbs } from '@/components/shared/breadcrumbs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, DollarSign, TrendingUp, Calendar, Search, Download, Crown, Image as ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface Payment {
  id: string
  type: 'subscription' | 'banner'
  amount: number
  payment_method: string
  transaction_id: string | null
  payment_date: string
  business_name: string
  owner_name: string | null
  subscription_id?: string
  banner_id?: string
}

export default function AdminPaymentsPage() {
  const [communityId, setCommunityId] = useState<string | null>(null)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [communities, setCommunities] = useState<{ id: string; name: string }[]>([])
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | 'all'>('all')
  const [payments, setPayments] = useState<Payment[]>([])
  const [typeFilter, setTypeFilter] = useState('all')
  const [methodFilter, setMethodFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const hasLoaded = useRef(false)
  const supabase = createClient()

  // Stats
  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0)
  const subscriptionRevenue = payments
    .filter(p => p.type === 'subscription')
    .reduce((sum, p) => sum + p.amount, 0)
  const bannerRevenue = payments
    .filter(p => p.type === 'banner')
    .reduce((sum, p) => sum + p.amount, 0)
  const totalPayments = payments.length

  // Get current month revenue
  const now = new Date()
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthlyRevenue = payments
    .filter(p => new Date(p.payment_date) >= firstDayOfMonth)
    .reduce((sum, p) => sum + p.amount, 0)

  useEffect(() => {
    async function checkAccessAndFetch() {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        redirect('/auth/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_super_admin, community_id')
        .eq('id', user.id)
        .single<{
          role: string | null
          is_super_admin: boolean | null
          community_id: string | null
        }>()

      if (!profile?.is_super_admin && profile?.role !== 'admin') {
        redirect('/')
        return
      }

      if (profile.is_super_admin) {
        setIsSuperAdmin(true)
        const { data: comms } = await supabase.from('communities').select('id, name').eq('is_active', true).order('name')
        setCommunities(comms || [])
        await fetchPayments(null)
      } else {
        setCommunityId(profile.community_id)
        await fetchPayments(profile.community_id)
      }
      setLoading(false)
      hasLoaded.current = true
    }

    checkAccessAndFetch()
  }, [])

  async function fetchPayments(commId: string | null) {
    try {
      // Fetch subscription payments
      let subQuery = supabase
        .from('subscription_payments')
        .select(`
          id,
          amount,
          payment_method,
          transaction_id,
          payment_date,
          subscription_id,
          business_subscriptions!inner(
            business_id,
            businesses!inner(
              name,
              community_id,
              owner_id,
              profiles!businesses_owner_id_profiles_fkey(full_name)
            )
          )
        `)
        .order('payment_date', { ascending: false })
      if (commId) subQuery = subQuery.eq('business_subscriptions.businesses.community_id', commId)
      const { data: subPayments } = await subQuery

      // Fetch banner payments (from banner_ads approved records)
      let bannerQuery = supabase
        .from('banner_ads')
        .select(`
          id,
          amount_paid,
          payment_method,
          approved_at,
          business_id,
          businesses!inner(
            name,
            community_id,
            owner_id,
            profiles!businesses_owner_id_profiles_fkey(full_name)
          )
        `)
        .eq('status', 'approved')
        .not('amount_paid', 'is', null)
        .order('approved_at', { ascending: false })
      if (commId) bannerQuery = bannerQuery.eq('businesses.community_id', commId)
      const { data: bannerPayments } = await bannerQuery

      // Transform and combine payments
      const transformedSubPayments: Payment[] = (subPayments || []).map(p => ({
        id: p.id,
        type: 'subscription' as const,
        amount: p.amount,
        payment_method: p.payment_method,
        transaction_id: p.transaction_id,
        payment_date: p.payment_date,
        business_name: (p.business_subscriptions as any)?.businesses?.name || 'Unknown',
        owner_name: (p.business_subscriptions as any)?.businesses?.profiles?.full_name || null,
        subscription_id: p.subscription_id
      }))

      const transformedBannerPayments: Payment[] = (bannerPayments || []).map(b => ({
        id: b.id,
        type: 'banner' as const,
        amount: b.amount_paid || 0,
        payment_method: b.payment_method || 'unknown',
        transaction_id: null,
        payment_date: b.approved_at || new Date().toISOString(),
        business_name: (b.businesses as any)?.name || 'Unknown',
        owner_name: (b.businesses as any)?.profiles?.full_name || null,
        banner_id: b.id
      }))

      const allPayments = [...transformedSubPayments, ...transformedBannerPayments]
        .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())

      // Apply filters
      let filtered = allPayments

      if (typeFilter !== 'all') {
        filtered = filtered.filter(p => p.type === typeFilter)
      }

      if (methodFilter !== 'all') {
        filtered = filtered.filter(p => p.payment_method === methodFilter)
      }

      if (searchQuery.trim()) {
        filtered = filtered.filter(p =>
          p.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.owner_name?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      }

      setPayments(filtered)
    } catch (error) {
      console.error('Error fetching payments:', error)
      toast.error('Error al cargar pagos')
    }
  }

  useEffect(() => {
    if (!hasLoaded.current) return  // skip until initial load completes
    const commId = isSuperAdmin ? (selectedCommunityId === 'all' ? null : selectedCommunityId) : communityId
    if (commId !== undefined) {
      fetchPayments(commId)
    }
  }, [typeFilter, methodFilter, searchQuery, communityId, selectedCommunityId, isSuperAdmin])

  const exportToCSV = () => {
    const headers = ['Fecha', 'Tipo', 'Negocio', 'Propietario', 'Monto', 'Método', 'ID Transacción']
    const rows = payments.map(p => [
      new Date(p.payment_date).toLocaleDateString('es-CO'),
      p.type === 'subscription' ? 'Suscripción' : 'Banner',
      p.business_name,
      p.owner_name || 'N/A',
      p.amount.toString(),
      p.payment_method,
      p.transaction_id || 'N/A'
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `pagos_${new Date().toISOString().split('T')[0]}.csv`)
    link.click()
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <Breadcrumbs
        items={[
          { label: 'Admin', href: '/admin' },
          { label: 'Pagos', active: true }
        ]}
      />

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl md:text-6xl font-heading font-black uppercase tracking-tighter italic border-b-4 border-black pb-2">
          Dashboard de <span className="text-primary">Pagos</span>
        </h1>
      </div>

      {isSuperAdmin && (
        <div className="mb-6">
          <Select value={selectedCommunityId} onValueChange={(v) => setSelectedCommunityId(v)}>
            <SelectTrigger className="brutalist-input w-[280px]">
              <SelectValue placeholder="Comunidad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las comunidades</SelectItem>
              {communities.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="brutalist-card border-primary">
          <CardContent className="p-6 text-center">
            <DollarSign className="w-8 h-8 mx-auto mb-2 text-primary" />
            <div className="text-3xl font-black">${totalRevenue.toLocaleString()}</div>
            <div className="text-xs uppercase tracking-widest font-bold text-gray-600">
              Ingresos Totales
            </div>
          </CardContent>
        </Card>

        <Card className="brutalist-card border-secondary">
          <CardContent className="p-6 text-center">
            <TrendingUp className="w-8 h-8 mx-auto mb-2 text-secondary" />
            <div className="text-3xl font-black">${monthlyRevenue.toLocaleString()}</div>
            <div className="text-xs uppercase tracking-widest font-bold text-gray-600">
              Este Mes
            </div>
          </CardContent>
        </Card>

        <Card className="brutalist-card border-accent">
          <CardContent className="p-6 text-center">
            <Crown className="w-8 h-8 mx-auto mb-2 text-accent" />
            <div className="text-3xl font-black">${subscriptionRevenue.toLocaleString()}</div>
            <div className="text-xs uppercase tracking-widest font-bold text-gray-600">
              Suscripciones
            </div>
          </CardContent>
        </Card>

        <Card className="brutalist-card border-gray-600">
          <CardContent className="p-6 text-center">
            <ImageIcon className="w-8 h-8 mx-auto mb-2 text-gray-600" />
            <div className="text-3xl font-black">${bannerRevenue.toLocaleString()}</div>
            <div className="text-xs uppercase tracking-widest font-bold text-gray-600">
              Banners
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Export */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Buscar por negocio o propietario..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="brutalist-input pl-10"
          />
        </div>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="brutalist-input w-full sm:w-[180px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="subscription">Suscripciones</SelectItem>
            <SelectItem value="banner">Banners</SelectItem>
          </SelectContent>
        </Select>

        <Select value={methodFilter} onValueChange={setMethodFilter}>
          <SelectTrigger className="brutalist-input w-full sm:w-[180px]">
            <SelectValue placeholder="Método" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="manual_transfer">Transferencia</SelectItem>
            <SelectItem value="nequi">Nequi</SelectItem>
            <SelectItem value="cash">Efectivo</SelectItem>
          </SelectContent>
        </Select>

        <button
          onClick={exportToCSV}
          className="brutalist-button bg-secondary text-black hover:bg-secondary/90 px-4 flex items-center gap-2 h-10"
        >
          <Download className="w-4 h-4" />
          Exportar CSV
        </button>
      </div>

      {/* Payments Table */}
      {payments.length === 0 ? (
        <div className="brutalist-card p-12 text-center">
          <DollarSign className="w-16 h-16 mx-auto text-black/20 mb-4" />
          <p className="font-bold uppercase tracking-widest text-sm text-black/40">
            No hay pagos registrados
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {payments.map((payment) => (
            <Card key={`${payment.type}-${payment.id}`} className="brutalist-card hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge className={payment.type === 'subscription' ? 'bg-accent text-white' : 'bg-gray-600 text-white'}>
                        {payment.type === 'subscription' ? 'Suscripción' : 'Banner'}
                      </Badge>
                      <h3 className="font-black text-lg uppercase">
                        {payment.business_name}
                      </h3>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-xs uppercase tracking-widest font-bold text-gray-600 mb-1">
                          Propietario
                        </p>
                        <p className="font-bold">{payment.owner_name || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-widest font-bold text-gray-600 mb-1">
                          Fecha
                        </p>
                        <p className="font-bold">
                          {new Date(payment.payment_date).toLocaleDateString('es-CO', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-widest font-bold text-gray-600 mb-1">
                          Método
                        </p>
                        <p className="font-bold capitalize">{payment.payment_method.replace('_', ' ')}</p>
                      </div>
                      {payment.transaction_id && (
                        <div>
                          <p className="text-xs uppercase tracking-widest font-bold text-gray-600 mb-1">
                            ID Transacción
                          </p>
                          <p className="font-bold text-xs">{payment.transaction_id}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="text-2xl font-black text-primary mb-2">
                      ${payment.amount.toLocaleString()} COP
                    </div>
                    {payment.subscription_id && (
                      <Link href={`/admin/subscriptions/${payment.subscription_id}`}>
                        <span className="text-xs text-accent underline hover:no-underline">
                          Ver Suscripción
                        </span>
                      </Link>
                    )}
                    {payment.banner_id && (
                      <Link href={`/admin/banners/${payment.banner_id}`}>
                        <span className="text-xs text-accent underline hover:no-underline">
                          Ver Banner
                        </span>
                      </Link>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary Footer */}
      <Card className="brutalist-card mt-8 border-primary">
        <CardContent className="p-6">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total de Pagos Mostrados</p>
              <p className="text-3xl font-black">{totalPayments}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 mb-1">Total Ingresado</p>
              <p className="text-3xl font-black text-primary">${totalRevenue.toLocaleString()} COP</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
