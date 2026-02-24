'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { X, Upload, Loader2, ImagePlus } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type Props = {
  value: string | null
  onChange: (url: string | null) => void
  label?: string
  error?: string
}

export function ImageUploadField({ value, onChange, label, error }: Props) {
  const [uploading, setUploading] = useState(false)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen no debe pesar más de 5MB')
      return
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Solo se permiten imágenes JPG, PNG o WebP')
      return
    }

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/upload/community', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Error al subir imagen')
        return
      }

      onChange(data.url)
      toast.success('Imagen subida correctamente')
    } catch (error) {
      toast.error('Error de conexión al subir imagen')
    } finally {
      setUploading(false)
    }
  }

  function handleRemove() {
    onChange(null)
  }

  return (
    <div className="space-y-2">
      {label && (
        <Label className="font-black uppercase tracking-widest text-xs">
          {label}
        </Label>
      )}

      {value ? (
        <div className="relative aspect-video w-full border-4 border-black overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group">
          <Image
            src={value}
            alt="Imagen subida"
            fill
            className="object-cover"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 bg-red-500 text-white border-2 border-black p-2 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <label
          className={cn(
            'aspect-video w-full border-4 border-dashed border-black/30 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all',
            uploading && 'opacity-50 pointer-events-none'
          )}
        >
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleUpload}
            disabled={uploading}
            className="sr-only"
          />
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <span className="text-sm font-black uppercase tracking-widest text-black/40">
                Subiendo...
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <ImagePlus className="h-8 w-8 text-black/30" />
              <span className="text-sm font-black uppercase tracking-widest text-black/40">
                Subir Imagen
              </span>
              <span className="text-xs text-black/30">
                JPG, PNG o WebP (máx. 5MB)
              </span>
            </div>
          )}
        </label>
      )}

      {error && (
        <p className="text-primary text-[10px] font-black uppercase tracking-widest">
          {error}
        </p>
      )}
    </div>
  )
}
