# Business Reviews & Ratings System - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a production-ready reviews and ratings system that allows community members to rate and review local businesses.

**Architecture:** Single reviews table + separate responses table with real-time rating aggregation. Auto-approve reviews with post-moderation flagging system. Multi-tenant RLS isolation.

**Tech Stack:** Next.js 16, React 19, TypeScript, Supabase (PostgreSQL + RLS), Radix UI, Tailwind CSS

---

## Task 1: Database Migration - Create Tables and RLS Policies

**Files:**
- Create: `supabase/migrations/20260313000001_create_reviews_tables.sql`

**Step 1: Create migration file with tables and RLS**

```sql
-- Create business_reviews table
CREATE TABLE business_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure one review per user per business
  UNIQUE(business_id, user_id)
);

-- Create indexes for performance
CREATE INDEX idx_business_reviews_business ON business_reviews(business_id);
CREATE INDEX idx_business_reviews_user ON business_reviews(user_id);
CREATE INDEX idx_business_reviews_created ON business_reviews(created_at DESC);

-- Create business_review_responses table
CREATE TABLE business_review_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES business_reviews(id) ON DELETE CASCADE,
  response_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Only one response per review
  UNIQUE(review_id)
);

CREATE INDEX idx_review_responses_review ON business_review_responses(review_id);

-- Enable RLS on business_reviews
ALTER TABLE business_reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can view reviews for approved businesses
CREATE POLICY "Anyone can view reviews for approved businesses"
  ON business_reviews FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = business_reviews.business_id
      AND businesses.status = 'approved'
    )
  );

-- Authenticated users can create reviews for approved businesses
CREATE POLICY "Authenticated users can create reviews"
  ON business_reviews FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = business_id
      AND businesses.status = 'approved'
    )
  );

-- Users can update their own reviews
CREATE POLICY "Users can update own reviews"
  ON business_reviews FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own reviews
CREATE POLICY "Users can delete own reviews"
  ON business_reviews FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can manage all reviews in their community
CREATE POLICY "Community staff can manage reviews"
  ON business_reviews FOR ALL
  USING (
    is_community_staff((
      SELECT community_id FROM businesses
      WHERE businesses.id = business_reviews.business_id
    )::text)
  );

-- Enable RLS on business_review_responses
ALTER TABLE business_review_responses ENABLE ROW LEVEL SECURITY;

-- Anyone can view responses for visible reviews
CREATE POLICY "Anyone can view responses"
  ON business_review_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM business_reviews
      JOIN businesses ON businesses.id = business_reviews.business_id
      WHERE business_reviews.id = business_review_responses.review_id
      AND businesses.status = 'approved'
    )
  );

-- Business owners can create/update responses for their business reviews
CREATE POLICY "Business owners can manage responses"
  ON business_review_responses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM business_reviews
      JOIN businesses ON businesses.id = business_reviews.business_id
      WHERE business_reviews.id = business_review_responses.review_id
      AND businesses.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM business_reviews
      JOIN businesses ON businesses.id = business_reviews.business_id
      WHERE business_reviews.id = business_review_responses.review_id
      AND businesses.owner_id = auth.uid()
    )
  );

-- Community staff can manage all responses
CREATE POLICY "Community staff can manage all responses"
  ON business_review_responses FOR ALL
  USING (
    is_community_staff((
      SELECT b.community_id
      FROM business_reviews br
      JOIN businesses b ON b.id = br.business_id
      WHERE br.id = business_review_responses.review_id
    )::text)
  );
```

**Step 2: Apply migration to local Supabase**

Run: `npx supabase db reset`
Expected: Migration runs successfully, tables created with RLS enabled

**Step 3: Verify migration applied correctly**

Run: `npx supabase db diff`
Expected: No pending changes (migration is clean)

**Step 4: Commit migration**

```bash
git add supabase/migrations/20260313000001_create_reviews_tables.sql
git commit -m "feat(db): add business_reviews and business_review_responses tables with RLS

- Create business_reviews table (rating 1-5, optional text)
- Create business_review_responses table (one response per review)
- Add UNIQUE constraint (one review per user per business)
- Add CASCADE delete on business/user deletion
- Implement RLS policies for multi-tenant security
- Add indexes for performance

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Generate and Update TypeScript Types

**Files:**
- Modify: `lib/types/database.ts` (add helper types at end)

**Step 1: Generate types from Supabase**

Run: `npx supabase gen types typescript --local > lib/types/database.ts`
Expected: TypeScript types generated with new tables

**Step 2: Add helper types for reviews**

Add to end of `lib/types/database.ts`:

```typescript
// ============================================================================
// Review & Rating Helper Types
// ============================================================================

export type Review = Database['public']['Tables']['business_reviews']['Row']
export type ReviewInsert = Database['public']['Tables']['business_reviews']['Insert']
export type ReviewUpdate = Database['public']['Tables']['business_reviews']['Update']

export type ReviewResponse = Database['public']['Tables']['business_review_responses']['Row']

export type ReviewWithRelations = Review & {
  user: {
    id: string
    full_name: string | null
    avatar_url: string | null
  } | null
  response: ReviewResponse | null
}
```

**Step 3: Verify types compile**

Run: `npm run type-check`
Expected: No TypeScript errors

**Step 4: Commit type updates**

```bash
git add lib/types/database.ts
git commit -m "feat(types): add review and rating TypeScript types

