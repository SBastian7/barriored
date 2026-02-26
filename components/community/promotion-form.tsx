'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ImageUploadField } from '@/components/community/image-upload-field'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface PromotionFormProps {
  communityId: string
  communitySlug: string
  businessId: string
  businessName: string
}

export function PromotionForm({ communityId, communitySlug, businessId, businessName }: PromotionFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    offerDetails: '',
    validUntil: '',
  })
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim()) {
      toast.error('El título es obligatorio')
      return
    }

    if (!formData.offerDetails.trim()) {
      toast.error('Los detalles de la oferta son obligatorios')
      return
    }

    setIsSubmitting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const metadata = {
        linked_business_id: businessId,
        linked_business_name: businessName,
        offer_details: formData.offerDetails || undefined,
        valid_until: formData.validUntil || undefined,
      }

      const { error } = await supabase
        .from('community_posts')
        .insert({
          community_id: communityId,
          author_id: user.id,
          type: 'promotion',
          title: formData.title,
          content: formData.offerDetails || '',
          image_url: imageUrl,
          metadata,
          status: 'pending', // Requires admin approval
        })

      if (error) throw error

      toast.success('Promoción enviada. Será revisada por un administrador.')
      router.push(`/${communitySlug}/dashboard`)
    } catch (error) {
      console.error('Promotion creation error:', error)
      toast.error('Error al crear promoción')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card className="brutalist-card">
        <CardHeader>
          <CardTitle className="font-heading font-black uppercase italic">
            Detalles de la Promoción
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title" className="font-black uppercase tracking-widest text-xs">
              Título *
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ej: ¡20% descuento en todo el menú!"
              className="brutalist-input"
              maxLength={100}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="details" className="font-black uppercase tracking-widest text-xs">
              Detalles de la oferta *
            </Label>
            <Textarea
              id="details"
              value={formData.offerDetails}
              onChange={(e) => setFormData({ ...formData, offerDetails: e.target.value })}
              placeholder="Describe tu oferta o promoción..."
              className="brutalist-input min-h-[120px]"
              maxLength={500}
              required
              disabled={isSubmitting}
            />
          </div>

          <ImageUploadField
            value={imageUrl}
            onChange={setImageUrl}
            label="Imagen Promocional (opcional)"
          />

          <div className="space-y-2">
            <Label htmlFor="validUntil" className="font-black uppercase tracking-widest text-xs">
              Válido hasta (opcional)
            </Label>
            <Input
              id="validUntil"
              type="date"
              value={formData.validUntil}
              onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
              className="brutalist-input"
              disabled={isSubmitting}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div className="border-l-4 border-secondary bg-secondary/10 p-4">
            <p className="text-sm font-medium">
              📢 Tu promoción será revisada por un administrador antes de publicarse.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Solo puedes crear una promoción por semana.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isSubmitting}
              className="brutalist-button"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="brutalist-button flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Publicar Promoción
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
