import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  // Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  // Get user profile to check role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_super_admin, community_id')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'admin' && !profile.is_super_admin)) {
    return NextResponse.json(
      { error: 'No tienes permisos para realizar esta acción' },
      { status: 403 }
    )
  }

  // Parse query parameters
  const searchParams = request.nextUrl.searchParams
  const category = searchParams.get('category') || 'all'
  const status = searchParams.get('status') || 'all'
  const search = searchParams.get('search') || ''
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = parseInt(searchParams.get('offset') || '0')

  // Build query
  let query = supabase
    .from('classifieds')
    .select(
      `
      *,
      profiles!classifieds_user_id_fkey(id, full_name, avatar_url),
      marketplace_categories(id, name, slug, icon),
      communities(id, name, slug)
    `,
      { count: 'exact' }
    )

  // Filter by community (unless super admin viewing all)
  if (!profile.is_super_admin) {
    query = query.eq('community_id', profile.community_id)
  } else if (searchParams.get('community_id')) {
    query = query.eq('community_id', searchParams.get('community_id'))
  }

  // Filter by category
  if (category !== 'all') {
    // We need to join through marketplace_categories to filter by slug
    const { data: categoryData } = await supabase
      .from('marketplace_categories')
      .select('id')
      .eq('slug', category)
      .single()

    if (categoryData) {
      query = query.eq('category_id', categoryData.id)
    }
  }

  // Filter by status
  if (status !== 'all') {
    query = query.eq('status', status)
  }

  // Search in title and description
  if (search) {
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
  }

  // Order and paginate
  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  const { data: classifieds, error, count } = await query

  if (error) {
    console.error('Error fetching classifieds:', error)
    return NextResponse.json(
      { error: 'Error al obtener clasificados' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    classifieds,
    total: count || 0,
    page: Math.floor(offset / limit) + 1,
    limit,
  })
}