- Generate types from Supabase schema
- Add Review, ReviewInsert, ReviewUpdate types
- Add ReviewWithRelations for API responses

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Create Review API - POST /api/reviews

**Files:**
- Create: `app/api/reviews/route.ts`

**Step 1: Create POST handler for creating reviews**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const createReviewSchema = z.object({
  business_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  review_text: z.string().max(1000).nullable().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Inicia sesión para dejar una reseña.' },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = createReviewSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { business_id, rating, review_text } = validationResult.data

    // Check if business exists and is approved
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, owner_id, status')
      .eq('id', business_id)
      .single()

    if (businessError || !business) {
      return NextResponse.json(
        { error: 'Este negocio ya no está disponible.' },
        { status: 404 }
      )
    }

    if (business.status !== 'approved') {
      return NextResponse.json(
        { error: 'Este negocio aún no está aprobado.' },
        { status: 403 }
      )
    }

    // Prevent business owners from reviewing their own business
    if (business.owner_id === user.id) {
      return NextResponse.json(
        { error: 'No puedes dejar reseñas en tu propio negocio.' },
        { status: 403 }
      )
    }

    // Create review (UNIQUE constraint will catch duplicate)
    const { data: review, error: createError } = await supabase
      .from('business_reviews')
      .insert({
        business_id,
        user_id: user.id,
        rating,
        review_text: review_text || null,
      })
      .select()
      .single()

    if (createError) {
      // Check for unique constraint violation (duplicate review)
      if (createError.code === '23505') {
        return NextResponse.json(
          { error: 'Ya dejaste una reseña para este negocio. Puedes editarla.' },
          { status: 409 }
        )
      }

      console.error('Error creating review:', createError)
      return NextResponse.json(
        { error: 'Error al publicar reseña. Intenta de nuevo.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, review }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/reviews:', error)
    return NextResponse.json(
      { error: 'Error al publicar reseña. Intenta de nuevo.' },
      { status: 500 }
    )
  }
}
```

**Step 2: Test POST endpoint manually**

Run: `npm run dev`
Test: `curl -X POST http://localhost:3000/api/reviews -H "Content-Type: application/json" -d '{"business_id":"test-uuid","rating":5}'`
Expected: 401 Unauthorized (not authenticated)

**Step 3: Commit POST endpoint**

```bash
git add app/api/reviews/route.ts
git commit -m "feat(api): add POST /api/reviews endpoint

- Create review with rating (required) and text (optional)
- Validate rating 1-5
- Check business exists and is approved
- Prevent owners from reviewing own business
- Handle duplicate review (409 Conflict)
- Return 201 on success

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Create Review API - GET /api/reviews

**Files:**
- Modify: `app/api/reviews/route.ts` (add GET handler)

**Step 1: Add GET handler for listing reviews**

Add to `app/api/reviews/route.ts`:

```typescript
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const business_id = searchParams.get('business_id')
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50)
    const offset = parseInt(searchParams.get('offset') || '0')
    const sort = searchParams.get('sort') || 'newest'

    if (!business_id) {
      return NextResponse.json(
        { error: 'business_id is required' },
        { status: 400 }
      )
    }

    // Build query
    let query = supabase
      .from('business_reviews')
      .select(`
        id,
        rating,
        review_text,
        created_at,
        updated_at,
        user:profiles (
          id,
          full_name,
          avatar_url
        ),
        response:business_review_responses (
          response_text,
          created_at,
          updated_at
        )
      `, { count: 'exact' })
      .eq('business_id', business_id)
      .range(offset, offset + limit - 1)

    // Apply sorting
    switch (sort) {
      case 'highest':
        query = query.order('rating', { ascending: false })
        break
      case 'lowest':
        query = query.order('rating', { ascending: true })
        break
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false })
        break
    }

    const { data: reviews, error: reviewsError, count } = await query

    if (reviewsError) {
      console.error('Error fetching reviews:', reviewsError)
      return NextResponse.json(
        { error: 'Error al cargar reseñas.' },
        { status: 500 }
      )
    }

    // Calculate average rating
    const { data: ratingData } = await supabase
      .from('business_reviews')
      .select('rating')
      .eq('business_id', business_id)

    const average_rating = ratingData && ratingData.length > 0
      ? ratingData.reduce((sum, r) => sum + r.rating, 0) / ratingData.length
      : 0

    return NextResponse.json({
      reviews: reviews || [],
      total_count: count || 0,
      average_rating: Math.round(average_rating * 10) / 10, // Round to 1 decimal
    })
  } catch (error) {
    console.error('Error in GET /api/reviews:', error)
    return NextResponse.json(
      { error: 'Error al cargar reseñas.' },
      { status: 500 }
    )
  }
}
```

**Step 2: Test GET endpoint**

Run: `npm run dev`
Test: Visit `http://localhost:3000/api/reviews?business_id=test-uuid`
Expected: Returns `{ reviews: [], total_count: 0, average_rating: 0 }`

**Step 3: Commit GET endpoint**

