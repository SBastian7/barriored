import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check permissions
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_super_admin, community_id')
    .eq('id', user.id)
    .single() as { data: any }

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  try {
    // Build query
    let query = (supabase
      .from('communities') as any)
      .select('id, name, slug')
      .order('name')

    // Community admins/moderators see only their community
    if (!profile.is_super_admin && profile.community_id) {
      query = query.eq('id', profile.community_id)
    }

    const { data: communities, error } = await query

    if (error) throw error

    return NextResponse.json(communities || [])
  } catch (error) {
    console.error('Communities fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch communities' }, { status: 500 })
  }
}
