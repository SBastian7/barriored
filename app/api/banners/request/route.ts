import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isValidUUID } from '@/lib/validations/common'
import type { Database } from '@/lib/types/database'

type BannerPlacement = 'homepage' | 'directory'

const VALID_PLACEMENTS: BannerPlacement[] = ['homepage', 'directory']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 1. Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Inicia sesión para solicitar un banner.' },
        { status: 401 }
      )
    }

    // 2. Parse FormData
    const formData = await request.formData()
    const businessId = formData.get('businessId') as string | null
    const title = formData.get('title') as string | null
    const imageFile = formData.get('imageFile') as File | null
    const placement = formData.get('placement') as string | null
    const linkUrl = formData.get('linkUrl') as string | null

    // Debug logging
    console.log('=== Banner Request Debug ===')
    console.log('businessId:', businessId)
    console.log('title:', title)
    console.log('imageFile:', imageFile)
    console.log('imageFile type:', typeof imageFile)
    console.log('imageFile instanceof File:', imageFile instanceof File)
    console.log('placement:', placement)
    console.log('All FormData keys:', Array.from(formData.keys()))
    console.log('=========================')

    // 3. Validate required fields
    if (!businessId || !title || !imageFile || !placement) {
      return NextResponse.json(
        { error: 'Todos los campos son obligatorios (businessId, title, imageFile, placement).' },
        { status: 400 }
      )
    }

    // 4. Validate businessId is a valid UUID
    if (!isValidUUID(businessId)) {
      return NextResponse.json(
        { error: 'ID de negocio inválido.' },
        { status: 400 }
      )
    }

    // 5. Validate placement
    if (!VALID_PLACEMENTS.includes(placement as BannerPlacement)) {
      return NextResponse.json(
        { error: 'Ubicación inválida. Debe ser "homepage" o "directory".' },
        { status: 400 }
      )
    }

    // 6. Validate title length
    if (title.trim().length === 0 || title.length > 100) {
      return NextResponse.json(
        { error: 'El título debe tener entre 1 y 100 caracteres.' },
        { status: 400 }
      )
    }

    // 7. Validate image file type
    if (!ALLOWED_IMAGE_TYPES.includes(imageFile.type)) {
      return NextResponse.json(
        { error: 'Solo se permiten imágenes JPG, PNG o WebP.' },
        { status: 400 }
      )
    }

    // 8. Validate image file size
    if (imageFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'La imagen es muy grande (máximo 5MB).' },
        { status: 400 }
      )
    }

    // 9. Verify business exists and user is the owner
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, owner_id, community_id, status')
      .eq('id', businessId)
      .single()

    if (businessError || !business) {
      return NextResponse.json(
        { error: 'Este negocio no existe.' },
        { status: 404 }
      )
    }

    if (business.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'No tienes permiso para crear banners para este negocio.' },
        { status: 403 }
      )
    }

    // 10. Check if business is approved
    if (business.status !== 'approved') {
      return NextResponse.json(
        { error: 'El negocio debe estar aprobado para solicitar banners.' },
        { status: 403 }
      )
    }

    // 11. Check for existing pending banner for this placement
    const { data: pendingBanner } = await supabase
      .from('banner_ads')
      .select('id')
      .eq('business_id', businessId)
      .eq('placement', placement)
      .eq('status', 'requested')
      .maybeSingle()

    if (pendingBanner) {
      return NextResponse.json(
        { error: 'Ya tienes una solicitud de banner pendiente para esta ubicación.' },
        { status: 400 }
      )
    }

    // 12. Upload image to Supabase Storage
    const fileExt = imageFile.name.split('.').pop() || 'jpg'
    const fileName = `${businessId}/${Date.now()}.${fileExt}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('banners')
      .upload(fileName, imageFile, {
        contentType: imageFile.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Error uploading banner image:', uploadError)
      return NextResponse.json(
        { error: 'Error al subir la imagen. Intenta de nuevo.' },
        { status: 500 }
      )
    }

    // 13. Get public URL for the uploaded image
    const {
      data: { publicUrl },
    } = supabase.storage.from('banners').getPublicUrl(uploadData.path)

    // 14. Create banner record
    const { data: banner, error: insertError } = await supabase
      .from('banner_ads')
      .insert({
        business_id: businessId,
        community_id: business.community_id,
        title: title.trim(),
        image_url: publicUrl,
        link_url: linkUrl?.trim() || null,
        placement: placement as BannerPlacement,
        status: 'requested',
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating banner:', insertError)

      // Attempt to clean up uploaded file
      await supabase.storage.from('banners').remove([uploadData.path])

      return NextResponse.json(
        { error: 'Error al crear la solicitud de banner. Intenta de nuevo.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        banner,
        message: 'Solicitud de banner enviada. Un administrador la revisará pronto.',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Unexpected error in POST /api/banners/request:', error)
    return NextResponse.json(
      { error: 'Error al procesar la solicitud. Intenta de nuevo.' },
      { status: 500 }
    )
  }
}
