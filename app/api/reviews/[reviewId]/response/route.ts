import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Type for review with business owner relation
type ReviewWithBusiness = {
  id: string
  business_id: string
  businesses: {
    owner_id: string
  }
}

const responseSchema = z.object({
  response_text: z.string().min(10, 'La respuesta debe tener al menos 10 caracteres').max(500),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  try {
    const { reviewId } = await params
    const supabase = await createClient()

    // Validate UUID format
    if (!UUID_REGEX.test(reviewId)) {
      return NextResponse.json(
        { error: 'ID de reseña inválido.' },
        { status: 400 }
      )
    }

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autenticado.' },
        { status: 401 }
      )
    }

    // Check if user is suspended
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_suspended')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Error al verificar usuario.' },
        { status: 500 }
      )
    }

    if (profile.is_suspended) {
      return NextResponse.json(
        { error: 'Tu cuenta está suspendida y no puede publicar respuestas.' },
        { status: 403 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = responseSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0].message },
        { status: 400 }
      )
    }

    const { response_text } = validationResult.data

    // Explicit ownership verification before upsert
    // This adds one extra DB call but provides better UX:
    // - Returns specific 404 if review doesn't exist
    // - Returns specific 403 if user doesn't own business
    // - Prevents unnecessary upsert attempts for unauthorized users
    // Trade-off: ~20-50ms latency for clearer error messages
    const { data: review, error: reviewError } = await supabase
      .from('business_reviews')
      .select('id, business_id, businesses!inner(owner_id)')
      .eq('id', reviewId)
      .single()

    if (reviewError || !review) {
      return NextResponse.json(
        { error: 'La reseña no existe.' },
        { status: 404 }
      )
    }

    // Verify user owns the business
    const businessOwnerId = (review as ReviewWithBusiness).businesses.owner_id
    if (businessOwnerId !== user.id) {
      return NextResponse.json(
        { error: 'Solo el dueño del negocio puede responder.' },
        { status: 403 }
      )
    }

    // Create or update response (UNIQUE constraint handles upsert)
    // RLS will enforce that user owns the business
    const { data: response, error: createError } = await supabase
      .from('business_review_responses')
      .upsert({
        review_id: reviewId,
        response_text,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating response:', createError)

      if (createError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Solo el dueño del negocio puede responder.' },
          { status: 403 }
        )
      }

      if (createError.code === '23503') { // Foreign key violation
        return NextResponse.json(
          { error: 'La reseña ya no existe.' },
          { status: 404 }
        )
      }

      return NextResponse.json(
        { error: 'Error al publicar respuesta.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, response }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/reviews/[reviewId]/response:', error)
    return NextResponse.json(
      { error: 'Error al publicar respuesta.' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  try {
    const { reviewId } = await params
    const supabase = await createClient()

    // Validate UUID format
    if (!UUID_REGEX.test(reviewId)) {
      return NextResponse.json(
        { error: 'ID de reseña inválido.' },
        { status: 400 }
      )
    }

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autenticado.' },
        { status: 401 }
      )
    }

    // Check if user is suspended
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_suspended')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Error al verificar usuario.' },
        { status: 500 }
      )
    }

    if (profile.is_suspended) {
      return NextResponse.json(
        { error: 'Tu cuenta está suspendida y no puede eliminar respuestas.' },
        { status: 403 }
      )
    }

    // Explicit ownership verification before delete
    // This adds one extra DB call but provides better UX:
    // - Returns specific 404 if review doesn't exist
    // - Returns specific 403 if user doesn't own business
    // - Prevents unnecessary delete attempts for unauthorized users
    // Trade-off: ~20-50ms latency for clearer error messages
    const { data: review, error: reviewError } = await supabase
      .from('business_reviews')
      .select('id, business_id, businesses!inner(owner_id)')
      .eq('id', reviewId)
      .single()

    if (reviewError || !review) {
      return NextResponse.json(
        { error: 'La reseña no existe.' },
        { status: 404 }
      )
    }

    // Verify user owns the business
    const businessOwnerId = (review as ReviewWithBusiness).businesses.owner_id
    if (businessOwnerId !== user.id) {
      return NextResponse.json(
        { error: 'No tienes permiso para eliminar esta respuesta.' },
        { status: 403 }
      )
    }

    // Delete response (RLS will enforce ownership)
    const { data: deletedRows, error: deleteError } = await supabase
      .from('business_review_responses')
      .delete()
      .eq('review_id', reviewId)
      .select()

    if (deleteError) {
      console.error('Error deleting response:', deleteError)

      if (deleteError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'No tienes permiso para eliminar esta respuesta.' },
          { status: 403 }
        )
      }

      return NextResponse.json(
        { error: 'Error al eliminar respuesta.' },
        { status: 500 }
      )
    }

    // Check if any rows were deleted
    if (!deletedRows || deletedRows.length === 0) {
      return NextResponse.json(
        { error: 'No se encontró ninguna respuesta para eliminar.' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/reviews/[reviewId]/response:', error)
    return NextResponse.json(
      { error: 'Error al eliminar respuesta.' },
      { status: 500 }
    )
  }
}
