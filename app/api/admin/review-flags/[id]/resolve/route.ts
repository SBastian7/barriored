import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

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
    const { status, resolutionNotes, deleteReview } = body as {
      status: 'reviewed' | 'dismissed'
      resolutionNotes?: string
      deleteReview?: boolean
    }

    if (!status || !['reviewed', 'dismissed'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      )
    }

    // Get flag
    const { data: flag } = await supabase
      .from('review_flags')
      .select('id, review_id')
      .eq('id', flagId)
      .single()

    if (!flag) {
      return NextResponse.json(
        { error: 'Flag not found' },
        { status: 404 }
      )
    }

    // Update flag
    const { error: updateError } = await supabase
      .from('review_flags')
      .update({
        status,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        resolution_notes: resolutionNotes
      })
      .eq('id', flagId)

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

    // Get updated flag
    const { data: updated } = await supabase
      .from('review_flags')
      .select('*')
      .eq('id', flagId)
      .single()

    return NextResponse.json({ flag: updated })
  } catch (error) {
    console.error('Resolve flag error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
