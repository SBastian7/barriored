import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ReviewWithRelations } from '@/lib/types/database'

/**
 * GET /api/reviews/my-reviews
 * Fetches all reviews written by the authenticated user
 */
export async function GET() {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autenticado. Por favor inicia sesión.' },
        { status: 401 }
      )
    }

    // Fetch user's reviews with business and profile data
    const { data: reviews, error: fetchError } = await supabase
      .from('business_reviews')
      .select(`
        *,
        user:profiles!business_reviews_user_id_fkey(
          id,
          full_name,
          avatar_url
        ),
        business:businesses!business_reviews_business_id_fkey(
          id,
          name,
          slug,
          community_id,
          communities(slug)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error('Error fetching user reviews:', fetchError)
      return NextResponse.json(
        { error: 'Error al cargar tus reseñas.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      reviews: reviews as unknown as ReviewWithRelations[],
      total_count: reviews?.length || 0
    })
  } catch (error) {
    console.error('Error in GET /api/reviews/my-reviews:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor.' },
      { status: 500 }
    )
  }
}
