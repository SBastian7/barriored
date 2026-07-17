'use client'

import { useEffect, useState } from 'react'
import { Crown, Clock, XCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PremiumStatusWidgetProps {
  businessId: string
}

interface Subscription {
  id: string
  status: 'requested' | 'active' | 'cancelled'
  requested_at: string
  activated_at?: string
  expires_at?: string
  cancelled_at?: string
  cancellation_reason?: string
}

export function PremiumStatusWidget({ businessId }: PremiumStatusWidgetProps) {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    async function fetchSubscription() {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`/api/subscriptions/${businessId}`)

        if (res.status === 404) {
          setSubscription(null)
        } else if (res.ok) {
          const data = await res.json()
          setSubscription(data.subscription)
        } else {
          throw new Error('Error al cargar el estado de suscripción')
        }
      } catch (err) {
        console.error('Error fetching subscription:', err)
        setError(err instanceof Error ? err.message : 'Error desconocido')
      } finally {
        setLoading(false)
      }
    }

    fetchSubscription()
  }, [businessId])

  const handleRequestPremium = async () => {
    try {
      setIsSubmitting(true)
      setError(null)
      const res = await fetch(`/api/subscriptions/${businessId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (res.ok) {
        const data = await res.json()
        setSubscription(data.subscription)
      } else {
        const error = await res.json()
        throw new Error(error.error || 'Error al solicitar premium')
      }
    } catch (err) {
      console.error('Error requesting premium:', err)
      setError(err instanceof Error ? err.message : 'Error al solicitar premium')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancelSubscription = async () => {
    try {
      setIsSubmitting(true)
      setError(null)
      const res = await fetch(`/api/subscriptions/${businessId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Cancelado por el usuario' })
      })

      if (res.ok) {
        const data = await res.json()
        setSubscription(data.subscription)
        setShowCancelDialog(false)
      } else {
        const error = await res.json()
        throw new Error(error.error || 'Error al cancelar suscripción')
      }
    } catch (err) {
      console.error('Error cancelling subscription:', err)
      setError(err instanceof Error ? err.message : 'Error al cancelar suscripción')
      setShowCancelDialog(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="brutalist-card p-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded mb-4 w-1/2" />
        <div className="h-20 bg-gray-200 rounded" />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="brutalist-card p-6 bg-red-50 border-red-600">
        <div className="flex items-start gap-4">
          <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
          <div>
            <h3 className="font-black text-sm uppercase tracking-widest mb-2">
              Error
            </h3>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  // No subscription - show CTA
  if (!subscription) {
    return (
      <div className="brutalist-card p-6 bg-gradient-to-br from-secondary/10 to-white border-secondary">
        <div className="flex items-start gap-4">
          <Crown className="w-8 h-8 text-secondary flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-black text-xl uppercase tracking-widest mb-2">
              Hazte Premium
            </h3>
            <p className="text-sm mb-4">
              Destaca tu negocio con badge premium, aparición prioritaria y mayor visibilidad.
            </p>
            <Button
              onClick={handleRequestPremium}
              disabled={isSubmitting}
              className="brutalist-button bg-secondary text-black hover:bg-secondary/90"
            >
              {isSubmitting ? 'Solicitando...' : 'Solicitar Premium'}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Requested status
  if (subscription.status === 'requested') {
    const requestedDate = new Date(subscription.requested_at).toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })

    return (
      <div className="brutalist-card p-6 border-secondary">
        <div className="flex items-start gap-4">
          <Clock className="w-8 h-8 text-secondary flex-shrink-0" />
          <div className="flex-1">
            <span className="inline-block px-3 py-1 bg-secondary text-black font-black uppercase text-xs tracking-widest rotate-[-2deg] mb-3">
              Solicitud Pendiente
            </span>
            <p className="text-sm mb-1">
              <strong>Enviado el:</strong> {requestedDate}
            </p>
            <p className="text-sm text-gray-600">
              Un administrador revisará tu solicitud pronto.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Active status
  if (subscription.status === 'active') {
    const expiresDate = subscription.expires_at
      ? new Date(subscription.expires_at).toLocaleDateString('es-CO', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })
      : 'No especificado'

    return (
      <div className="brutalist-card p-6 border-primary">
        <div className="flex items-start gap-4">
          <Crown className="w-8 h-8 text-primary flex-shrink-0" />
          <div className="flex-1">
            <span className="inline-block px-3 py-1 bg-primary text-white font-black uppercase text-xs tracking-widest rotate-[-2deg] mb-3">
              Premium Activo
            </span>
            <p className="text-sm mb-4">
              <strong>Válido hasta:</strong> {expiresDate}
            </p>
            <Button
              onClick={() => setShowCancelDialog(true)}
              disabled={isSubmitting}
              variant="outline"
              className="brutalist-button border-red-600 text-red-600 hover:bg-red-50"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Cancelar Suscripción
            </Button>
          </div>
        </div>

        {/* Cancel Confirmation Dialog */}
        {showCancelDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="brutalist-card max-w-md w-full p-6 bg-white">
              <h3 className="font-black text-lg uppercase tracking-widest mb-4">
                ¿Cancelar Premium?
              </h3>
              <p className="text-sm mb-6">
                Perderás tu badge premium y posición destacada. ¿Estás seguro?
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={handleCancelSubscription}
                  disabled={isSubmitting}
                  className="brutalist-button bg-red-600 text-white hover:bg-red-700 flex-1"
                >
                  {isSubmitting ? 'Cancelando...' : 'Sí, Cancelar'}
                </Button>
                <Button
                  onClick={() => setShowCancelDialog(false)}
                  disabled={isSubmitting}
                  variant="outline"
                  className="brutalist-button flex-1"
                >
                  No, Mantener
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Cancelled status
  if (subscription.status === 'cancelled') {
    const cancelledDate = subscription.cancelled_at
      ? new Date(subscription.cancelled_at).toLocaleDateString('es-CO', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })
      : null

    return (
      <div className="brutalist-card p-6 border-gray-400">
        <div className="flex items-start gap-4">
          <XCircle className="w-8 h-8 text-gray-600 flex-shrink-0" />
          <div className="flex-1">
            <span className="inline-block px-3 py-1 bg-gray-400 text-white font-black uppercase text-xs tracking-widest rotate-[-2deg] mb-3">
              Cancelado
            </span>
            {cancelledDate && (
              <p className="text-sm mb-2 text-gray-600">
                <strong>Cancelado el:</strong> {cancelledDate}
              </p>
            )}
            {subscription.cancellation_reason && (
              <p className="text-sm mb-4 text-gray-600">
                {subscription.cancellation_reason}
              </p>
            )}
            <Button
              onClick={handleRequestPremium}
              disabled={isSubmitting}
              className="brutalist-button bg-secondary text-black hover:bg-secondary/90"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Solicitando...' : 'Renovar Premium'}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
