'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, ArrowLeft, Flag, CheckCircle, XCircle, Trash2, Clock } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { Breadcrumbs } from '@/components/shared/breadcrumbs'

interface ReviewFlag {
  id: string
  review_id: string
  reason: string
  description: string | null
  status: 'pending' | 'dismissed' | 'reviewed'
  created_at: string
  reviewed_at: string | null
  business_reviews: {
    id: string
    rating: number
    review_text: string
    created_at: string
    business_id: string
    user_id: string
    businesses: {
      name: string
      owner_id: string
    } | null
    profiles: {
      full_name: string | null
    } | null
  } | null
  profiles: {
    full_name: string | null
  } | null
}

const STATUS_CONFIG = {
  pending: {
    label: 'Pendiente',
    icon: Clock,
    variant: 'secondary' as const,
    color: 'text-secondary bg-secondary/10'
  },
  dismissed: {
    label: 'Desestimado',
    icon: XCircle,
    variant: 'default' as const,
    color: 'text-gray-600 bg-gray-50'
  },
  reviewed: {
    label: 'Revisado',
    icon: CheckCircle,
    variant: 'destructive' as const,
    color: 'text-red-600 bg-red-50'
  }
}

export default function AdminReviewFlagDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const supabase = createClient()

  const [flag, setFlag] = useState<ReviewFlag | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFlag()
  }, [id])

  async function fetchFlag() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('review_flags')
        .select(`
          *,
          business_reviews!inner(
            id,
            rating,
            review_text,
            created_at,
            business_id,
            user_id,
            businesses!inner(
              name,
              owner_id
            ),
            profiles!business_reviews_user_id_fkey(full_name)
          ),
          profiles!review_flags_flagged_by_fkey(full_name)
        `)
        .eq('id', id)
        .single()

      if (error) throw error

      // Transform nested structure
      const transformedFlag = {
        ...data,
        business_reviews: {
          id: (data.business_reviews as any)?.id,
          rating: (data.business_reviews as any)?.rating,
          review_text: (data.business_reviews as any)?.review_text,
          created_at: (data.business_reviews as any)?.created_at,
          business_id: (data.business_reviews as any)?.business_id,
          user_id: (data.business_reviews as any)?.user_id,
          businesses: (data.business_reviews as any)?.businesses,
          profiles: (data.business_reviews as any)?.profiles
        },
        profiles: data.profiles
      }

      setFlag(transformedFlag as any)
    } catch (error) {
      console.error('Error fetching flag:', error)
      toast.error('Error al cargar reporte')
      router.push('/admin/review-flags')
    } finally {
      setLoading(false)
    }
  }

  async function handleDismissFlag() {
    try {
      const res = await fetch(`/api/reviews/flags/${id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss' })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al desestimar reporte')
      }

      toast.success('Reporte desestimado')
      fetchFlag()
    } catch (err: any) {
      toast.error(err.message || 'Error al desestimar reporte')
    }
  }

  async function handleRemoveReview() {
    if (!confirm('¿Estás seguro de eliminar esta reseña? Esta acción no se puede deshacer.')) {
      return
    }

    try {
      const res = await fetch(`/api/reviews/flags/${id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove' })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al eliminar reseña')
      }

      toast.success('Reseña eliminada')
      router.push('/admin/review-flags')
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar reseña')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!flag) {
    return null
  }

  const statusInfo = STATUS_CONFIG[flag.status]
  const Icon = statusInfo.icon

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <Breadcrumbs
        items={[
          { label: 'Admin', href: '/admin' },
          { label: 'Reseñas Reportadas', href: '/admin/review-flags' },
          { label: 'Detalle', active: true }
        ]}
      />

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-heading font-black uppercase tracking-tighter italic">
          Reporte de <span className="text-primary">Reseña</span>
        </h1>
        <Link href="/admin/review-flags">
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
                  Reporte de Reseña
                </h2>
                <Badge variant={statusInfo.variant} className="border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  {statusInfo.label}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Flag Info */}
        <Card className="brutalist-card">
          <CardHeader>
            <CardTitle className="font-black uppercase tracking-widest flex items-center gap-2">
              <Flag className="w-5 h-5" />
              Información del Reporte
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs uppercase tracking-widest font-bold text-gray-600 mb-1">
                  Reportado Por
                </p>
                <p className="font-bold">{flag.profiles?.full_name || 'Anónimo'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest font-bold text-gray-600 mb-1">
                  Fecha de Reporte
                </p>
                <p className="font-bold">
                  {new Date(flag.created_at).toLocaleDateString('es-CO', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest font-bold text-gray-600 mb-1">
                  Razón
                </p>
                <Badge className="bg-secondary text-black border-2 border-black">
                  {flag.reason}
                </Badge>
              </div>
              {flag.reviewed_at && (
                <div>
                  <p className="text-xs uppercase tracking-widest font-bold text-gray-600 mb-1">
                    Fecha de Resolución
                  </p>
                  <p className="font-bold">
                    {new Date(flag.reviewed_at).toLocaleDateString('es-CO', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              )}
            </div>

            {flag.description && (
              <div className="pt-4 border-t-2 border-black">
                <p className="text-xs uppercase tracking-widest font-bold text-gray-600 mb-2">
                  Descripción del Reporte
                </p>
                <p className="text-sm">{flag.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Review Full Context */}
        <Card className="brutalist-card border-4 border-primary">
          <CardHeader>
            <CardTitle className="font-black uppercase tracking-widest">
              Reseña Completa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs uppercase tracking-widest font-bold text-gray-600 mb-1">
                  Negocio
                </p>
                <p className="font-bold">{flag.business_reviews?.businesses?.name || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest font-bold text-gray-600 mb-1">
                  Usuario que Reseñó
                </p>
                <p className="font-bold">{flag.business_reviews?.profiles?.full_name || 'Anónimo'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest font-bold text-gray-600 mb-1">
                  Calificación
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex text-lg">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span key={star} className={star <= (flag.business_reviews?.rating || 0) ? 'text-secondary' : 'text-gray-300'}>
                        ★
                      </span>
                    ))}
                  </div>
                  <span className="font-black">{flag.business_reviews?.rating}/5</span>
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest font-bold text-gray-600 mb-1">
                  Fecha de Publicación
                </p>
                <p className="font-bold">
                  {flag.business_reviews?.created_at && new Date(flag.business_reviews.created_at).toLocaleDateString('es-CO', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t-2 border-black">
              <p className="text-xs uppercase tracking-widest font-bold text-gray-600 mb-2">
                Comentario
              </p>
              <div className="brutalist-card p-4 bg-gray-50">
                <p className="text-sm whitespace-pre-wrap">
                  {flag.business_reviews?.review_text || 'Sin comentario'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resolution Actions */}
        {flag.status === 'pending' && (
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="brutalist-card border-gray-600">
              <CardHeader>
                <CardTitle className="font-black uppercase tracking-widest text-sm flex items-center gap-2">
                  <XCircle className="w-4 h-4" />
                  Desestimar Reporte
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  La reseña permanecerá visible. El reporte se marcará como desestimado.
                </p>
                <Button
                  onClick={handleDismissFlag}
                  className="brutalist-button bg-gray-600 text-white hover:bg-gray-700 w-full"
                >
                  Desestimar
                </Button>
              </CardContent>
            </Card>

            <Card className="brutalist-card border-red-600">
              <CardHeader>
                <CardTitle className="font-black uppercase tracking-widest text-sm flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  Eliminar Reseña
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  La reseña será eliminada permanentemente de la plataforma.
                </p>
                <Button
                  onClick={handleRemoveReview}
                  className="brutalist-button bg-red-600 text-white hover:bg-red-700 w-full"
                >
                  Eliminar Reseña
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Resolved Status Message */}
        {flag.status !== 'pending' && (
          <Card className="brutalist-card border-primary">
            <CardContent className="p-6 text-center">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-primary" />
              <p className="font-black uppercase tracking-widest text-lg">
                Este reporte ya ha sido resuelto
              </p>
              <p className="text-sm text-gray-600 mt-2">
                {flag.status === 'dismissed'
                  ? 'El reporte fue desestimado y la reseña permanece visible.'
                  : 'El reporte fue revisado y la reseña fue eliminada de la plataforma.'
                }
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
