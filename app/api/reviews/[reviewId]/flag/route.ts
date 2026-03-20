import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { reviewId } = await params

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { reason, description } = body as {
      reason: 'spam' | 'offensive' | 'fake' | 'irrelevant' | 'other'
      description?: string
    }

    if (!reason) {
      return NextResponse.json(
        { error: 'Reason required' },
        { status: 400 }
      )
    }

    // Validate reason
    const validReasons = ['spam', 'offensive', 'fake', 'irrelevant', 'other']
    if (!validReasons.includes(reason)) {
      return NextResponse.json(
        { error: 'Invalid reason' },
        { status: 400 }
      )
    }

    // Get review and verify user owns the business
    const { data: review } = await supabase
      .from('business_reviews')
      .select('id, business_id, businesses(owner_id)')
      .eq('id', reviewId)
      .single()

    if (!review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      )
    }

    const business = review.businesses as unknown as { owner_id: string }
    if (business.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden - You can only flag reviews on your own business' },
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
        { error: 'Ya reportaste esta reseña' },
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
        { error: 'Failed to flag review' },
        { status: 500 }
      )
    }

    return NextResponse.json({ flag }, { status: 201 })
  } catch (error) {
    console.error('Flag review error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
