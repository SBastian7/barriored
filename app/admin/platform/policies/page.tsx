'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Breadcrumbs } from '@/components/shared/breadcrumbs'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface Policy {
  id: string
  type: string
  title: string
  content: string
  updated_at: string | null
}

export default function PlatformPoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, string>>({})

  useEffect(() => {
    fetch('/api/admin/platform/policies')
      .then(async (r) => {
        const json = await r.json()
        if (!r.ok) throw new Error(json.error ?? 'Error al cargar políticas')
        setPolicies(json.policies || [])
        const initial: Record<string, string> = {}
        for (const p of json.policies || []) initial[p.type] = p.content
        setDrafts(initial)
      })
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleSave(type: string) {
    setSaving(type)
    try {
      const res = await fetch(`/api/admin/platform/policies/${type}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: drafts[type] }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Error al guardar la política'); return }
      setPolicies((prev) => prev.map((p) => p.type === type ? { ...p, ...json.policy } : p))
      toast.success('Política guardada')
    } finally {
      setSaving(null)
    }
  }

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8" /></div>

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <Breadcrumbs homeHref="/admin" items={[{ label: 'Admin', href: '/admin' }, { label: 'Plataforma' }, { label: 'Políticas', active: true }]} />
      <h1 className="text-3xl font-black uppercase tracking-tighter italic">Políticas de la Plataforma</h1>

      <Tabs defaultValue={policies[0]?.type}>
        <TabsList className="brutalist-card inline-flex flex-wrap">
          {policies.map((p) => (
            <TabsTrigger key={p.type} value={p.type} className="uppercase tracking-widest font-bold text-xs">
              {p.title}
            </TabsTrigger>
          ))}
        </TabsList>

        {policies.map((policy) => (
          <TabsContent key={policy.type} value={policy.type} className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-3">
                <p className="uppercase tracking-widest font-bold text-xs">Editor (Markdown)</p>
                <Textarea
                  value={drafts[policy.type] || ''}
                  onChange={(e) => setDrafts({ ...drafts, [policy.type]: e.target.value })}
                  rows={20}
                  className="brutalist-input font-mono text-sm"
                  placeholder="Escribe el contenido en markdown..."
                />
                {policy.updated_at && (
                  <p className="text-xs text-muted-foreground">
                    Última actualización: {new Date(policy.updated_at).toLocaleString('es-CO')}
                  </p>
                )}
                <Button
                  onClick={() => handleSave(policy.type)}
                  disabled={saving === policy.type}
                  className="brutalist-button w-full"
                >
                  {saving === policy.type ? 'Guardando...' : 'Guardar'}
                </Button>
              </div>
              <div className="space-y-3">
                <p className="uppercase tracking-widest font-bold text-xs">Vista Previa</p>
                <div className="brutalist-card p-4 prose prose-sm max-w-none min-h-[200px] overflow-auto">
                  <pre className="whitespace-pre-wrap text-sm font-sans">{drafts[policy.type] || <span className="text-muted-foreground italic">Sin contenido</span>}</pre>
                </div>
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
