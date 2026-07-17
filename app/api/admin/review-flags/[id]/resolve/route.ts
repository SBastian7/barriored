import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'

const ResolveFlagSchema = z.object({
  status: z.enum(['reviewed', 'dismissed']),
  resolutionNotes: z.string().optional(),
  deleteReview: z.boolean().optional()
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { id: flagId } = await params

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_super_admin, community_id')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'moderator' && !profile.is_super_admin)) {
      return NextResponse.json(
        { error: 'Forbidden - Admin/Moderator access required' },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Validate request body with Zod
    const validation = ResolveFlagSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.issues },
        { status: 400 }
      )
    }

    const { status, resolutionNotes, deleteReview } = validation.data

    // Get flag with business community info for isolation check
    const { data: flag } = await supabase
      .from('review_flags')
      .select(`
        id,
        review_id,
        business_reviews (
          businesses (
            community_id
          )
        )
      `)
      .eq('id', flagId)
      .single()

    if (!flag) {
      return NextResponse.json(
        { error: 'Flag not found' },
        { status: 404 }
      )
    }

    // CRITICAL: Community isolation check (unless super admin)
    if (!profile.is_super_admin) {
      const review = flag.business_reviews as any
      const business = review?.businesses

      if (business?.community_id !== profile.community_id) {
        return NextResponse.json(
          { error: 'Forbidden - Cannot resolve flags outside your community' },
          { status: 403 }
        )
      }
    }

    // Update flag with optimized single query
    const { data: updated, error: updateError } = await supabase
      .from('review_flags')
      .update({
        status,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        resolution_notes: resolutionNotes
      })
      .eq('id', flagId)
      .select()
      .single()

    if (updateError) {
      console.error('Error resolving flag:', updateError)
      return NextResponse.json(
        { error: 'Failed to resolve flag' },
        { status: 500 }
      )
    }

    // Delete review if requested
    if (deleteReview) {
      const { error: deleteError } = await supabase
        .from('business_reviews')
        .delete()
        .eq('id', flag.review_id)

      if (deleteError) {
        console.error('Error deleting review:', deleteError)
        return NextResponse.json(
          { error: 'Failed to delete review' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ flag: updated })
  } catch (error) {
    console.error('Resolve flag error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
