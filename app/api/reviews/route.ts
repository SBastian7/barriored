import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { sendNewReviewEmail } from '@/lib/email/resend';
import { createAdminClient } from '@/lib/supabase/admin';

// Validation schema for review submission
const reviewSchema = z.object({
  business_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  review_text: z.string().max(1000).nullable().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Inicia sesión para dejar una reseña.' },
        { status: 401 }
      );
    }

    // 2. Check if user is suspended
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_suspended')
      .eq('id', user.id)
      .single();

    if (profile?.is_suspended) {
      return NextResponse.json(
        { error: 'Cuenta suspendida.' },
        { status: 403 }
      );
    }

    // 3. Parse and validate request body
    const body = await request.json();
    const validation = reviewSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos.', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { business_id, rating, review_text } = validation.data;

    // 4. Check if business exists and is approved
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, owner_id, status, name, community_id')
      .eq('id', business_id)
      .single();

    if (businessError || !business) {
      return NextResponse.json(
        { error: 'Este negocio ya no está disponible.' },
        { status: 404 }
      );
    }

    if (business.status !== 'approved') {
      return NextResponse.json(
        { error: 'Este negocio aún no está aprobado.' },
        { status: 403 }
      );
    }

    // 5. Prevent self-review
    if (business.owner_id === user.id) {
      return NextResponse.json(
        { error: 'No puedes dejar reseñas en tu propio negocio.' },
        { status: 403 }
      );
    }

    // 6. Create review
    const { data: review, error: insertError } = await supabase
      .from('business_reviews')
      .insert({
        business_id,
        user_id: user.id,
        rating,
        review_text: review_text || null,
      })
      .select()
      .single();

    if (insertError) {
      // Handle duplicate review constraint
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'Ya dejaste una reseña para este negocio. Puedes editarla.' },
          { status: 409 }
        );
      }

      console.error('Error inserting review:', insertError);
      return NextResponse.json(
        { error: 'Error al publicar reseña. Intenta de nuevo.' },
        { status: 500 }
      );
    }

    // Fire-and-forget: notify business owner of new review
    if (business.owner_id && business.owner_id !== user.id) {
      const adminClient = createAdminClient();
      Promise.all([
        adminClient.auth.admin.getUserById(business.owner_id),
        adminClient.from('communities').select('slug').eq('id', business.community_id!).single(),
      ]).then(([ownerResult, commResult]) => {
        const ownerEmail = ownerResult.data?.user?.email;
        const communitySlug = (commResult.data as any)?.slug || '';
        if (ownerEmail) {
          return sendNewReviewEmail(ownerEmail, business.name, rating, review_text || null, communitySlug);
        }
      }).catch((e) => console.error('Failed to send review notification:', e));
    }

    return NextResponse.json(
      { success: true, review },
      { status: 201 }
    );
  } catch (error) {
    console.error('Unexpected error in POST /api/reviews:', error);
    return NextResponse.json(
      { error: 'Error al publicar reseña. Intenta de nuevo.' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // 1. Validate required business_id parameter
    const businessId = searchParams.get('business_id');

    // Validate UUID format
    if (!businessId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(businessId)) {
      return NextResponse.json(
        { error: 'ID de negocio inválido.' },
        { status: 400 }
      );
    }

    // 2. Parse pagination and sort parameters with bounds checking
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '10', 10) || 10), 50);
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10) || 0);
    const sort = searchParams.get('sort') || 'newest';

    // 3. Build query with relations
    let query = supabase
      .from('business_reviews')
      .select(
        `
        id,
        user_id,
        rating,
        review_text,
        created_at,
        updated_at,
        user:profiles!business_reviews_user_id_fkey (
          id,
          full_name,
          avatar_url
        ),
        response:business_review_responses (
          response_text,
          created_at,
          updated_at
        )
      `,
        { count: 'exact' }
      )
      .eq('business_id', businessId);

    // 4. Apply sorting
    switch (sort) {
      case 'highest':
        query = query.order('rating', { ascending: false });
        break;
      case 'lowest':
        query = query.order('rating', { ascending: true });
        break;
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false });
    }

    // 5. Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: reviews, error: reviewsError, count } = await query;

    if (reviewsError) {
      console.error('Error fetching reviews:', reviewsError);
      return NextResponse.json(
        { error: 'Error al cargar reseñas.' },
        { status: 500 }
      );
    }

    // 6. Calculate average rating (separate query for all ratings)
    const { data: ratingData } = await supabase
      .from('business_reviews')
      .select('rating')
      .eq('business_id', businessId);

    const average_rating =
      ratingData && ratingData.length > 0
        ? Math.round(
            (ratingData.reduce((sum, r) => sum + r.rating, 0) /
              ratingData.length) *
              10
          ) / 10
        : 0;

    return NextResponse.json({
      reviews: reviews || [],
      total_count: count || 0,
      average_rating,
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/reviews:', error);
    return NextResponse.json(
      { error: 'Error al cargar reseñas.' },
      { status: 500 }
    );
  }
}
