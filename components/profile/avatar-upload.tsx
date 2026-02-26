'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { User, Upload, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type Props = {
  currentAvatar: string | null
  onUploadComplete: (url: string) => void
}

export function AvatarUpload({ currentAvatar, onUploadComplete }: Props) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(currentAvatar)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      toast.error('La imagen no debe pesar más de 2MB')
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
      const res = await fetch('/api/upload/profile', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Error al subir imagen')
        return
      }

      setPreview(data.url)
      onUploadComplete(data.url)
      toast.success('Avatar actualizado')
    } catch (error) {
      toast.error('Error de conexión al subir imagen')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className={cn(
          'relative w-24 h-24 border-4 border-black rounded-full overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
          uploading && 'opacity-50'
        )}
      >
        {preview ? (
          <Image
            src={preview}
            alt="Avatar"
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-accent/20 flex items-center justify-center">
            <User className="h-12 w-12 text-black/40" />
          </div>
        )}
      </div>

      <label className="cursor-pointer">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleUpload}
          disabled={uploading}
          className="sr-only"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          className="border-2 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all font-black uppercase tracking-widest text-xs"
          asChild
        >
          <span>
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Subiendo...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Cambiar Foto
              </>
            )}
          </span>
        </Button>
      </label>
    </div>
  )
}
