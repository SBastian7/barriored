'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, Save } from 'lucide-react'

interface SEOSettingsTabProps {
  communityId: string
  communityName: string
}

export function SEOSettingsTab({ communityId, communityName }: SEOSettingsTabProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    meta_title: '',
    meta_description: '',
    meta_keywords: [] as string[],
    og_image_url: ''
  })

  useEffect(() => {
    fetchSettings()
  }, [communityId])

  async function fetchSettings() {
    try {
      const res = await fetch(`/api/admin/communities/${communityId}/seo`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setFormData({
        meta_title: data.meta_title || '',
        meta_description: data.meta_description || '',
        meta_keywords: data.meta_keywords || [],
        og_image_url: data.og_image_url || ''
      })
    } catch (error) {
      console.error('Fetch error:', error)
      toast.error('Error al cargar configuración SEO')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      const res = await fetch(`/api/admin/communities/${communityId}/seo`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to save')
      }

      toast.success('✅ Configuración SEO guardada')
    } catch (error: any) {
      console.error('Save error:', error)
      toast.error(error.message || 'Error al guardar configuración')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <CardHeader>
          <CardTitle className="font-heading font-black uppercase italic">
            Meta Tags
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-black/40">
              Título (Meta Title)
            </Label>
            <Input
              value={formData.meta_title}
              onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })}
              placeholder={`${communityName} - BarrioRed`}
              maxLength={70}
              className="brutalist-input"
            />
            <p className="text-xs text-black/60">
              {formData.meta_title.length} / 70 caracteres (ideal: 50-60)
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-black/40">
              Descripción (Meta Description)
            </Label>
            <Textarea
              value={formData.meta_description}
              onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
              placeholder={`Descubre negocios locales, eventos y servicios en ${communityName}`}
              maxLength={160}
              rows={3}
              className="brutalist-input"
            />
            <p className="text-xs text-black/60">
              {formData.meta_description.length} / 160 caracteres (ideal: 150-160)
            </p>
          </div>

          {/* Keywords */}
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-black/40">
              Palabras Clave (Keywords)
            </Label>
            <Input
              value={formData.meta_keywords.join(', ')}
              onChange={(e) => setFormData({
                ...formData,
                meta_keywords: e.target.value.split(',').map(k => k.trim()).filter(Boolean)
              })}
              placeholder="barrio, negocios locales, comunidad"
              className="brutalist-input"
            />
            <p className="text-xs text-black/60">
              Separadas por comas. Máximo 10 recomendadas.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Preview Card */}
      <Card className="border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <CardHeader>
          <CardTitle className="font-heading font-black uppercase italic">
            Vista Previa Google
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <p className="text-xs text-blue-600">
              barriored.co › {communityName.toLowerCase().replace(/\s+/g, '')}
            </p>
            <p className="text-xl text-blue-800 font-semibold">
              {formData.meta_title || `${communityName} - BarrioRed`}
            </p>
            <p className="text-sm text-gray-600 line-clamp-2">
              {formData.meta_description || 'Descripción no configurada'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button
        type="submit"
        disabled={saving}
        className="brutalist-button bg-primary text-white w-full"
      >
        {saving ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Save className="h-4 w-4 mr-2" />
        )}
        Guardar Cambios
      </Button>
    </form>
  )
}
