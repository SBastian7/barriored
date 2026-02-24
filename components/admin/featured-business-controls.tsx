'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useRouter } from 'next/navigation'

type Business = {
  id: string
  is_featured: boolean | null
  featured_order: number | null
  featured_requested: boolean | null
  featured_requested_at: string | null
}

type FeaturedBusinessControlsProps = {
  business: Business
  isSuperAdmin: boolean
  isCommunityAdmin: boolean
}

export function FeaturedBusinessControls({
  business,
  isSuperAdmin,
  isCommunityAdmin
}: FeaturedBusinessControlsProps) {
  const router = useRouter()
  const [isFeatured, setIsFeatured] = useState(business.is_featured ?? false)
  const [featuredOrder, setFeaturedOrder] = useState(business.featured_order ?? 1)
  const [loading, setLoading] = useState(false)

  const handleSaveFeatured = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/businesses/${business.id}/featured`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_featured: isFeatured,
          featured_order: isFeatured ? featuredOrder : null,
        }),
      })

      if (res.ok) {
        router.refresh()
        alert('Cambios guardados exitosamente')
      } else {
        const error = await res.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      alert('Error al guardar cambios')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleRequestFeatured = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/businesses/${business.id}/featured`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (res.ok) {
        router.refresh()
        alert('Solicitud enviada exitosamente')
      } else {
        const error = await res.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      alert('Error al enviar solicitud')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  // Render nothing if user has no admin permissions
  if (!isSuperAdmin && !isCommunityAdmin) {
    return null
  }

  // Super Admin View
  if (isSuperAdmin) {
    return (
      <div className="brutalist-card p-6">
        <h3 className="font-heading font-black uppercase text-lg mb-4">
          Destacar Negocio
        </h3>

        {business.featured_requested && (
          <div className="mb-4 p-3 bg-secondary/20 border-2 border-black">
            <p className="text-sm font-bold">
              ⚠️ Solicitud pendiente de destacado
            </p>
            <p className="text-xs text-muted-foreground">
              Solicitado: {business.featured_requested_at
                ? new Date(business.featured_requested_at).toLocaleDateString('es-CO')
                : 'Fecha desconocida'}
            </p>
          </div>
        )}

        <div className="flex items-center gap-3 mb-4">
          <Switch
            checked={isFeatured}
            onCheckedChange={setIsFeatured}
            disabled={loading}
          />
          <Label>Marcar como negocio destacado</Label>
        </div>

        {isFeatured && (
          <div className="mb-4">
            <Label htmlFor="featured-order">Orden de visualización</Label>
            <Input
              id="featured-order"
              type="number"
              value={featuredOrder}
              onChange={(e) => setFeaturedOrder(Number(e.target.value))}
              placeholder="1, 2, 3..."
              className="brutalist-input mt-1"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Números menores aparecen primero en el homepage
            </p>
          </div>
        )}

        <Button
          onClick={handleSaveFeatured}
          disabled={loading}
          className="brutalist-button"
        >
          {loading ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </div>
    )
  }

  // Community Admin View
  if (isCommunityAdmin) {
    return (
      <div className="brutalist-card p-6">
        <h3 className="font-heading font-black uppercase text-lg mb-4">
          Solicitar Destacado
        </h3>

        {business.featured_requested ? (
          <div className="p-3 bg-secondary/20 border-2 border-black">
            <p className="text-sm font-bold">✓ Solicitud enviada</p>
            <p className="text-xs text-muted-foreground">
              Pendiente de aprobación por super admin
            </p>
          </div>
        ) : business.is_featured ? (
          <div className="p-3 bg-primary/20 border-2 border-black">
            <p className="text-sm font-bold">★ Negocio destacado</p>
            <p className="text-xs text-muted-foreground">
              Este negocio está actualmente destacado
            </p>
          </div>
        ) : (
          <Button
            onClick={handleRequestFeatured}
            disabled={loading}
            className="brutalist-button"
          >
            {loading ? 'Enviando...' : 'Solicitar destacar este negocio'}
          </Button>
        )}
      </div>
    )
  }

  return null
}