```bash
git add app/api/reviews/route.ts
git commit -m "feat(api): add GET /api/reviews endpoint

- List reviews for a business with pagination
- Include user profile (name, avatar)
- Include business response if exists
- Support sorting (newest, highest, lowest)
- Calculate average rating in real-time
- Return total count for pagination

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Create Review API - PATCH and DELETE

**Files:**
- Create: `app/api/reviews/[reviewId]/route.ts`

**Step 1: Create PATCH and DELETE handlers**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  review_text: z.string().max(1000).nullable().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  try {
    const { reviewId } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autenticado.' },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = updateReviewSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const updateData = validationResult.data

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

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autenticado.' },
        { status: 401 }
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
```

**Step 2: Test endpoints manually**

Run: `npm run dev`
Expected: Endpoints respond with 401 Unauthorized when not authenticated

**Step 3: Commit update/delete endpoints**

```bash
git add app/api/reviews/[reviewId]/route.ts
git commit -m "feat(api): add PATCH and DELETE review endpoints

- PATCH /api/reviews/[id] to update rating and/or text
- DELETE /api/reviews/[id] to remove review
- RLS enforces ownership (users can only edit/delete own reviews)
- CASCADE delete removes response automatically
- Return 403 for unauthorized access

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Create Response API Routes

**Files:**
- Create: `app/api/reviews/[reviewId]/response/route.ts`

**Step 1: Create POST and DELETE handlers for responses**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

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

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autenticado.' },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = responseSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      )
    }

    const { response_text } = validationResult.data

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

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autenticado.' },
        { status: 401 }
      )
    }

    // Delete response (RLS will enforce ownership)
    const { error: deleteError } = await supabase
      .from('business_review_responses')
      .delete()
      .eq('review_id', reviewId)

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

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/reviews/[reviewId]/response:', error)
    return NextResponse.json(
      { error: 'Error al eliminar respuesta.' },
      { status: 500 }
    )
  }
}
```

**Step 2: Test endpoints manually**

Run: `npm run dev`
Expected: Endpoints respond with 401 when not authenticated

**Step 3: Commit response endpoints**

```bash
git add app/api/reviews/[reviewId]/response/route.ts
git commit -m "feat(api): add business response endpoints

- POST /api/reviews/[id]/response to create/update response
- DELETE /api/reviews/[id]/response to remove response
- Validate minimum 10 chars, maximum 500 chars
- RLS enforces business ownership
- UPSERT handles create and update
- Return 403 for unauthorized access

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Create StarRating Component

**Files:**
- Create: `components/reviews/star-rating.tsx`

**Step 1: Create interactive star rating component**

```typescript
'use client'

import { Star } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface StarRatingProps {
  value: number | null
  onChange?: (rating: number) => void
  readonly?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function StarRating({ value, onChange, readonly = false, size = 'md' }: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null)

  const displayRating = hoverRating !== null ? hoverRating : value || 0

  const starSize = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  }[size]

  const handleClick = (rating: number) => {
    if (!readonly && onChange) {
      onChange(rating)
    }
  }

  const handleMouseEnter = (rating: number) => {
    if (!readonly) {
      setHoverRating(rating)
    }
  }

  const handleMouseLeave = () => {
    if (!readonly) {
      setHoverRating(null)
    }
  }

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((rating) => {
        const isFilled = rating <= displayRating

        return (
          <button
            key={rating}
            type="button"
            onClick={() => handleClick(rating)}
            onMouseEnter={() => handleMouseEnter(rating)}
            onMouseLeave={handleMouseLeave}
            disabled={readonly}
            className={cn(
              'transition-transform',
              !readonly && 'hover:scale-110 cursor-pointer',
              readonly && 'cursor-default'
            )}
            aria-label={`${rating} estrellas`}
          >
            <Star
              className={cn(
                starSize,
                'stroke-black stroke-2',
                isFilled ? 'fill-primary text-primary' : 'fill-white text-white'
              )}
            />
          </button>
        )
      })}
    </div>
  )
}
```

**Step 2: Test component in isolation**

Create test file or visually test in Storybook/browser

**Step 3: Commit StarRating component**

```bash
git add components/reviews/star-rating.tsx
git commit -m "feat(ui): add StarRating component

- Interactive 1-5 star rating selector
- Hover preview for selection
- Readonly mode for display
- Neo-brutalist style (black stroke, red fill)
- Accessible with keyboard navigation
- Size variants (sm, md, lg)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Create BusinessRating Component

**Files:**
- Create: `components/reviews/business-rating.tsx`

**Step 1: Create compact rating display component**

