import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params
  const communityId = id

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check permissions
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_super_admin, community_id')
    .eq('id', user.id)
    .single()

  const canAccess = profile?.is_super_admin ||
    (profile?.role === 'admin' && profile?.community_id === communityId)

  if (!canAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    // Fetch SEO settings
    const { data: settings, error } = await supabase
      .from('community_seo_settings')
      .select('*')
      .eq('community_id', communityId)
      .single()

    if (error && error.code !== 'PGRST116') { // Ignore not found error
      throw error
    }

    // If no settings exist, return defaults
    if (!settings) {
      const { data: community } = await supabase
        .from('communities')
        .select('name, slug')
        .eq('id', communityId)
        .single()

      return NextResponse.json({
        meta_title: `${community?.name || 'Comunidad'} - BarrioRed`,
        meta_description: `Descubre negocios locales, eventos y servicios en ${community?.name || 'tu barrio'}. Plataforma comunitaria 100% local.`,
        meta_keywords: ['barrio', community?.name.toLowerCase() || 'comunidad', 'negocios locales'],
        og_image_url: null
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('SEO fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch SEO settings' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params
  const communityId = id

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check permissions
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_super_admin, community_id')
    .eq('id', user.id)
    .single()

  const canAccess = profile?.is_super_admin ||
    (profile?.role === 'admin' && profile?.community_id === communityId)

  if (!canAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { meta_title, meta_description, meta_keywords, og_image_url } = body

    // Validate
    if (!meta_title || !meta_description) {
      return NextResponse.json({ error: 'Title and description are required' }, { status: 400 })
    }

    if (meta_title.length > 70) {
      return NextResponse.json({ error: 'Title must be 70 characters or less' }, { status: 400 })
    }

    if (meta_description.length > 160) {
      return NextResponse.json({ error: 'Description must be 160 characters or less' }, { status: 400 })
    }

    // Upsert settings
    const { data, error } = await supabase
      .from('community_seo_settings')
      .upsert({
        community_id: communityId,
        meta_title,
        meta_description,
        meta_keywords: meta_keywords || [],
        og_image_url,
        updated_at: new Date().toISOString()
      }, { onConflict: 'community_id' })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('SEO update error:', error)
    return NextResponse.json({ error: 'Failed to update SEO settings' }, { status: 500 })
  }
}
