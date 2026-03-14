import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  review_text: z.string().max(1000).nullable().optional(),
})

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function PATCH(
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

    if (profileError) {
      console.error('Error fetching profile:', profileError)
      return NextResponse.json(
        { error: 'Error al verificar usuario.' },
        { status: 500 }
      )
    }

    if (profile?.is_suspended) {
      return NextResponse.json(
        { error: 'Tu cuenta está suspendida y no puedes editar reseñas.' },
        { status: 403 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = updateReviewSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validationResult.error },
        { status: 400 }
      )
    }

    const updateData = validationResult.data

    // Ensure at least one field is being updated
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'Debes proporcionar al menos un campo para actualizar.' },
        { status: 400 }
      )
    }

    // Update review (RLS will enforce ownership)
    const { data: review, error: updateError } = await supabase
      .from('business_reviews')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reviewId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating review:', updateError)

      if (updateError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'No tienes permiso para editar esta reseña.' },
          { status: 403 }
        )
      }

      return NextResponse.json(
        { error: 'Error al actualizar reseña.' },
        { status: 500 }
      )
    }

    if (!review) {
      return NextResponse.json(
        { error: 'Esta reseña ya no existe.' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, review })
  } catch (error) {
    console.error('Error in PATCH /api/reviews/[reviewId]:', error)
    return NextResponse.json(
      { error: 'Error al actualizar reseña.' },
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

    if (profileError) {
      console.error('Error fetching profile:', profileError)
      return NextResponse.json(
        { error: 'Error al verificar usuario.' },
        { status: 500 }
      )
    }

    if (profile?.is_suspended) {
      return NextResponse.json(
        { error: 'Tu cuenta está suspendida y no puedes eliminar reseñas.' },
        { status: 403 }
      )
    }

    // Delete review (RLS will enforce ownership, CASCADE will delete response)
    const { error: deleteError } = await supabase
      .from('business_reviews')
      .delete()
      .eq('id', reviewId)

    if (deleteError) {
      console.error('Error deleting review:', deleteError)

      if (deleteError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'No tienes permiso para eliminar esta reseña.' },
          { status: 403 }
        )
      }

      return NextResponse.json(
        { error: 'Error al eliminar reseña.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/reviews/[reviewId]:', error)
    return NextResponse.json(
      { error: 'Error al eliminar reseña.' },
      { status: 500 }
    )
  }
}