```typescript
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BusinessRatingProps {
  averageRating: number
  reviewCount: number
  size?: 'sm' | 'md' | 'lg'
  showCount?: boolean
}

export function BusinessRating({
  averageRating,
  reviewCount,
  size = 'md',
  showCount = true,
}: BusinessRatingProps) {
  // Don't render if no reviews
  if (reviewCount === 0) {
    return null
  }

  const starSize = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  }[size]

  const textSize = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }[size]

  const fullStars = Math.floor(averageRating)
  const hasHalfStar = averageRating % 1 >= 0.5

  return (
    <div className="flex items-center gap-1.5">
      {/* Star display */}
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((position) => {
          const isFilled = position <= fullStars
          const isHalf = position === fullStars + 1 && hasHalfStar

          return (
            <Star
              key={position}
              className={cn(
                starSize,
                'stroke-black stroke-2',
                isFilled && 'fill-primary text-primary',
                !isFilled && !isHalf && 'fill-white text-white',
                isHalf && 'fill-primary/50 text-primary/50'
              )}
            />
          )
        })}
      </div>

      {/* Rating number */}
      <span className={cn('font-bold tracking-tight', textSize)}>
        {averageRating.toFixed(1)}
      </span>

      {/* Review count */}
      {showCount && (
        <span className={cn('text-muted-foreground', textSize)}>
          ({reviewCount})
        </span>
      )}
    </div>
  )
}
```

**Step 2: Test component visually**

Run: `npm run dev`
Expected: Component renders stars correctly for various ratings

**Step 3: Commit BusinessRating component**

```bash
git add components/reviews/business-rating.tsx
git commit -m "feat(ui): add BusinessRating display component

- Show average rating with filled/half/empty stars
- Display review count
- Size variants (sm, md, lg)
- Neo-brutalist style (bold, black outlines)
- Hide if no reviews (return null)
- Format rating to 1 decimal place

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Create ReviewCard Component

**Files:**
- Create: `components/reviews/review-card.tsx`

**Step 1: Create review card display component**

```typescript
'use client'

import { Star, Pencil, Trash2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ReviewWithRelations } from '@/lib/types/database'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface ReviewCardProps {
  review: ReviewWithRelations
  isOwner: boolean
  canRespond: boolean
  onEdit?: () => void
  onDelete?: () => void
  onRespond?: () => void
}

