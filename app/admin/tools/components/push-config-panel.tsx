'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2, Save, AlertCircle } from 'lucide-react'

export function PushConfigPanel() {
  const [communities, setCommunities] = useState<any[]>([])
  const [selectedCommunity, setSelectedCommunity] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState({
    is_enabled: true,
    max_per_day: 10,
    current_count_today: 0
  })

  useEffect(() => {
    fetchCommunities()
  }, [])

  useEffect(() => {
    if (selectedCommunity) {
      fetchConfig()
    }
  }, [selectedCommunity])

  async function fetchCommunities() {
    try {
      const res = await fetch('/api/communities')
      if (res.ok) {
        const data = await res.json()
        setCommunities(data)
        if (data.length > 0) {
          setSelectedCommunity(data[0].id)
        }
      }
    } catch (error) {
      console.error('Fetch communities error:', error)
    }
  }

  async function fetchConfig() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/notifications/config?community_id=${selectedCommunity}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setConfig({
        is_enabled: data.is_enabled,
        max_per_day: data.max_per_day,
        current_count_today: data.current_count_today
      })
    } catch (error) {
      console.error('Fetch config error:', error)
      toast.error('Error al cargar configuración')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/notifications/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          community_id: selectedCommunity,
          is_enabled: config.is_enabled,
          max_per_day: config.max_per_day
        })
      })

      if (!res.ok) throw new Error('Failed to save')

      toast.success('✅ Configuración guardada')
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Error al guardar configuración')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card className="border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <CardContent className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      <CardHeader>
        <CardTitle className="font-heading font-black uppercase italic">
          Configuración Global
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Community Selector */}
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest text-black/40">
            Comunidad
          </Label>
          <Select value={selectedCommunity} onValueChange={setSelectedCommunity}>
            <SelectTrigger className="brutalist-input">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {communities.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status Toggle */}
        <div className="flex items-center justify-between p-4 border-2 border-black rounded-none">
          <div>
            <Label className="text-sm font-bold">Notificaciones Activadas</Label>
            <p className="text-xs text-black/60">
              Cuando están desactivadas, no se envían notificaciones
            </p>
          </div>
          <Switch
            checked={config.is_enabled}
            onCheckedChange={(checked) => setConfig({ ...config, is_enabled: checked })}
          />
        </div>

        {!config.is_enabled && (
          <div className="p-3 bg-yellow-50 border-2 border-yellow-500 rounded-none">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
              <p className="text-sm font-bold text-yellow-800">
                ⚠️ Las notificaciones están desactivadas para esta comunidad
              </p>
            </div>
          </div>
        )}

        {/* Rate Limit */}
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest text-black/40">
            Límite Diario
          </Label>
          <Input
            type="number"
            min={1}
            max={50}
            value={config.max_per_day}
            onChange={(e) => setConfig({ ...config, max_per_day: parseInt(e.target.value) })}
            className="brutalist-input"
          />
          <p className="text-xs text-black/60">
            {config.current_count_today} / {config.max_per_day} enviadas hoy
          </p>
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full brutalist-button bg-primary text-white"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Guardar Configuración
        </Button>
      </CardContent>
    </Card>
  )
}
