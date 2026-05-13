'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Breadcrumbs } from '@/components/shared/breadcrumbs'
import { toast } from 'sonner'
import { Loader2, AlertTriangle } from 'lucide-react'

interface GatewayConfig {
  id: string
  gateway: string
  is_enabled: boolean
  environment: string
  public_key: string | null
  private_key: string | null
  webhook_secret: string | null
  account_identifier: string | null
  commission_rate: number
  updated_at: string | null
}

const GATEWAY_LABELS: Record<string, string> = {
  wompi: 'Wompi',
  nequi: 'Nequi',
  mercadopago: 'MercadoPago',
}

export default function PlatformPaymentsPage() {
  const [gateways, setGateways] = useState<GatewayConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [drafts, setDrafts] = useState<Record<string, Partial<GatewayConfig>>>({})
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/platform/payments')
      .then(async (r) => {
        const json = await r.json()
        if (!r.ok) throw new Error(json.error ?? 'Error al cargar pasarelas')
        setGateways(json.gateways || [])
        const initial: Record<string, Partial<GatewayConfig>> = {}
        for (const g of json.gateways || []) initial[g.gateway] = { ...g }
        setDrafts(initial)
      })
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false))
  }, [])

  function updateDraft(gateway: string, field: string, value: any) {
    setDrafts((prev) => ({ ...prev, [gateway]: { ...prev[gateway], [field]: value } }))
  }

  async function handleSave(gateway: string) {
    setSaving(gateway)
    try {
      const res = await fetch(`/api/admin/platform/payments/${gateway}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(drafts[gateway]),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Error al guardar'); return }
      // Update drafts with the masked response
      setDrafts((prev) => ({ ...prev, [gateway]: { ...prev[gateway], ...json.gateway } }))
      toast.success(`${GATEWAY_LABELS[gateway]} actualizado`)
    } finally {
      setSaving(null)
    }
  }

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8" /></div>

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8">
      <Breadcrumbs items={[{ label: 'Admin', href: '/admin' }, { label: 'Plataforma' }, { label: 'Pagos', active: true }]} />
      <h1 className="text-3xl font-black uppercase tracking-tighter italic">Pasarelas de Pago</h1>

      <div className="brutalist-card p-4 flex gap-3 border-yellow-500 bg-yellow-50">
        <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
        <p className="text-sm text-yellow-800">
          Las claves privadas se almacenan en la base de datos con RLS. Para producción, migrar a Supabase Vault.
        </p>
      </div>

      <Tabs defaultValue={gateways[0]?.gateway}>
        <TabsList className="brutalist-card inline-flex">
          {gateways.map((g) => (
            <TabsTrigger key={g.gateway} value={g.gateway} className="uppercase tracking-widest font-bold text-xs">
              {GATEWAY_LABELS[g.gateway]}
              {drafts[g.gateway]?.is_enabled && <Badge className="ml-2 bg-green-500 text-white text-[10px]">ON</Badge>}
            </TabsTrigger>
          ))}
        </TabsList>

        {gateways.map((g) => {
          const d = drafts[g.gateway] || g
          return (
            <TabsContent key={g.gateway} value={g.gateway}>
              <div className="brutalist-card p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <Label className="uppercase tracking-widest font-bold text-xs">Habilitado</Label>
                  <Switch checked={!!d.is_enabled} onCheckedChange={(v) => updateDraft(g.gateway, 'is_enabled', v)} />
                </div>

                <div className="space-y-2">
                  <Label className="uppercase tracking-widest font-bold text-xs">Entorno</Label>
                  <Select value={d.environment || 'test'} onValueChange={(v) => updateDraft(g.gateway, 'environment', v)}>
                    <SelectTrigger className="brutalist-input"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="test">Test</SelectItem>
                      <SelectItem value="production">Producción</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {g.gateway !== 'nequi' && (
                  <div className="space-y-2">
                    <Label className="uppercase tracking-widest font-bold text-xs">Clave Pública</Label>
                    <Input value={d.public_key || ''} onChange={(e) => updateDraft(g.gateway, 'public_key', e.target.value)} className="brutalist-input font-mono" />
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="uppercase tracking-widest font-bold text-xs">
                    {g.gateway === 'nequi' ? 'Número de Cuenta' : 'Clave Privada'}
                  </Label>
                  <Input
                    value={g.gateway === 'nequi' ? (d.account_identifier || '') : (d.private_key || '')}
                    onChange={(e) => updateDraft(g.gateway, g.gateway === 'nequi' ? 'account_identifier' : 'private_key', e.target.value)}
                    className="brutalist-input font-mono"
                    placeholder={g.gateway === 'nequi' ? '+57 300...' : '••••••••'}
                  />
                </div>

                {g.gateway !== 'nequi' && (
                  <div className="space-y-2">
                    <Label className="uppercase tracking-widest font-bold text-xs">Webhook Secret</Label>
                    <Input value={d.webhook_secret || ''} onChange={(e) => updateDraft(g.gateway, 'webhook_secret', e.target.value)} className="brutalist-input font-mono" />
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="uppercase tracking-widest font-bold text-xs">Tasa de Comisión (%)</Label>
                  <Input
                    type="number" step="0.01" min="0" max="100"
                    value={d.commission_rate ? (Number(d.commission_rate) * 100).toFixed(2) : '3.00'}
                    onChange={(e) => updateDraft(g.gateway, 'commission_rate', parseFloat(e.target.value) / 100)}
                    className="brutalist-input"
                  />
                </div>

                {g.updated_at && (
                  <p className="text-xs text-muted-foreground">Actualizado: {new Date(g.updated_at).toLocaleString('es-CO')}</p>
                )}

                <Button onClick={() => handleSave(g.gateway)} disabled={saving === g.gateway} className="brutalist-button w-full">
                  {saving === g.gateway ? 'Guardando...' : `Guardar ${GATEWAY_LABELS[g.gateway]}`}
                </Button>
              </div>
            </TabsContent>
          )
        })}
      </Tabs>
    </div>
  )
}
