'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { X, Upload, Star, ImagePlus } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type Props = {
  form: { photos: string[]; main_photo_index?: number }
  update: (v: any) => void
  errors?: Record<string, string>
}

export function StepPhotos({ form, update, errors }: Props) {
  const [uploading, setUploading] = useState(false)
  const mainIndex = form.main_photo_index ?? 0

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (form.photos.length >= 5) { toast.error('Maximo 5 fotos'); return }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen no debe pesar mas de 5MB')
      return
    }

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) { toast.error(data.error || 'Error al subir imagen'); return }

      const newPhotos = [...form.photos, data.url]
      update({ photos: newPhotos })

      // Auto-set first photo as main
      if (newPhotos.length === 1) {
        update({ photos: newPhotos, main_photo_index: 0 })
      }
    } catch {
      toast.error('Error de conexion al subir imagen')
    } finally {
      setUploading(false)
    }
  }

  function removePhoto(index: number) {
    const newPhotos = form.photos.filter((_: string, i: number) => i !== index)
    let newMainIndex = mainIndex
    if (index === mainIndex) {
      newMainIndex = 0
    } else if (index < mainIndex) {
      newMainIndex = mainIndex - 1
    }
    update({ photos: newPhotos, main_photo_index: newPhotos.length > 0 ? newMainIndex : 0 })
  }

  function setMainPhoto(index: number) {
    update({ main_photo_index: index })
  }

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-xs font-black uppercase tracking-widest text-black/60 mb-3 block">
          Fotos del negocio (max 5)
        </Label>
        <p className="text-xs text-black/40 font-bold mb-4">
          La foto principal aparecera en el directorio. Haz clic en la estrella para elegirla.
        </p>
      </div>

      {/* Photo grid */}
      <div className="grid grid-cols-3 gap-3">
        {form.photos.map((url: string, i: number) => (
          <div
            key={i}
            className={cn(
              'relative aspect-square border-2 border-black overflow-hidden group cursor-pointer transition-all',
              i === mainIndex
                ? 'ring-4 ring-secondary shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
                : 'shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
            )}
            onClick={() => setMainPhoto(i)}
          >
            <Image src={url} alt={`Foto ${i + 1}`} fill className="object-cover" />

            {/* Main photo badge */}
            {i === mainIndex && (
              <div className="absolute top-0 left-0 bg-secondary text-black px-2 py-1 border-r-2 border-b-2 border-black">
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-current" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Principal</span>
                </div>
              </div>
            )}

            {/* Star indicator for non-main */}
            {i !== mainIndex && (
              <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 border border-black rounded-full p-1">
                <Star className="h-3 w-3" />
              </div>
            )}

            {/* Delete button */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removePhoto(i) }}
              className="absolute top-1 right-1 bg-red-500 text-white border-2 border-black p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

        {/* Upload slot */}
        {form.photos.length < 5 && (
          <label className={cn(
            'aspect-square border-2 border-dashed border-black/30 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all',
            uploading && 'opacity-50 pointer-events-none'
          )}>
            <input type="file" accept="image/*" onChange={handleUpload} className="sr-only" disabled={uploading} />
            {uploading ? (
              <div className="flex flex-col items-center gap-1">
                <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-[10px] font-bold text-black/40 uppercase">Subiendo...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <ImagePlus className="h-6 w-6 text-black/30" />
                <span className="text-[10px] font-bold text-black/40 uppercase">Agregar</span>
              </div>
            )}
          </label>
        )}
      </div>

      {errors?.photos && (
        <p className="text-xs font-bold text-red-500 uppercase tracking-wider">{errors.photos}</p>
      )}
    </div>
  )
}
