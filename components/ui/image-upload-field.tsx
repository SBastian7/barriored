'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Upload, X, ImagePlus } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const BYTES_PER_MB = 1024 * 1024

interface ImageUploadFieldProps {
  label: string
  value: string | null
  onChange: (url: string | null) => void
  bucket?: string
  maxSizeMB?: number
  aspectRatio?: string
  maxWidth?: string
}

export function ImageUploadField({
  label,
  value,
  onChange,
  bucket = 'community-images',
  maxSizeMB = 5,
  aspectRatio = '1/1',
  maxWidth = '200px',
}: ImageUploadFieldProps) {
  const [uploading, setUploading] = useState(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size
    if (file.size > maxSizeMB * BYTES_PER_MB) {
      toast.error(`La imagen es muy grande (máximo ${maxSizeMB}MB)`)
      e.target.value = ''
      return
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Solo se permiten imágenes (JPG, PNG, WebP)')
      e.target.value = ''
      return
    }

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      // Use appropriate upload endpoint based on bucket
      const endpoint = bucket === 'community-images'
        ? '/api/upload/community'
        : '/api/upload'

      const res = await fetch(endpoint, {
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
      console.error('Upload error:', error)
      toast.error('Error de conexión al subir imagen')
    } finally {
      if (mountedRef.current) {
        setUploading(false)
      }
    }
  }

  function handleDelete() {
    onChange(null)
  }

  return (
    <div className="space-y-2">
      <Label className="uppercase tracking-widest font-bold text-xs">
        {label}
      </Label>

      {/* Empty state - Upload */}
      {!value && (
        <label
          className={cn(
            'brutalist-card flex flex-col items-center justify-center cursor-pointer hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all p-8',
            'border-2 border-dashed border-black/30 hover:border-primary hover:bg-primary/5',
            uploading && 'opacity-50 pointer-events-none'
          )}
          style={{ aspectRatio, maxWidth }}
        >
          <input
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="sr-only"
            disabled={uploading}
          />

          {uploading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-bold text-black/40 uppercase tracking-widest">
                Subiendo...
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <ImagePlus className="h-12 w-12 text-black/30" />
              <span className="text-xs font-bold text-black/60 uppercase tracking-widest">
                Subir {label}
              </span>
            </div>
          )}
        </label>
      )}

      {/* Preview state - Show image with actions */}
      {value && (
        <div className="space-y-3">
          <div
            className="relative brutalist-card overflow-hidden border-2 border-black"
            style={{ aspectRatio, maxWidth }}
          >
            <Image
              src={value}
              alt={label}
              fill
              className="object-cover"
            />
          </div>

          <div className="flex gap-2">
            <label className="flex-1">
              <input
                type="file"
                accept="image/*"
                onChange={handleUpload}
                className="sr-only"
                disabled={uploading}
              />
              <Button
                type="button"
                variant="outline"
                className="brutalist-button w-full"
                disabled={uploading}
                asChild
              >
                <span>
                  {uploading ? 'Subiendo...' : 'Cambiar'}
                </span>
              </Button>
            </label>

            <Button
              type="button"
              variant="outline"
              onClick={handleDelete}
              disabled={uploading}
              className="brutalist-button"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
