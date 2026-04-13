import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { v4 as uuid } from 'uuid'
import { processImage } from '@/lib/image/process'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File

  if (!file) {
    return NextResponse.json({ error: 'No se proporcionó ningún archivo' }, { status: 400 })
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: 'Solo se permiten imágenes (JPG, PNG, WebP)' },
      { status: 400 }
    )
  }

  // Validate file size (5MB)
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json(
      { error: 'La imagen es muy grande (máximo 5MB)' },
      { status: 400 }
    )
  }

  const rawBuffer = Buffer.from(await file.arrayBuffer())
  const id = uuid()
  const basePath = `${user.id}/${id}`

  const [fullBuffer, thumbBuffer] = await Promise.all([
    processImage(rawBuffer, 1200, 80),
    processImage(rawBuffer, 400, 70),
  ])

  const [fullUpload, thumbUpload] = await Promise.all([
    supabase.storage.from('community-images').upload(`${basePath}.webp`, fullBuffer, { contentType: 'image/webp', upsert: false }),
    supabase.storage.from('community-images').upload(`${basePath}-thumb.webp`, thumbBuffer, { contentType: 'image/webp', upsert: false }),
  ])

  if (fullUpload.error) {
    return NextResponse.json({ error: fullUpload.error.message }, { status: 500 })
  }
  if (thumbUpload.error) {
    return NextResponse.json({ error: thumbUpload.error.message }, { status: 500 })
  }

  const { data: { publicUrl } } = supabase.storage.from('community-images').getPublicUrl(fullUpload.data.path)
  const { data: { publicUrl: thumbnailUrl } } = supabase.storage.from('community-images').getPublicUrl(thumbUpload.data.path)

  return NextResponse.json({ url: publicUrl, thumbnailUrl })
}
