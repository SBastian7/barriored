'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, ArrowLeft, Crown, Clock, XCircle, DollarSign, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { Breadcrumbs } from '@/components/shared/breadcrumbs'

interface Subscription {
  id: string
  business_id: string
  status: 'requested' | 'active' | 'cancelled'
  requested_at: string
  activated_at: string | null
  expires_at: string | null
  cancelled_at: string | null
  cancellation_reason: string | null
  businesses: {
    name: string
    owner_id: string
    profiles: {
      full_name: string | null
      email: string | null
    } | null
  } | null
}

interface Payment {
  id: string
  amount: number
  payment_method: string
  transaction_id: string | null
  payment_date: string
  created_at: string
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
    icon: Crown,
    variant: 'default' as const,
    color: 'text-primary bg-primary/10'
  },
  cancelled: {
    label: 'Cancelado',
    icon: XCircle,
    variant: 'destructive' as const,
    color: 'text-red-600 bg-red-50'
  }
}

export default function AdminSubscriptionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const supabase = createClient()

  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [showActivateForm, setShowActivateForm] = useState(false)
  const [showPaymentForm, setShowPaymentForm] = useState(false)

  // Activate form state
  const [activateData, setActivateData] = useState({
    duration_months: '1',
    amount: '',
    payment_method: 'manual_transfer'
  })

  // Payment form state
  const [paymentData, setPaymentData] = useState({
    amount: '',
    payment_method: 'manual_transfer',
    transaction_id: ''
  })

  useEffect(() => {
    fetchSubscriptionData()
  }, [id])

  async function fetchSubscriptionData() {
    setLoading(true)
    try {
      // Fetch subscription
      const { data: subData, error: subError } = await supabase
        .from('business_subscriptions')
        .select(`
          *,
          businesses!inner(
            name,
            owner_id,
            profiles!businesses_owner_id_profiles_fkey(full_name, email)
          )
        `)
        .eq('id', id)
        .single()

      if (subError) throw subError

      // Transform nested structure
      const transformedSub = {
        ...subData,
        businesses: {
          name: (subData.businesses as any)?.name,
          owner_id: (subData.businesses as any)?.owner_id,
          profiles: (subData.businesses as any)?.profiles
        }
      }

      setSubscription(transformedSub)

      // Fetch payments
      const { data: paymentsData } = await supabase
        .from('subscription_payments')
        .select('*')
        .eq('subscription_id', id)
        .order('payment_date', { ascending: false })

      setPayments(paymentsData || [])
    } catch (error) {
      console.error('Error fetching subscription:', error)
      toast.error('Error al cargar suscripción')
      router.push('/admin/subscriptions')
    } finally {
      setLoading(false)
    }
  }

  async function handleActivateSubscription() {
    if (!activateData.amount) {
      toast.error('Ingresa el monto del pago')
      return
    }

    try {
      const res = await fetch(`/api/admin/subscriptions/${id}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activateData)
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al activar suscripción')
      }

      toast.success('Suscripción activada exitosamente')
      setShowActivateForm(false)
      fetchSubscriptionData()
    } catch (err: any) {
      toast.error(err.message || 'Error al activar suscripción')
    }
  }

  async function handleRecordPayment() {
    if (!paymentData.amount) {
      toast.error('Ingresa el monto del pago')
      return
    }

    try {
      const res = await fetch(`/api/admin/subscriptions/${id}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData)
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al registrar pago')
      }

      toast.success('Pago registrado exitosamente')
      setShowPaymentForm(false)
      setPaymentData({ amount: '', payment_method: 'manual_transfer', transaction_id: '' })
      fetchSubscriptionData()
    } catch (err: any) {
      toast.error(err.message || 'Error al registrar pago')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!subscription) {
    return null
  }

  const statusInfo = STATUS_CONFIG[subscription.status]
  const Icon = statusInfo.icon
  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0)

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <Breadcrumbs
        items={[
          { label: 'Admin', href: '/admin' },
          { label: 'Suscripciones', href: '/admin/subscriptions' },
          { label: subscription.businesses?.name || 'Detalle', active: true }
        ]}
      />

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-heading font-black uppercase tracking-tighter italic">
          Detalle de <span className="text-primary">Suscripción</span>
        </h1>
        <Link href="/admin/subscriptions">
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
                  {subscription.businesses?.name}
                </h2>
                <Badge variant={statusInfo.variant} className="border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  {statusInfo.label}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Business & Owner Info */}
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
                  Propietario
                </p>
                <p className="font-bold">{subscription.businesses?.profiles?.full_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest font-bold text-gray-600 mb-1">
                  Email
                </p>
                <p className="font-bold">{subscription.businesses?.profiles?.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest font-bold text-gray-600 mb-1">
                  Solicitado
                </p>
                <p className="font-bold">
                  {new Date(subscription.requested_at).toLocaleDateString('es-CO', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              </div>
              {subscription.activated_at && (
                <div>
                  <p className="text-xs uppercase tracking-widest font-bold text-gray-600 mb-1">
                    Activado
                  </p>
                  <p className="font-bold">
                    {new Date(subscription.activated_at).toLocaleDateString('es-CO', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              )}
              {subscription.expires_at && (
                <div>
                  <p className="text-xs uppercase tracking-widest font-bold text-gray-600 mb-1">
                    Expira
                  </p>
                  <p className="font-bold">
                    {new Date(subscription.expires_at).toLocaleDateString('es-CO', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              )}
              {subscription.cancelled_at && (
                <div>
                  <p className="text-xs uppercase tracking-widest font-bold text-gray-600 mb-1">
                    Cancelado
                  </p>
                  <p className="font-bold">
                    {new Date(subscription.cancelled_at).toLocaleDateString('es-CO', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              )}
            </div>
            {subscription.cancellation_reason && (
              <div className="pt-4 border-t-2 border-black">
                <p className="text-xs uppercase tracking-widest font-bold text-gray-600 mb-1">
                  Razón de Cancelación
                </p>
                <p className="text-sm">{subscription.cancellation_reason}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        {subscription.status === 'requested' && (
          <Card className="brutalist-card border-secondary">
            <CardHeader>
              <CardTitle className="font-black uppercase tracking-widest flex items-center gap-2">
                <Crown className="w-5 h-5" />
                Activar Suscripción
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!showActivateForm ? (
                <Button
                  onClick={() => setShowActivateForm(true)}
                  className="brutalist-button bg-secondary text-black hover:bg-secondary/90 w-full"
                >
                  Activar Premium
                </Button>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest mb-2 block">
                      Duración (Meses)
                    </label>
                    <select
                      value={activateData.duration_months}
                      onChange={(e) => setActivateData({ ...activateData, duration_months: e.target.value })}
                      className="brutalist-input w-full"
                    >
                      <option value="1">1 Mes</option>
                      <option value="3">3 Meses</option>
                      <option value="6">6 Meses</option>
                      <option value="12">12 Meses</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest mb-2 block">
                      Monto (COP)
                    </label>
                    <input
                      type="number"
                      value={activateData.amount}
                      onChange={(e) => setActivateData({ ...activateData, amount: e.target.value })}
                      placeholder="50000"
                      className="brutalist-input w-full"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest mb-2 block">
                      Método de Pago
                    </label>
                    <select
                      value={activateData.payment_method}
                      onChange={(e) => setActivateData({ ...activateData, payment_method: e.target.value })}
                      className="brutalist-input w-full"
                    >
                      <option value="manual_transfer">Transferencia Manual</option>
                      <option value="nequi">Nequi</option>
                      <option value="cash">Efectivo</option>
                    </select>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button
                      onClick={handleActivateSubscription}
                      className="brutalist-button bg-primary text-white hover:bg-primary/90 flex-1"
                    >
                      Confirmar Activación
                    </Button>
                    <Button
                      onClick={() => setShowActivateForm(false)}
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
        )}

        {subscription.status === 'active' && (
          <Card className="brutalist-card border-primary">
            <CardHeader>
              <CardTitle className="font-black uppercase tracking-widest flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Registrar Pago
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!showPaymentForm ? (
                <Button
                  onClick={() => setShowPaymentForm(true)}
                  className="brutalist-button bg-primary text-white hover:bg-primary/90 w-full"
                >
                  Nuevo Pago
                </Button>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest mb-2 block">
                      Monto (COP)
                    </label>
                    <input
                      type="number"
                      value={paymentData.amount}
                      onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                      placeholder="50000"
                      className="brutalist-input w-full"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest mb-2 block">
                      Método de Pago
                    </label>
                    <select
                      value={paymentData.payment_method}
                      onChange={(e) => setPaymentData({ ...paymentData, payment_method: e.target.value })}
                      className="brutalist-input w-full"
                    >
                      <option value="manual_transfer">Transferencia Manual</option>
                      <option value="nequi">Nequi</option>
                      <option value="cash">Efectivo</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest mb-2 block">
                      ID de Transacción (Opcional)
                    </label>
                    <input
                      type="text"
                      value={paymentData.transaction_id}
                      onChange={(e) => setPaymentData({ ...paymentData, transaction_id: e.target.value })}
                      placeholder="TX123456"
                      className="brutalist-input w-full"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button
                      onClick={handleRecordPayment}
                      className="brutalist-button bg-primary text-white hover:bg-primary/90 flex-1"
                    >
                      Registrar Pago
                    </Button>
                    <Button
                      onClick={() => setShowPaymentForm(false)}
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
        )}

        {/* Payment History */}
        <Card className="brutalist-card">
          <CardHeader>
            <CardTitle className="font-black uppercase tracking-widest flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Historial de Pagos
              </span>
              <span className="text-primary">
                ${totalRevenue.toLocaleString()} COP
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No hay pagos registrados
              </p>
            ) : (
              <div className="space-y-3">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="border-2 border-black p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-black text-lg">
                          ${payment.amount.toLocaleString()} COP
                        </p>
                        <p className="text-xs uppercase tracking-widest font-bold text-gray-600">
                          {payment.payment_method.replace('_', ' ')}
                        </p>
                        {payment.transaction_id && (
                          <p className="text-xs text-gray-500 mt-1">
                            TX: {payment.transaction_id}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">
                          {new Date(payment.payment_date).toLocaleDateString('es-CO', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