export function ReviewCard({
  review,
  isOwner,
  canRespond,
  onEdit,
  onDelete,
  onRespond,
}: ReviewCardProps) {
  const userName = review.user?.full_name || 'Usuario eliminado'
  const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase()

  return (
    <Card className="brutalist-card">
      <CardContent className="p-4 space-y-3">
        {/* Header: User info + Actions */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-black">
              <AvatarImage src={review.user?.avatar_url || undefined} alt={userName} />
              <AvatarFallback className="bg-secondary text-black font-bold">
                {userInitials}
              </AvatarFallback>
            </Avatar>

            <div>
              <p className="font-bold text-sm uppercase tracking-tight">{userName}</p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(review.created_at), {
                  addSuffix: true,
                  locale: es,
                })}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          {isOwner && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={onEdit}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={onDelete}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Star rating */}
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((position) => (
            <Star
              key={position}
              className={cn(
                'h-5 w-5 stroke-black stroke-2',
                position <= review.rating
                  ? 'fill-primary text-primary'
                  : 'fill-white text-white'
              )}
            />
          ))}
        </div>

        {/* Review text */}
        {review.review_text && (
          <p className="text-sm leading-relaxed">{review.review_text}</p>
        )}

        {/* Business response */}
        {review.response && (
          <div className="mt-4 pl-4 border-l-4 border-secondary bg-secondary/10 p-3">
            <p className="text-xs font-bold uppercase tracking-widest mb-2">
              Respuesta del negocio
            </p>
            <p className="text-sm">{review.response.response_text}</p>
            <p className="text-xs text-muted-foreground mt-2">
              {formatDistanceToNow(new Date(review.response.created_at), {
                addSuffix: true,
                locale: es,
              })}
            </p>
          </div>
        )}

        {/* Respond button for business owner */}
        {canRespond && !review.response && (
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={onRespond}
          >
            Responder
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
```

**Step 2: Install date-fns if not already installed**

Run: `npm install date-fns`
Expected: Package installed successfully

**Step 3: Commit ReviewCard component**

```bash
git add components/reviews/review-card.tsx package.json package-lock.json
git commit -m "feat(ui): add ReviewCard component

- Display review with user avatar, name, date
- Show 1-5 star rating
- Display review text if provided
- Show business response in highlighted box
- Edit/delete buttons for review owner
- Respond button for business owner
- Neo-brutalist card styling
- Format dates with date-fns (Spanish locale)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 10: Create ReviewForm Component

**Files:**
- Create: `components/reviews/review-form.tsx`

**Step 1: Create review form modal component**

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { StarRating } from './star-rating'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface ReviewFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  businessId: string
  businessName: string
  existingReview?: {
    id: string
    rating: number
    review_text: string | null
  } | null
  onSuccess: () => void
}

export function ReviewForm({
  open,
  onOpenChange,
  businessId,
  businessName,
  existingReview,
  onSuccess,
}: ReviewFormProps) {
  const [rating, setRating] = useState<number | null>(existingReview?.rating || null)
  const [reviewText, setReviewText] = useState(existingReview?.review_text || '')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isEditing = !!existingReview
  const charCount = reviewText.length
  const maxChars = 1000

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!rating) {
      toast.error('Selecciona una calificación de 1 a 5 estrellas.')
      return
    }

    setIsSubmitting(true)

    try {
      const url = isEditing
        ? `/api/reviews/${existingReview.id}`
        : '/api/reviews'

      const method = isEditing ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: businessId,
          rating,
          review_text: reviewText.trim() || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Error al guardar reseña')
        return
      }

      toast.success(isEditing ? 'Reseña actualizada' : '¡Reseña publicada!')
      onSuccess()
      onOpenChange(false)

      // Reset form
      setRating(null)
      setReviewText('')
    } catch (error) {
      console.error('Error submitting review:', error)
      toast.error('Error al guardar reseña. Intenta de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] brutalist-card">
        <DialogHeader>
          <DialogTitle className="font-heading font-black uppercase italic text-xl">
            {isEditing ? 'Editar Reseña' : 'Escribir Reseña'}
          </DialogTitle>
          <DialogDescription>
            {businessName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Star rating */}
          <div className="space-y-2">
            <Label className="uppercase tracking-widest text-xs font-bold">
              Calificación *
            </Label>
            <StarRating value={rating} onChange={setRating} size="lg" />
          </div>

          {/* Review text */}
          <div className="space-y-2">
            <Label htmlFor="review-text" className="uppercase tracking-widest text-xs font-bold">
              Reseña (opcional)
            </Label>
            <Textarea
              id="review-text"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Comparte tu experiencia..."
              className="brutalist-input min-h-[120px] resize-none"
              maxLength={maxChars}
            />
            <p className="text-xs text-muted-foreground text-right">
              {charCount}/{maxChars}
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="brutalist-button"
              disabled={!rating || isSubmitting}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Actualizar' : 'Publicar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

**Step 2: Install sonner if not already installed**

Run: `npm install sonner`
Expected: Toast library installed

**Step 3: Commit ReviewForm component**

```bash
git add components/reviews/review-form.tsx package.json package-lock.json
git commit -m "feat(ui): add ReviewForm modal component

- Create/edit review with star rating (required)
- Optional review text (max 1000 chars)
- Character counter
- Loading state during submission
- Error handling with toast notifications
- Disable submit until rating selected
- Reset form on success
- Neo-brutalist dialog styling

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 11: Create ReviewList Component

**Files:**
- Create: `components/reviews/review-list.tsx`

**Step 1: Create review list with pagination**

```typescript
'use client'

import { useEffect, useState } from 'react'
import { ReviewCard } from './review-card'
import { ReviewForm } from './review-form'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ReviewWithRelations } from '@/lib/types/database'
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'

interface ReviewListProps {
  businessId: string
  businessName: string
  currentUserId: string | null
  businessOwnerId: string
}

export function ReviewList({
  businessId,
  businessName,
  currentUserId,
  businessOwnerId,
}: ReviewListProps) {
  const [reviews, setReviews] = useState<ReviewWithRelations[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [sort, setSort] = useState<'newest' | 'highest' | 'lowest'>('newest')
  const [page, setPage] = useState(0)
  const [reviewToEdit, setReviewToEdit] = useState<ReviewWithRelations | null>(null)
  const [reviewToDelete, setReviewToDelete] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)

  const pageSize = 10
  const totalPages = Math.ceil(totalCount / pageSize)

  const fetchReviews = async () => {
    setIsLoading(true)
    try {
      const offset = page * pageSize
      const response = await fetch(
        `/api/reviews?business_id=${businessId}&limit=${pageSize}&offset=${offset}&sort=${sort}`
      )
      const data = await response.json()

      if (response.ok) {
        setReviews(data.reviews)
        setTotalCount(data.total_count)
      } else {
        toast.error('Error al cargar reseñas')
      }
    } catch (error) {
      console.error('Error fetching reviews:', error)
      toast.error('Error al cargar reseñas')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchReviews()
  }, [businessId, sort, page])

  const handleDelete = async (reviewId: string) => {
    try {
      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Reseña eliminada')
        fetchReviews()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Error al eliminar reseña')
      }
    } catch (error) {
      console.error('Error deleting review:', error)
      toast.error('Error al eliminar reseña')
    } finally {
      setReviewToDelete(null)
    }
  }

  if (isLoading && reviews.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!isLoading && totalCount === 0) {
    return (
      <div className="text-center py-12 space-y-2">
        <p className="text-muted-foreground">Aún no hay reseñas para este negocio.</p>
        <p className="font-bold uppercase tracking-widest text-sm">
          ¡Sé el primero en dejar una reseña!
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Sort dropdown */}
      <div className="flex justify-between items-center">
        <h3 className="font-heading font-black uppercase italic text-lg">
          Reseñas ({totalCount})
        </h3>
        <Select value={sort} onValueChange={(v: any) => setSort(v)}>
          <SelectTrigger className="w-[180px] brutalist-input">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Más recientes</SelectItem>
            <SelectItem value="highest">Mejor valoradas</SelectItem>
            <SelectItem value="lowest">Peor valoradas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Reviews */}
      <div className="space-y-4">
        {reviews.map((review) => (
          <ReviewCard
            key={review.id}
            review={review}
            isOwner={currentUserId === review.user_id}
            canRespond={currentUserId === businessOwnerId && !review.response}
            onEdit={() => {
              setReviewToEdit(review)
              setIsFormOpen(true)
            }}
            onDelete={() => setReviewToDelete(review.id)}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="flex items-center px-4 font-bold">
            {page + 1} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Edit Review Form */}
      {isFormOpen && (
        <ReviewForm
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          businessId={businessId}
          businessName={businessName}
          existingReview={reviewToEdit}
          onSuccess={() => {
            fetchReviews()
            setReviewToEdit(null)
          }}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!reviewToDelete} onOpenChange={() => setReviewToDelete(null)}>
        <AlertDialogContent className="brutalist-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading font-black uppercase italic">
              ¿Seguro que quieres eliminar tu reseña?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => reviewToDelete && handleDelete(reviewToDelete)}
              className="brutalist-button"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
```

**Step 2: Test component renders**

Run: `npm run dev`
Expected: Component compiles without errors

**Step 3: Commit ReviewList component**

```bash
git add components/reviews/review-list.tsx
git commit -m "feat(ui): add ReviewList component with pagination

- Fetch and display reviews with user/response data
- Sort dropdown (newest, highest, lowest)
- Pagination (10 per page)
- Edit/delete own reviews with confirmation
- Empty state for no reviews
- Loading state
- Refresh on CRUD operations
- Neo-brutalist styling

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 12: Create WriteReviewButton Component

**Files:**
- Create: `components/reviews/write-review-button.tsx`

**Step 1: Create CTA button component**

```typescript
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ReviewForm } from './review-form'
import { Star } from 'lucide-react'
import { toast } from 'sonner'

interface WriteReviewButtonProps {
  businessId: string
  businessName: string
  businessOwnerId: string
  currentUserId: string | null
}

export function WriteReviewButton({
  businessId,
  businessName,
  businessOwnerId,
  currentUserId,
}: WriteReviewButtonProps) {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [existingReview, setExistingReview] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Check if user already reviewed this business
  useEffect(() => {
    if (!currentUserId) return

    const checkExistingReview = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/reviews?business_id=${businessId}`)
        const data = await response.json()

        if (response.ok) {
          const userReview = data.reviews.find(
            (r: any) => r.user?.id === currentUserId
          )
          setExistingReview(userReview || null)
        }
      } catch (error) {
        console.error('Error checking existing review:', error)
      } finally {
        setIsLoading(false)
      }
    }

    checkExistingReview()
  }, [businessId, currentUserId])

  // Don't show button if not authenticated
  if (!currentUserId) {
    return null
  }

  // Don't show button if user owns the business
  if (currentUserId === businessOwnerId) {
    return null
  }

  const buttonText = existingReview ? 'Editar Reseña' : 'Escribir Reseña'

  return (
    <>
      <Button
        onClick={() => setIsFormOpen(true)}
        className="brutalist-button"
        disabled={isLoading}
      >
        <Star className="mr-2 h-4 w-4" />
        {buttonText}
      </Button>

      <ReviewForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        businessId={businessId}
        businessName={businessName}
        existingReview={existingReview}
        onSuccess={() => {
          window.location.reload() // Simple refresh to update all components
        }}
      />
    </>
  )
}
```

**Step 2: Test component logic**

Run: `npm run dev`
Expected: Component hides for non-authenticated and business owners

**Step 3: Commit WriteReviewButton**

```bash
git add components/reviews/write-review-button.tsx
git commit -m "feat(ui): add WriteReviewButton CTA component

