import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { sendAdminFlaggedContentNotification } from '@/lib/notifications/community'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Type for review with business owner relation
type ReviewWithBusiness = {
  id: string
  business_id: string
  review_text: string | null
  businesses: {
    owner_id: string
    community_id: string
  }
}

// Zod schema for request body validation
const FlagReviewSchema = z.object({
  reason: z.enum(['spam', 'offensive', 'fake', 'irrelevant', 'other'], {
    error: 'Motivo inválido.'
  }),
  description: z.string().optional()
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
        { error: 'Tu cuenta está suspendida y no puede reportar reseñas.' },
        { status: 403 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = FlagReviewSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0].message },
        { status: 400 }
      )
    }

    const { reason, description } = validationResult.data

    // Get review and verify user owns the business
    const { data: review, error: reviewError } = await supabase
      .from('business_reviews')
      .select('id, business_id, review_text, businesses!inner(owner_id, community_id)')
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
        { error: 'Solo puedes reportar reseñas de tu propio negocio.' },
        { status: 403 }
      )
    }

    // Check for existing flag by this user
    const { data: existing } = await supabase
      .from('review_flags')
      .select('id')
      .eq('review_id', reviewId)
      .eq('flagged_by', user.id)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Ya reportaste esta reseña.' },
        { status: 400 }
      )
    }

    // Create flag
    const { data: flag, error: insertError } = await supabase
      .from('review_flags')
      .insert({
        review_id: reviewId,
        flagged_by: user.id,
        reason,
        description,
        status: 'pending'
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating flag:', insertError)
      return NextResponse.json(
        { error: 'Error al reportar reseña.' },
        { status: 500 }
      )
    }

    // Notify admins on first flag only
    const { count: existingFlagCount } = await supabase
      .from('review_flags')
      .select('*', { count: 'exact', head: true })
      .eq('review_id', reviewId)

    if ((existingFlagCount ?? 0) <= 1) {
      const reviewWithBusiness = review as ReviewWithBusiness
      const communityId = reviewWithBusiness.businesses.community_id
      const excerpt = (reviewWithBusiness.review_text ?? '').slice(0, 80)
      sendAdminFlaggedContentNotification(communityId, {
        type: 'review',
        title: excerpt || 'Reseña reportada',
        reason,
        adminPanelUrl: `https://barriored.co/admin/review-flags`,
      })
    }

    return NextResponse.json({ flag }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/reviews/[reviewId]/flag:', error)
    return NextResponse.json(
      { error: 'Error al reportar reseña.' },
      { status: 500 }
    )
  }
}
