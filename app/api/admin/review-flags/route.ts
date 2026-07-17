import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify user is admin or moderator
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

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as 'pending' | 'reviewed' | 'dismissed' | null
    const communityId = searchParams.get('communityId')

    // Community ID required for non-super-admins
    if (!communityId && !profile.is_super_admin) {
      return NextResponse.json(
        { error: 'Community ID required' },
        { status: 400 }
      )
    }

    // Build query with nested relations
    let query = supabase
      .from('review_flags')
      .select(`
        *,
        business_reviews (
          id,
          rating,
          review_text,
          created_at,
          profiles!business_reviews_user_id_fkey (
            id,
            full_name,
            avatar_url
          ),
          businesses (
            id,
            name,
            slug,
            community_id
          )
        ),
        profiles!review_flags_flagged_by_fkey (
          id,
          full_name
        )
      `)
      .order('created_at', { ascending: false })

    // Filter by status if provided
    if (status) {
      query = query.eq('status', status)
    }

    const { data: flags, error } = await query

    if (error) {
      console.error('Error fetching flags:', error)
      return NextResponse.json(
        { error: 'Failed to fetch flags' },
        { status: 500 }
      )
    }

    // Filter by community if not super admin
    let filteredFlags = flags || []
    if (!profile.is_super_admin && communityId) {
      filteredFlags = filteredFlags.filter(flag => {
        const review = flag.business_reviews as any
        const business = review?.businesses
        return business?.community_id === communityId
      })
    }

    return NextResponse.json({ flags: filteredFlags })
  } catch (error) {
    console.error('Get review flags error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
