import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

  // Validate file size (2MB for avatars)
  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json(
      { error: 'La imagen es muy grande (máximo 2MB)' },
      { status: 400 }
    )
  }

  // Delete old avatar if exists
  const { data: existingFiles } = await supabase.storage
    .from('profile-images')
    .list(user.id)

  if (existingFiles && existingFiles.length > 0) {
    const filesToDelete = existingFiles.map(f => `${user.id}/${f.name}`)
    await supabase.storage
      .from('profile-images')
      .remove(filesToDelete)
  }

  // Upload new avatar (always named avatar.{ext})
  const ext = file.name.split('.').pop()
  const path = `${user.id}/avatar.${ext}`

  const { data, error } = await supabase.storage
    .from('profile-images')
    .upload(path, file, { upsert: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: { publicUrl } } = supabase.storage
    .from('profile-images')
    .getPublicUrl(data.path)

  return NextResponse.json({ url: publicUrl })
}
