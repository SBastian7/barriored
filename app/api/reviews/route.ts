import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

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
      .select('id, owner_id, status')
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
