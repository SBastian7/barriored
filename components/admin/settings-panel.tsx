'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ColorPickerField } from '@/components/ui/color-picker-field'
import { useToast } from '@/hooks/use-toast'

interface Props {
  communityId: string
  initialSettings: {
    is_active: boolean
    primary_color: string | null
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

  async function handleSave() {
    setLoading(true)

    try {
      const response = await fetch(`/api/admin/communities/${communityId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_active: isActive,
          primary_color: primaryColor,
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

        <ColorPickerField
          label="Color Primario"
          value={primaryColor}
          onChange={setPrimaryColor}
          defaultColor="#1E40AF"
        />
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
