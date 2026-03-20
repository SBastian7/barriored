'use client'

import { useState, useCallback } from 'react'
import { Upload, X, ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface BannerAdUploadProps {
  businessId: string
  onSuccess?: () => void
}

export function BannerAdUpload({ businessId, onSuccess }: BannerAdUploadProps) {
  const [title, setTitle] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [placement, setPlacement] = useState<'homepage' | 'directory'>('homepage')
  const [linkUrl, setLinkUrl] = useState('')
  const [sizeWarning, setSizeWarning] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleImageSelect = useCallback((file: File) => {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      setError('Solo se permiten imágenes JPG, PNG o WebP.')
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen debe ser menor a 5MB.')
      return
    }

    setError(null)
    setImageFile(file)

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        // Check dimensions
        if (img.width !== 1200 || img.height !== 400) {
          setSizeWarning(
            `Tamaño actual: ${img.width}x${img.height}px. Recomendado: 1200x400px para mejor visualización.`
          )
        } else {
          setSizeWarning(null)
        }
      }
      img.src = e.target?.result as string
      setImagePreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleImageSelect(file)
  }, [handleImageSelect])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleImageSelect(file)
  }, [handleImageSelect])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!imageFile) {
      setError('Debes seleccionar una imagen.')
      return
    }

    if (!title.trim()) {
      setError('Debes ingresar un título.')
      return
    }

    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('businessId', businessId)
      formData.append('title', title.trim())
      formData.append('image', imageFile)
      formData.append('placement', placement)
      if (linkUrl.trim()) {
        formData.append('linkUrl', linkUrl.trim())
      }

      const res = await fetch('/api/banners/request', {
        method: 'POST',
        body: formData
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al enviar solicitud')
      }

      // Reset form
      setTitle('')
      setImageFile(null)
      setImagePreview(null)
      setLinkUrl('')
      setSizeWarning(null)

      if (onSuccess) onSuccess()
    } catch (err: any) {
      setError(err.message || 'Error al enviar solicitud')
    } finally {
      setUploading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title Input */}
      <div>
        <Label className="text-xs font-bold uppercase tracking-widest mb-2 block">
          Título del Banner *
        </Label>
        <Input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej: Promoción Especial Marzo"
          className="brutalist-input"
          required
          maxLength={100}
        />
      </div>

      {/* Image Upload */}
      <div>
        <Label className="text-xs font-bold uppercase tracking-widest mb-2 block">
          Imagen del Banner *
        </Label>
        <p className="text-xs text-gray-600 mb-2">
          Tamaño recomendado: 1200x400px • Máximo 5MB
        </p>

        {!imagePreview ? (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-dashed border-2 border-black bg-white p-8 text-center hover:bg-gray-50 transition-colors cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          >
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileInput}
              className="hidden"
              id="banner-upload"
            />
            <label htmlFor="banner-upload" className="cursor-pointer">
              <ImageIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="font-bold uppercase tracking-widest text-sm mb-2">
                Arrastra una imagen aquí
              </p>
              <p className="text-xs text-gray-500 mb-4">o haz clic para seleccionar</p>
              <Button type="button" className="brutalist-button" asChild>
                <span>
                  <Upload className="w-4 h-4 mr-2" />
                  Seleccionar Imagen
                </span>
              </Button>
            </label>
          </div>
        ) : (
          <div className="border-2 border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative">
            <button
              type="button"
              onClick={() => {
                setImageFile(null)
                setImagePreview(null)
                setSizeWarning(null)
              }}
              className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 z-10 border-2 border-black"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={imagePreview}
              alt="Preview"
              className="w-full border-2 border-black"
            />
            {sizeWarning && (
              <p className="text-xs text-yellow-700 bg-yellow-50 p-2 mt-2 border-2 border-yellow-600">
                ⚠️ {sizeWarning}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Placement Radio */}
      <div>
        <Label className="text-xs font-bold uppercase tracking-widest mb-3 block">
          Ubicación *
        </Label>
        <div className="space-y-2">
          <label className="flex items-center gap-3 border-2 border-black bg-white p-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer hover:bg-gray-50 hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all">
            <input
              type="radio"
              name="placement"
              value="homepage"
              checked={placement === 'homepage'}
              onChange={() => setPlacement('homepage')}
              className="w-4 h-4"
            />
            <div>
              <p className="font-bold text-sm">Homepage</p>
              <p className="text-xs text-gray-600">Página principal de la comunidad</p>
            </div>
          </label>
          <label className="flex items-center gap-3 border-2 border-black bg-white p-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer hover:bg-gray-50 hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all">
            <input
              type="radio"
              name="placement"
              value="directory"
              checked={placement === 'directory'}
              onChange={() => setPlacement('directory')}
              className="w-4 h-4"
            />
            <div>
              <p className="font-bold text-sm">Directorio</p>
              <p className="text-xs text-gray-600">Página de listado de negocios</p>
            </div>
          </label>
        </div>
      </div>

      {/* Link URL (optional) */}
      <div>
        <Label className="text-xs font-bold uppercase tracking-widest mb-2 block">
          URL de Destino (Opcional)
        </Label>
        <Input
          type="url"
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          placeholder="https://ejemplo.com"
          className="brutalist-input"
        />
        <p className="text-xs text-gray-500 mt-1">
          Si los usuarios hacen clic en el banner, ¿a dónde los llevará?
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="border-2 border-red-600 bg-red-50 p-4 shadow-[4px_4px_0px_0px_rgba(220,38,38,1)]">
          <p className="text-sm text-red-700 font-bold">{error}</p>
        </div>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={uploading}
        className="brutalist-button bg-primary text-white hover:bg-primary/90 w-full"
      >
        {uploading ? 'Enviando...' : 'Enviar Solicitud'}
      </Button>

      <p className="text-xs text-gray-500 text-center">
        Un administrador revisará tu banner antes de activarlo.
      </p>
    </form>
  )
}
