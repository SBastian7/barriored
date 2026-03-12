'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { X, ImagePlus, Loader2, GripVertical } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface ImageGalleryUploadProps {
  value: string[]
  onChange: (urls: string[]) => void
  maxImages?: number
  minImages?: number
  required?: boolean
  bucket?: string
}

export function ImageGalleryUpload({
  value,
  onChange,
  maxImages = 5,
  minImages = 1,
  required = false,
  bucket = 'marketplace-images'
}: ImageGalleryUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null)

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check max images
    if (value.length >= maxImages) {
      toast.error(`Máximo ${maxImages} imágenes`, {
        description: 'Elimina una imagen para subir otra'
      })
      e.target.value = ''
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagen muy grande', {
        description: 'El tamaño máximo es 5MB'
      })
      e.target.value = ''
      return
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Formato no válido', {
        description: 'Solo se permiten JPG, PNG y WebP'
      })
      e.target.value = ''
      return
    }

    setUploading(true)
    setUploadingIndex(value.length)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error('Error al subir imagen', {
          description: data.error || 'Intenta nuevamente'
        })
        return
      }

      onChange([...value, data.url])
      toast.success('Imagen subida correctamente')
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Error de conexión', {
        description: 'Verifica tu internet e intenta nuevamente'
      })
    } finally {
      setUploading(false)
      setUploadingIndex(null)
      e.target.value = ''
    }
  }, [value, onChange, maxImages])

  const handleDelete = useCallback((index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }, [value, onChange])

  const handleReorder = useCallback((fromIndex: number, toIndex: number) => {
    const newValue = [...value]
    const [removed] = newValue.splice(fromIndex, 1)
    newValue.splice(toIndex, 0, removed)
    onChange(newValue)
  }, [value, onChange])

  const canUpload = value.length < maxImages && !uploading

  return (
    <div className="space-y-2">
      <Label className="uppercase tracking-widest font-bold text-xs">
        Imágenes {required && <span className="text-primary">*</span>}
        {minImages > 0 && (
          <span className="text-black/60 font-normal ml-2">
            (mínimo {minImages}, máximo {maxImages})
          </span>
        )}
      </Label>

      {/* Image grid */}
      {value.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          {value.map((url, index) => (
            <div
              key={url}
              className="relative brutalist-card overflow-hidden aspect-square border-2 border-black group"
            >
              <Image
                src={url}
                alt={`Imagen ${index + 1}`}
                fill
                className="object-cover"
              />

              {/* Delete button */}
              <button
                type="button"
                onClick={() => handleDelete(index)}
                className="absolute top-2 right-2 brutalist-button bg-primary text-white p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Drag handle (optional, can implement later) */}
              <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 text-xs font-bold">
                {index + 1}
              </div>
            </div>
          ))}

          {/* Upload progress placeholder */}
          {uploadingIndex !== null && (
            <div className="brutalist-card aspect-square border-2 border-black flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
        </div>
      )}

      {/* Upload button */}
      {canUpload && (
        <label
          className={cn(
            'brutalist-card flex flex-col items-center justify-center cursor-pointer p-8 border-2 border-dashed border-black/30 hover:border-primary hover:bg-primary/5 transition-all',
            'min-h-[200px]'
          )}
        >
          <input
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="sr-only"
            disabled={uploading}
          />

          <ImagePlus className="h-12 w-12 text-black/30 mb-3" />
          <span className="text-xs font-bold text-black/60 uppercase tracking-widest text-center">
            {value.length === 0 ? 'Subir Imágenes' : `Agregar Imagen (${value.length}/${maxImages})`}
          </span>
          <span className="text-[10px] text-black/40 mt-1">
            JPG, PNG o WebP (máx. 5MB)
          </span>
        </label>
      )}

      {/* Validation message */}
      {required && value.length < minImages && (
        <p className="text-xs font-bold text-primary uppercase tracking-widest">
          Debes subir al menos {minImages} imagen{minImages > 1 ? 'es' : ''}
        </p>
      )}
    </div>
  )
}
