'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'

interface Props {
  communityId: string
  initialSettings: {
    is_active: boolean
    primary_color: string | null
    logo_url: string | null
  }
}

export function SettingsPanel({ communityId, initialSettings }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [isActive, setIsActive] = useState(initialSettings.is_active ?? true)
  const [primaryColor, setPrimaryColor] = useState(
    initialSettings.primary_color || '#1E40AF'
  )
  const [logoUrl, setLogoUrl] = useState(initialSettings.logo_url || '')

  async function handleSave() {
    setLoading(true)

    try {
      const response = await fetch(`/api/admin/communities/${communityId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_active: isActive,
          primary_color: primaryColor,
          logo_url: logoUrl || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al guardar')
      }

      toast({
        title: 'Configuración guardada',
        description: 'Los cambios se han guardado correctamente',
      })

      router.refresh()
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al guardar',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="brutalist-card p-8 space-y-8">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label
              htmlFor="is-active"
              className="uppercase tracking-widest font-bold text-xs"
            >
              Estado de la Comunidad
            </Label>
            <p className="text-sm text-muted-foreground">
              {isActive ? 'La comunidad está activa y visible' : 'La comunidad está desactivada'}
            </p>
          </div>
          <Switch
            id="is-active"
            checked={isActive}
            onCheckedChange={setIsActive}
          />
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="primary-color"
            className="uppercase tracking-widest font-bold text-xs"
          >
            Color Primario
          </Label>
          <div className="flex items-center gap-4">
            <Input
              id="primary-color"
              type="text"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              placeholder="#1E40AF"
              className="brutalist-input flex-1"
            />
            <div
              className="w-12 h-12 border-2 border-black rounded-md"
              style={{ backgroundColor: primaryColor }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Formato hexadecimal (ej: #1E40AF)
          </p>
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="logo-url"
            className="uppercase tracking-widest font-bold text-xs"
          >
            URL del Logo
          </Label>
          <Input
            id="logo-url"
            type="url"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://..."
            className="brutalist-input"
          />
        </div>
      </div>

      <div className="pt-6 border-t-2 border-black">
        <Button
          onClick={handleSave}
          disabled={loading}
          className="brutalist-button w-full"
        >
          {loading ? 'Guardando...' : 'Guardar Configuración'}
        </Button>
      </div>
    </div>
  )
}