- Check if user already reviewed (show Edit vs Write)
- Hide for unauthenticated users
- Hide for business owners (can't review own business)
- Open ReviewForm modal on click
- Refresh page on success to update all data
- Neo-brutalist button styling

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 13: Integrate Reviews into Business Profile Page

**Files:**
- Modify: `app/[community]/business/[slug]/page.tsx`

**Step 1: Import review components and fetch average rating**

Find the business profile page and add review components.

Add imports at top:
```typescript
import { BusinessRating } from '@/components/reviews/business-rating'
import { ReviewList } from '@/components/reviews/review-list'
import { WriteReviewButton } from '@/components/reviews/write-review-button'
```

**Step 2: Fetch reviews data in server component**

After fetching business data, add:

```typescript
// Fetch current user
const { data: { user } } = await supabase.auth.getUser()

// Fetch review stats
const { data: reviewStats } = await supabase
  .from('business_reviews')
  .select('rating')
  .eq('business_id', business.id)

const reviewCount = reviewStats?.length || 0
const averageRating = reviewCount > 0
  ? reviewStats.reduce((sum, r) => sum + r.rating, 0) / reviewCount
  : 0
```

**Step 3: Add components to JSX**

After the action buttons row (ShareButton, ReportButton), add:

```tsx
{/* Write Review Button */}
<div className="flex justify-end mb-6">
  <WriteReviewButton
    businessId={business.id}
    businessName={business.name}
    businessOwnerId={business.owner_id}
    currentUserId={user?.id || null}
  />
</div>

{/* Average Rating Summary */}
{reviewCount > 0 && (
  <div className="mb-6">
    <BusinessRating
      averageRating={averageRating}
      reviewCount={reviewCount}
      size="lg"
    />
  </div>
)}
```

After LocationMap component, before Linked Events, add:

```tsx
{/* Reviews Section */}
<div className="mt-8">
  <ReviewList
    businessId={business.id}
    businessName={business.name}
    currentUserId={user?.id || null}
    businessOwnerId={business.owner_id}
  />
</div>
```

**Step 4: Test integration**

Run: `npm run dev`
Navigate to a business profile page
Expected: Reviews section appears, Write Review button shows for authenticated users

**Step 5: Commit integration**

```bash
git add app/[community]/business/[slug]/page.tsx
git commit -m "feat(business): integrate reviews into business profile page

- Add WriteReviewButton in action row
- Display BusinessRating summary if reviews exist
- Add ReviewList section below map
- Fetch review stats in server component
- Calculate average rating
- Pass user auth state to components

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 14: Add Premium Badge to Directory Cards

**Files:**
- Modify: `components/directory/business-card.tsx` (or equivalent directory listing component)
- Create: `components/business/premium-badge.tsx`

**Step 1: Create PremiumBadge component**

```typescript
import { cn } from '@/lib/utils'

export function PremiumBadge({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'inline-block px-3 py-1 rotate-[-2deg]',
        'bg-secondary text-black',
        'border-2 border-black',
        'shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]',
        'font-bold uppercase tracking-widest text-xs',
        className
      )}
    >
      DESTACADO
    </div>
  )
}
```

**Step 2: Modify directory card to include rating and premium badge**

Find the business card component in directory. Add imports:

```typescript
import { BusinessRating } from '@/components/reviews/business-rating'
import { PremiumBadge } from '@/components/business/premium-badge'
```

Add to business card JSX (top-right corner for badge):

```tsx
{/* Premium Badge */}
{business.is_featured && (
  <div className="absolute top-2 right-2">
    <PremiumBadge />
  </div>
)}

