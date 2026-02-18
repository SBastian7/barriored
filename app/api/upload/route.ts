import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { v4 as uuid } from 'uuid'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  // Validate file type and size
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Solo se permiten imagenes (JPG, PNG, WebP)' }, { status: 400 })
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'Imagen muy grande (max 5MB)' }, { status: 400 })
  }

  const ext = file.name.split('.').pop()
  const path = `${user.id}/${uuid()}.${ext}`

  const { data, error } = await supabase.storage
    .from('business-images')
    .upload(path, file)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage
    .from('business-images')
    .getPublicUrl(data.path)

  return NextResponse.json({ url: publicUrl })
}
