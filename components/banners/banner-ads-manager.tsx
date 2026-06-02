'use client'

import { useEffect, useState } from 'react'
import { ImageIcon, Clock, CheckCircle, XCircle, PauseCircle } from 'lucide-react'
import { BannerAdUpload } from './banner-ad-upload'
import { Badge } from '@/components/ui/badge'

interface BannerAdsManagerProps {
  businessId: string
}

interface BannerAd {
  id: string
  title: string
  image_url: string
  placement: 'homepage' | 'directory'
  link_url: string | null
  status: 'requested' | 'active' | 'paused' | 'expired' | 'rejected'
  requested_at: string
  reviewed_at: string | null
  rejection_reason: string | null
}

const STATUS_CONFIG = {
  requested: {
    label: 'Pendiente',
    icon: Clock,
    color: 'bg-secondary text-black',
    borderColor: 'border-secondary'
  },
  active: {
    label: 'Activo',
    icon: CheckCircle,
    color: 'bg-primary text-white',
    borderColor: 'border-primary'
  },
  paused: {
    label: 'Pausado',
    icon: PauseCircle,
    color: 'bg-gray-400 text-white',
    borderColor: 'border-gray-400'
  },
  expired: {
    label: 'Expirado',
    icon: Clock,
    color: 'bg-gray-200 text-gray-600',
    borderColor: 'border-gray-300'
  },
  rejected: {
    label: 'Rechazado',
    icon: XCircle,
    color: 'bg-red-600 text-white',
    borderColor: 'border-red-600'
  }
}

export function BannerAdsManager({ businessId }: BannerAdsManagerProps) {
  const [banners, setBanners] = useState<BannerAd[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBanners = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/banners?businessId=${businessId}`)

      if (!res.ok) {
        throw new Error('Error al cargar banners')
      }

      const data = await res.json()
      setBanners(data.banners || [])
    } catch (err) {
      console.error('Error fetching banners:', err)
      setError(err instanceof Error ? err.message : 'Error al cargar banners')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBanners()
  }, [businessId])

  const handleUploadSuccess = () => {
    fetchBanners()
  }

  return (
    <div className="space-y-8">
      {/* Section Heading */}
      <h2 className="font-black text-2xl uppercase tracking-widest italic">
        Banners Publicitarios
      </h2>

      {/* Upload Form */}
      <div className="brutalist-card p-6 bg-white">
        <h3 className="font-black text-lg uppercase tracking-widest mb-4">
          Solicitar Nuevo Banner
        </h3>
        <BannerAdUpload businessId={businessId} onSuccess={handleUploadSuccess} />
      </div>

      {/* Banners List */}
      <div>
        <h3 className="font-black text-lg uppercase tracking-widest mb-4">
          Mis Banners
        </h3>

        {loading ? (
          <div className="brutalist-card p-6 animate-pulse">
            <div className="h-24 bg-gray-200 rounded" />
          </div>
        ) : error ? (
          <div className="brutalist-card p-6 border-red-600 bg-red-50">
            <p className="text-red-700 font-bold uppercase tracking-widest text-sm">
              {error}
            </p>
          </div>
        ) : banners.length === 0 ? (
          <div className="brutalist-card p-12 text-center">
            <ImageIcon className="w-16 h-16 mx-auto text-black/20 mb-4" />
            <p className="font-bold uppercase tracking-widest text-sm text-black/40">
              No tienes banners solicitados
            </p>
            <p className="text-xs text-black/60 mt-2">
              Completa el formulario arriba para solicitar tu primer banner
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
                <div
                  key={banner.id}
                  className={`brutalist-card p-4 bg-white ${statusInfo.borderColor}`}
                >
                  <div className="flex gap-4">
                    {/* Banner Image Thumbnail */}
                    <div className="w-32 h-24 flex-shrink-0 border-2 border-black overflow-hidden">
                      <img
                        src={banner.image_url}
                        alt={banner.title}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Banner Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-black text-lg uppercase truncate">
                            {banner.title}
                          </h4>
                          <p className="text-xs text-gray-600 uppercase tracking-widest">
                            {banner.placement === 'homepage' ? 'Homepage' : 'Directorio'} • {requestedDate}
                          </p>
                        </div>

                        {/* Status Badge */}
                        <Badge
                          className={`${statusInfo.color} border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] gap-1`}
                        >
                          <Icon className="w-3 h-3" />
                          {statusInfo.label}
                        </Badge>
                      </div>

                      {/* Link URL */}
                      {banner.link_url && (
                        <p className="text-xs text-gray-600 mb-2">
                          <strong>URL:</strong>{' '}
                          <a
                            href={banner.link_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline hover:text-primary"
                          >
                            {banner.link_url}
                          </a>
                        </p>
                      )}

                      {/* Rejection Reason */}
                      {banner.status === 'rejected' && banner.rejection_reason && (
                        <div className="brutalist-card p-2 bg-red-50 border-red-600 mt-2">
                          <p className="text-xs text-red-700">
                            <strong>Razón:</strong> {banner.rejection_reason}
                          </p>
                        </div>
                      )}

                      {/* Approved Date */}
                      {banner.status === 'active' && banner.reviewed_at && (
                        <p className="text-xs text-green-700 font-bold mt-2">
                          ✅ Aprobado el{' '}
                          {new Date(banner.reviewed_at).toLocaleDateString('es-CO', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