{/* Rating below business name/category */}
{reviewCount > 0 && (
  <BusinessRating
    averageRating={averageRating}
    reviewCount={reviewCount}
    size="sm"
  />
)}
```

**Note:** You'll need to pass `reviewCount` and `averageRating` as props to the card component or fetch within card.

**Step 3: Test premium badge and rating display**

Run: `npm run dev`
Expected: Premium badge shows for featured businesses, ratings show on cards

**Step 4: Commit premium badge**

```bash
git add components/business/premium-badge.tsx components/directory/business-card.tsx
git commit -m "feat(ui): add premium badge and ratings to directory cards

- Create PremiumBadge component (DESTACADO)
- Add badge to top-right of featured business cards
- Display BusinessRating on directory cards
- Neo-brutalist style (yellow bg, rotated, hard shadow)
- Only show if business is_featured = true

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 15: Add Admin Review Moderation API

**Files:**
- Create: `app/api/admin/reviews/[reviewId]/route.ts`

**Step 1: Create admin delete review endpoint**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  try {
    const { reviewId } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autenticado.' },
        { status: 401 }
      )
    }

    // Check if user is community staff
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_super_admin, community_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: 'Usuario no encontrado.' },
        { status: 404 }
      )
    }

    const isStaff = profile.is_super_admin ||
                    profile.role === 'admin' ||
                    profile.role === 'moderator'

    if (!isStaff) {
      return NextResponse.json(
        { error: 'No tienes permiso para moderar reseñas.' },
        { status: 403 }
      )
    }

    // Delete review (RLS will enforce community isolation for non-super-admins)
    const { error: deleteError } = await supabase
      .from('business_reviews')
      .delete()
      .eq('id', reviewId)

    if (deleteError) {
      console.error('Error deleting review:', deleteError)
      return NextResponse.json(
        { error: 'Error al eliminar reseña.' },
        { status: 500 }
      )
    }

    // Log audit entry
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'delete_review',
      entity_type: 'business_review',
      entity_id: reviewId,
      community_id: profile.community_id,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/admin/reviews/[reviewId]:', error)
    return NextResponse.json(
      { error: 'Error al eliminar reseña.' },
      { status: 500 }
    )
  }
}
```

**Step 2: Test endpoint authorization**

Run: `npm run dev`
Expected: Returns 401 for non-authenticated, 403 for regular users

**Step 3: Commit admin endpoint**

```bash
git add app/api/admin/reviews/[reviewId]/route.ts
git commit -m "feat(api): add admin review moderation endpoint

- DELETE /api/admin/reviews/[id] for admins/moderators
- Check user is community staff
- RLS enforces community isolation
- Create audit log entry
- Return 403 for unauthorized users

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 16: Final Testing and Documentation

**Files:**
- Modify: `USE-CASES-BY-ROLE.md` (check off completed use cases)
- Create: `docs/testing/reviews-manual-test-checklist.md`

**Step 1: Create manual testing checklist**

