'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { X, Upload } from 'lucide-react'
import { toast } from 'sonner'

type Props = { form: any; update: (v: any) => void }

export function StepPhotos({ form, update }: Props) {
  const [uploading, setUploading] = useState(false)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (form.photos.length >= 5) { toast.error('Maximo 5 fotos'); return }

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    const res = await fetch('/api/upload', { method: 'POST', body: formData })
    const data = await res.json()
    setUploading(false)

    if (!res.ok) { toast.error(data.error); return }
    update({ photos: [...form.photos, data.url] })
  }

  function removePhoto(index: number) {
    update({ photos: form.photos.filter((_: string, i: number) => i !== index) })
  }

  return (
    <div className="space-y-4">
      <Label>Fotos del negocio (max 5)</Label>
      <div className="grid grid-cols-3 gap-2">
        {form.photos.map((url: string, i: number) => (
          <div key={i} className="relative aspect-square rounded-lg overflow-hidden">
            <Image src={url} alt={`Foto ${i + 1}`} fill className="object-cover" />
            <button onClick={() => removePhoto(i)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1">
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
      <div>
        <Input type="file" accept="image/*" onChange={handleUpload} disabled={uploading || form.photos.length >= 5} />
        {uploading && <p className="text-sm text-gray-500 mt-1">Subiendo...</p>}
      </div>
    </div>
  )
}
