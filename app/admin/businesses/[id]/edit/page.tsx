'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Breadcrumbs } from '@/components/shared/breadcrumbs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'

type Business = {
  id: string
  name: string
  slug: string
  description: string | null
  category_id: string
  address: string | null
  phone: string | null
  whatsapp: string | null
  email: string | null
  website: string | null
  admin_notes: string | null
}

type Category = {
  id: string
  name: string
}

export default function AdminBusinessEditPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [business, setBusiness] = useState<Business | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [adminNotes, setAdminNotes] = useState('')

  useEffect(() => {
    fetchData()
  }, [id])

  async function fetchData() {
    setLoading(true)

    // Fetch business
    const { data: bizData } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', id)
      .single<{ [key: string]: any }>()

    if (bizData) {
      setBusiness(bizData as any)
      setName(bizData.name)
      setDescription(bizData.description || '')
      setCategoryId(bizData.category_id)
      setAddress(bizData.address || '')
      setPhone(bizData.phone || '')
      setWhatsapp(bizData.whatsapp || '')
      setEmail(bizData.email || '')
      setWebsite(bizData.website || '')
      setAdminNotes(bizData.admin_notes || '')
    }

    // Fetch categories
    const { data: catData } = await supabase
      .from('categories')
      .select('id, name')
      .order('sort_order')

    if (catData) setCategories(catData)

    setLoading(false)
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error('El nombre es requerido')
      return
    }

    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const response = await fetch(`/api/businesses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          category_id: categoryId,
          address: address.trim() || null,
          phone: phone.trim() || null,
          whatsapp: whatsapp.trim() || null,
          email: email.trim() || null,
          website: website.trim() || null,
          admin_notes: adminNotes.trim() || null,
          last_edited_by: user?.id,
        }),
      })

      if (!response.ok) throw new Error('Error al guardar')

      toast.success('Negocio actualizado exitosamente')
      router.push(`/admin/businesses/${id}`)
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al guardar cambios')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center py-12">Cargando...</div>
  }

  if (!business) {
    return <div className="text-center py-12">Negocio no encontrado</div>
  }

  return (
    <div className="space-y-8">
      <Breadcrumbs
        items={[
          { label: 'Administración', href: '/admin/businesses' },
          { label: 'Negocios', href: '/admin/businesses' },
          { label: business.name, href: `/admin/businesses/${id}` },
          { label: 'Editar', active: true },
        ]}
      />

      <div className="flex items-center justify-between border-b-4 border-black pb-4">
        <h1 className="text-4xl font-heading font-black uppercase italic tracking-tighter">
          Editar <span className="text-primary italic">{business.name}</span>
        </h1>
        <Link href={`/admin/businesses/${id}`}>
          <Button variant="outline" className="brutalist-button">
            <ArrowLeft className="h-4 w-4 mr-2" /> Volver
          </Button>
        </Link>
      </div>

      <Card className="brutalist-card">
        <CardHeader className="border-b-2 border-black">
          <CardTitle className="font-heading font-black uppercase italic">
            Información del Negocio
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Name */}
          <div>
            <Label className="text-xs font-black uppercase tracking-widest text-black/60">
              Nombre del Negocio *
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="brutalist-input mt-2"
              placeholder="Ej: Tienda Don José"
            />
          </div>

          {/* Category */}
          <div>
            <Label className="text-xs font-black uppercase tracking-widest text-black/60">
              Categoría *
            </Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="brutalist-input mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div>
            <Label className="text-xs font-black uppercase tracking-widest text-black/60">
              Descripción
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="brutalist-input mt-2"
              rows={4}
              placeholder="Describe el negocio..."
            />
          </div>

          {/* Address */}
          <div>
            <Label className="text-xs font-black uppercase tracking-widest text-black/60">
              Dirección
            </Label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="brutalist-input mt-2"
              placeholder="Ej: Carrera 10 #5-20"
            />
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-black uppercase tracking-widest text-black/60">
                WhatsApp
              </Label>
              <Input
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="brutalist-input mt-2"
                placeholder="573001234567"
              />
            </div>
            <div>
              <Label className="text-xs font-black uppercase tracking-widest text-black/60">
                Teléfono
              </Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="brutalist-input mt-2"
                placeholder="3001234567"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-black uppercase tracking-widest text-black/60">
                Email
              </Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="brutalist-input mt-2"
                placeholder="contacto@negocio.com"
              />
            </div>
            <div>
              <Label className="text-xs font-black uppercase tracking-widest text-black/60">
                Sitio Web
              </Label>
              <Input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="brutalist-input mt-2"
                placeholder="https://negocio.com"
              />
            </div>
          </div>

          {/* Admin Notes */}
          <div className="border-t-2 border-dashed border-black pt-6">
            <Label className="text-xs font-black uppercase tracking-widest text-black/60">
              Notas Administrativas (Solo Visible para Admins)
            </Label>
            <Textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              className="brutalist-input mt-2 bg-secondary/10"
              rows={3}
              placeholder="Notas internas sobre este negocio..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <Button
              onClick={handleSave}
              disabled={saving || !name.trim() || !categoryId}
              className="brutalist-button flex-1 bg-primary text-white h-12"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
            <Link href={`/admin/businesses/${id}`} className="flex-1">
              <Button
                variant="outline"
                className="brutalist-button w-full h-12"
              >
                Cancelar
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
