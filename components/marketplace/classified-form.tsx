'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { PhoneInput } from '@/components/ui/phone-input'
import { CategorySelector } from './category-selector'
import { ImageGalleryUpload } from './image-gallery-upload'
import { createClassifiedAction, updateClassifiedAction } from '@/app/actions/classified-actions'
import { toast } from 'sonner'
import { Loader2, Send, DollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Database } from '@/lib/types/database'

type MarketplaceCategory = Database['public']['Tables']['marketplace_categories']['Row']
type Classified = Database['public']['Tables']['classifieds']['Row']

interface ClassifiedFormProps {
  mode: 'create' | 'edit'
  initialData?: Classified
  categories: MarketplaceCategory[]
}

export function ClassifiedForm({
  mode,
  initialData,
  categories
}: ClassifiedFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Form state
  const [categoryId, setCategoryId] = useState(initialData?.category_id || '')
  const [title, setTitle] = useState(initialData?.title || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [price, setPrice] = useState(initialData?.price || '')
  const [whatsapp, setWhatsapp] = useState(initialData?.whatsapp || '')
  const [images, setImages] = useState<string[]>(initialData?.images || [])

  // Error state
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!categoryId) {
      newErrors.category = 'Debes seleccionar una categoría'
    }

    if (!title || title.length < 10) {
      newErrors.title = 'Título debe tener al menos 10 caracteres'
    } else if (title.length > 100) {
      newErrors.title = 'Título no puede exceder 100 caracteres'
    }

    if (!description || description.length < 20) {
      newErrors.description = 'Descripción debe tener al menos 20 caracteres'
    } else if (description.length > 1000) {
      newErrors.description = 'Descripción no puede exceder 1000 caracteres'
    }

    if (!whatsapp) {
      newErrors.whatsapp = 'WhatsApp es requerido'
    }

    if (images.length === 0) {
      newErrors.images = 'Debes subir al menos 1 imagen'
    } else if (images.length > 5) {
      newErrors.images = 'Máximo 5 imágenes'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      toast.error('Formulario incompleto', {
        description: 'Revisa los campos marcados en rojo'
      })
      return
    }

    const formData = new FormData()
    formData.append('category_id', categoryId)
    formData.append('title', title)
    formData.append('description', description)
    formData.append('price', price)
    formData.append('whatsapp', whatsapp)
    images.forEach(img => formData.append('images', img))

    startTransition(async () => {
      try {
        if (mode === 'create') {
          await createClassifiedAction(formData)
          // Will redirect on success
        } else if (mode === 'edit' && initialData) {
          const result = await updateClassifiedAction(initialData.id, formData)
          if (result.success) {
            toast.success('Clasificado actualizado correctamente')
            router.push('/dashboard?tab=marketplace')
          } else {
            toast.error('Error al actualizar', {
              description: result.error
            })
          }
        }
      } catch (error) {
        console.error('Form submission error:', error)
        toast.error('Error al enviar formulario')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl">
      {/* Category */}
      <CategorySelector
        categories={categories}
        value={categoryId}
        onChange={setCategoryId}
        required
      />
      {errors.category && (
        <p className="text-xs font-bold text-primary uppercase tracking-widest -mt-6">
          {errors.category}
        </p>
      )}

      {/* Title */}
      <div className="space-y-2">
        <Label className="uppercase tracking-widest font-bold text-xs">
          Título <span className="text-primary">*</span>
        </Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej: Bicicleta de montaña en excelente estado"
          className={errors.title ? "border-primary bg-primary/5" : ""}
          maxLength={100}
        />
        <p className="text-xs text-black/60">
          {title.length}/100 caracteres
        </p>
        {errors.title && (
          <p className="text-xs font-bold text-primary uppercase tracking-widest">
            {errors.title}
          </p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label className="uppercase tracking-widest font-bold text-xs">
          Descripción <span className="text-primary">*</span>
        </Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe tu artículo en detalle: estado, características, razón de venta..."
          rows={6}
          className={errors.description ? "border-primary bg-primary/5" : ""}
          maxLength={1000}
        />
        <p className="text-xs text-black/60">
          {description.length}/1000 caracteres
        </p>
        {errors.description && (
          <p className="text-xs font-bold text-primary uppercase tracking-widest">
            {errors.description}
          </p>
        )}
      </div>

      {/* Price */}
      <div className="space-y-2">
        <Label className="uppercase tracking-widest font-bold text-xs">
          Precio <span className="text-black/60">(opcional)</span>
        </Label>
        <div className="flex border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all focus-within:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] focus-within:translate-x-[-1px] focus-within:translate-y-[-1px]">
          <div className="flex items-center gap-2 px-3 border-r-2 border-black bg-secondary/20">
            <DollarSign className="h-5 w-5 text-black/60 shrink-0" strokeWidth={3} />
          </div>
          <input
            type="text"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="50,000 o 'Negociable' o 'Gratis'"
            className="w-full px-3 py-3 bg-transparent outline-none font-bold text-base tracking-wide placeholder:text-black/30 placeholder:font-normal"
          />
        </div>
        <p className="text-xs text-black/60">
          Puedes dejar en blanco, poner un precio (COP), o escribir "Negociable"
        </p>
      </div>

      {/* Images */}
      <ImageGalleryUpload
        value={images}
        onChange={setImages}
        maxImages={5}
        minImages={1}
        required
      />
      {errors.images && (
        <p className="text-xs font-bold text-primary uppercase tracking-widest -mt-6">
          {errors.images}
        </p>
      )}

      {/* WhatsApp */}
      <div className="space-y-2">
        <Label className="uppercase tracking-widest font-bold text-xs">
          WhatsApp <span className="text-primary">*</span>
        </Label>
        <PhoneInput
          value={whatsapp}
          onChange={setWhatsapp}
          placeholder="300 123 4567"
          error={errors.whatsapp}
        />
        <p className="text-xs text-black/60">
          Los interesados te contactarán por WhatsApp
        </p>
      </div>

      {/* Submit */}
      <div className="flex gap-4 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isPending}
          className="brutalist-button"
        >
          Cancelar
        </Button>

        <Button
          type="submit"
          disabled={isPending}
          className="brutalist-button bg-primary text-primary-foreground flex-1"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {mode === 'create' ? 'Publicando...' : 'Actualizando...'}
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              {mode === 'create' ? 'Publicar Clasificado' : 'Guardar Cambios'}
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
