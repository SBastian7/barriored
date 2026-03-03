'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface Props {
  mode: 'create' | 'edit'
  initialData?: any
}

export function CommunityForm({ mode, initialData }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    slug: initialData?.slug || '',
    municipality: initialData?.municipality || '',
    department: initialData?.department || '',
    description: initialData?.description || '',
    logo_url: initialData?.logo_url || '',
  })

  // Auto-generate slug from name
  function generateSlug(name: string) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const url =
        mode === 'create'
          ? '/api/admin/communities'
          : `/api/admin/communities/${initialData.id}`

      const response = await fetch(url, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        alert(error.error || 'Error al guardar comunidad')
        return
      }

      const { community } = await response.json()
      router.push(`/admin/communities/${community.id}`)
    } catch (error) {
      console.error('Error:', error)
      alert('Error al guardar comunidad')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="brutalist-card p-8 space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name" className="uppercase tracking-widest font-bold text-xs">
          Nombre *
        </Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => {
            setFormData({
              ...formData,
              name: e.target.value,
              slug: mode === 'create' ? generateSlug(e.target.value) : formData.slug,
            })
          }}
          placeholder="Parque Industrial"
          required
          className="brutalist-input"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="slug" className="uppercase tracking-widest font-bold text-xs">
          Slug (URL) *
        </Label>
        <Input
          id="slug"
          value={formData.slug}
          onChange={(e) =>
            setFormData({ ...formData, slug: e.target.value })
          }
          placeholder="parqueindustrial"
          required
          className="brutalist-input"
          disabled={mode === 'edit'}
        />
        <p className="text-xs text-muted-foreground">
          URL: barriored.co/{formData.slug}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="municipality" className="uppercase tracking-widest font-bold text-xs">
            Municipio *
          </Label>
          <Input
            id="municipality"
            value={formData.municipality}
            onChange={(e) =>
              setFormData({ ...formData, municipality: e.target.value })
            }
            placeholder="Pereira"
            required
            className="brutalist-input"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="department" className="uppercase tracking-widest font-bold text-xs">
            Departamento *
          </Label>
          <Input
            id="department"
            value={formData.department}
            onChange={(e) =>
              setFormData({ ...formData, department: e.target.value })
            }
            placeholder="Risaralda"
            required
            className="brutalist-input"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="uppercase tracking-widest font-bold text-xs">
          Descripción
        </Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          placeholder="Describe la comunidad..."
          rows={4}
          className="brutalist-input"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="logo_url" className="uppercase tracking-widest font-bold text-xs">
          URL del Logo
        </Label>
        <Input
          id="logo_url"
          type="url"
          value={formData.logo_url}
          onChange={(e) =>
            setFormData({ ...formData, logo_url: e.target.value })
          }
          placeholder="https://..."
          className="brutalist-input"
        />
      </div>

      <div className="flex gap-4 pt-4 border-t-2 border-black">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
          className="brutalist-button"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="brutalist-button flex-1"
        >
          {loading ? 'Guardando...' : mode === 'create' ? 'Crear Comunidad' : 'Guardar Cambios'}
        </Button>
      </div>
    </form>
  )
}