```markdown
# Reviews & Ratings - Manual Testing Checklist

## Anonymous Visitor
- [ ] View business reviews on profile page
- [ ] See average rating on business cards in directory
- [ ] See premium "DESTACADO" badge on featured businesses
- [ ] Cannot submit review (no button shown)

## Registered User
- [ ] See "Escribir Reseña" button on business profile
- [ ] Can submit review with star rating (required)
- [ ] Can optionally add review text (max 1000 chars)
- [ ] See "Editar Reseña" button if already reviewed
- [ ] Can edit own review (rating and/or text)
- [ ] Can delete own review with confirmation
- [ ] Cannot review own business (button hidden)
- [ ] Cannot submit duplicate review (409 error)

## Business Owner
- [ ] See "Responder" button on reviews for own business
- [ ] Can post response (min 10 chars, max 500 chars)
- [ ] Can edit response
- [ ] Can delete response
- [ ] Response appears under review in highlighted box

## Admin/Moderator
- [ ] Can delete any review via admin API
- [ ] Audit log entry created on deletion

## Visual/UX
- [ ] Neo-brutalist styling consistent (black borders, hard shadows)
- [ ] Stars render correctly (filled red, empty white outline)
- [ ] Forms are keyboard accessible
- [ ] Character counters update in real-time
- [ ] Loading states show during API calls
- [ ] Error messages are clear and actionable
- [ ] Mobile responsive (especially on business profile)
- [ ] Confirmation dialog prevents accidental deletion

## Performance
- [ ] Business profile page loads in <2s
- [ ] Directory with 50 businesses loads in <3s
- [ ] Creating review completes in <500ms
- [ ] Average rating calculates correctly

## Edge Cases
- [ ] Handle user account deletion (show "Usuario eliminado")
- [ ] Handle business deletion (reviews cascade delete)
- [ ] Handle zero reviews (show empty state)
- [ ] Rating-only review (no text) saves correctly
- [ ] Long review text (1000 chars) displays properly
```

**Step 2: Update USE-CASES-BY-ROLE.md**

Check off completed Phase 2 monetization use cases:
- [x] View business reviews and ratings
- [x] View business average rating score
- [x] See premium/featured badge on businesses
- [x] Submit review for a business
- [x] Rate a business (1-5 stars)
- [x] Edit own reviews
- [x] Delete own reviews

**Step 3: Run full manual test**

Go through checklist systematically
Document any bugs or issues
Expected: All critical paths work correctly

**Step 4: Commit testing docs**

```bash
git add docs/testing/reviews-manual-test-checklist.md USE-CASES-BY-ROLE.md
git commit -m "docs: add manual testing checklist for reviews

- Create comprehensive test checklist
- Cover all user roles (visitor, user, owner, admin)
- Include visual/UX tests
- Include performance benchmarks
- Mark completed use cases in USE-CASES-BY-ROLE.md

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 17: Production Deployment

**Files:**
- N/A (deployment steps)

**Step 1: Push migration to production Supabase**

Run: `npx supabase db push`
Expected: Migration applies to production database

**Step 2: Verify RLS policies in production**

Check Supabase dashboard → Database → Policies
Expected: All RLS policies active on both tables

**Step 3: Deploy to production (Vercel/Hostinger)**

Run: `git push origin master`
Expected: Deployment succeeds, app builds without errors

**Step 4: Smoke test in production**

- Visit production business profile page
- Verify reviews section renders
- Test creating a review (if authenticated)
- Verify rating appears on directory cards
Expected: All features work in production

**Step 5: Monitor error logs**

Check Vercel/Hostinger logs for 24 hours
Expected: No RLS errors, no API errors

**Step 6: Final commit and tag**

```bash
git tag -a v2.0.0-reviews -m "Release: Business Reviews & Ratings System

Phase 2 Monetization feature complete:
- Users can rate and review businesses (1-5 stars + optional text)
- Business owners can respond to reviews
- Premium/featured badge on directory cards
- Real-time rating aggregation
- Multi-tenant RLS security
- Neo-brutalist tropical UI

Metrics:
- 2 new database tables
- 6 API endpoints
- 8 new UI components
- Full CRUD operations
- Admin moderation support"

git push origin v2.0.0-reviews
```

---

## Success Criteria

After implementation, verify:

✅ **Functional:**
- Users can create, edit, delete reviews
- Business owners can respond to reviews
- Average ratings display on cards and profiles
- Premium badges show for featured businesses
- RLS prevents unauthorized access

✅ **Technical:**
- All API endpoints return correct status codes
- Database constraints prevent duplicate reviews
- TypeScript types are accurate
- No console errors in browser
- Mobile responsive on all screen sizes

✅ **Performance:**
- Business profile loads in <2s
- Directory page loads in <3s
- API responses <500ms

✅ **Security:**
- RLS policies enforce multi-tenant isolation
- Users can only edit/delete own reviews
- Business owners can only respond to own business reviews
- Admins can only moderate within their community

---

## Rollback Plan

If critical issues arise in production:

1. **Disable review submission:** Set feature flag or remove WriteReviewButton
2. **Hide review display:** Comment out ReviewList in business profile
3. **Revert migration:** Run `npx supabase db reset` on production (WARNING: deletes all reviews)
4. **Deploy previous version:** `git revert <commit-hash>` and redeploy

**NOTE:** Only revert migration if database is corrupted. Prefer disabling features via code.

---

## Next Steps (Future Enhancements)

Out of scope for current implementation:

- Photo uploads with reviews
- "Helpful" votes on reviews
- Review sorting by helpfulness
- Business owner analytics dashboard
- Email notifications for new reviews
- Cached aggregates for scale (when >1000 businesses)
- Anti-spam ML filtering
- Review templates/quick responses

---

## Plan Complete

**Total Tasks:** 17
**Estimated Time:** 8-12 hours for experienced developer
**Deployment Risk:** Low (additive feature, no breaking changes)
