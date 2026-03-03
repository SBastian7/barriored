import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check super admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_super_admin) {
    return NextResponse.json(
      { error: 'Forbidden - Super admin only' },
      { status: 403 }
    )
  }

  // Get all communities with stats
  const { data: communities, error } = await supabase.rpc(
    'get_communities_with_stats'
  )

  if (error) {
    // Fallback: Get communities without stats function
    const { data, error: commError } = await supabase
      .from('communities')
      .select('*')
      .order('created_at', { ascending: false })

    if (commError) {
      return NextResponse.json({ error: commError.message }, { status: 500 })
    }

    // Get stats for each community manually
    const withStats = await Promise.all(
      data.map(async (community) => {
        const { data: stats } = await supabase.rpc(
          'get_community_stats',
          { community_uuid: community.id }
        )

        return {
          ...community,
          stats: stats?.[0] || {
            businesses_count: 0,
            users_count: 0,
            admins_count: 0,
            posts_count: 0,
            alerts_count: 0,
          },
        }
      })
    )

    return NextResponse.json({ communities: withStats })
  }

  return NextResponse.json({ communities })
}

export async function POST(request: Request) {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check super admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_super_admin) {
    return NextResponse.json(
      { error: 'Forbidden - Super admin only' },
      { status: 403 }
    )
  }

  const body = await request.json()
  const { name, slug, municipality, department, description, logo_url } = body

  // Validate required fields
  if (!name || !slug || !municipality || !department) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    )
  }

  // Check slug uniqueness
  const { data: existing } = await supabase
    .from('communities')
    .select('id')
    .eq('slug', slug)
    .single()

  if (existing) {
    return NextResponse.json(
      { error: 'Slug already exists' },
      { status: 400 }
    )
  }

  // Create community
  const { data: community, error } = await supabase
    .from('communities')
    .insert({
      name,
      slug,
      municipality,
      department,
      description,
      logo_url,
      is_active: true,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ community })
}
