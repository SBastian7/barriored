'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Breadcrumbs } from '@/components/shared/breadcrumbs'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface PlatformConfig {
  id: string
  platform_name: string
  support_email: string | null
  support_phone: string | null
  marketplace_enabled: boolean
  community_posts_enabled: boolean
  new_registrations_open: boolean
  max_businesses_per_community: number | null
  updated_at: string | null
}

export default function PlatformSettingsPage() {
  const [config, setConfig] = useState<PlatformConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/admin/platform/settings')
      .then(async (r) => {
        const json = await r.json()
        if (!r.ok) throw new Error(json.error ?? 'Error al cargar configuración')
        setConfig(json.config)
      })
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!config) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/platform/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error); return }
      setConfig(json.config)
      toast.success('Configuración guardada')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8" /></div>
  if (!config) return null

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-8">
      <Breadcrumbs homeHref="/admin" items={[{ label: 'Admin', href: '/admin' }, { label: 'Plataforma' }, { label: 'Configuración', active: true }]} />
      <h1 className="text-3xl font-black uppercase tracking-tighter italic">Configuración de la Plataforma</h1>

      <form onSubmit={handleSave} className="brutalist-card p-8 space-y-6">
        <div className="space-y-2">
          <Label className="uppercase tracking-widest font-bold text-xs">Nombre de la Plataforma</Label>
          <Input value={config.platform_name} onChange={(e) => setConfig({ ...config, platform_name: e.target.value })} className="brutalist-input" />
        </div>
        <div className="space-y-2">
          <Label className="uppercase tracking-widest font-bold text-xs">Email de Soporte</Label>
          <Input type="email" value={config.support_email || ''} onChange={(e) => setConfig({ ...config, support_email: e.target.value })} className="brutalist-input" />
        </div>
        <div className="space-y-2">
          <Label className="uppercase tracking-widest font-bold text-xs">Teléfono de Soporte</Label>
          <Input value={config.support_phone || ''} onChange={(e) => setConfig({ ...config, support_phone: e.target.value })} className="brutalist-input" />
        </div>
        <div className="space-y-2">
          <Label className="uppercase tracking-widest font-bold text-xs">Máx. Negocios por Comunidad</Label>
          <Input type="number" value={config.max_businesses_per_community ?? ''} onChange={(e) => setConfig({ ...config, max_businesses_per_community: e.target.value ? parseInt(e.target.value) : null })} className="brutalist-input" placeholder="Sin límite" />
        </div>

        <div className="border-t-2 border-black pt-4 space-y-4">
          <p className="uppercase tracking-widest font-black text-xs">Funciones Activas</p>
          {[
            { key: 'marketplace_enabled', label: 'Marketplace' },
            { key: 'community_posts_enabled', label: 'Publicaciones Comunitarias' },
            { key: 'new_registrations_open', label: 'Registro de Nuevos Negocios' },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <Label className="uppercase tracking-widest font-bold text-xs">{label}</Label>
              <Switch
                checked={(config as any)[key]}
                onCheckedChange={(v) => setConfig({ ...config, [key]: v })}
              />
            </div>
          ))}
        </div>

        {config.updated_at && (
          <p className="text-xs text-muted-foreground">Última actualización: {new Date(config.updated_at).toLocaleString('es-CO')}</p>
        )}

        <Button type="submit" disabled={saving} className="brutalist-button w-full">
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </form>
    </div>
  )
}
