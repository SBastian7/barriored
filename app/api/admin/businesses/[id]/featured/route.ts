import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()

  // Get user profile to check role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_super_admin, community_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden - Must be admin' }, { status: 403 })
  }

  // Super admin can update is_featured and featured_order
  if (profile.is_super_admin) {
    const updateData: any = {
      is_featured: body.is_featured,
      featured_requested: false, // Clear request when super admin acts
    }

    // Only set featured_order if business is being featured
    if (body.is_featured && body.featured_order !== undefined) {
      updateData.featured_order = body.featured_order
    } else if (!body.is_featured) {
      updateData.featured_order = null
    }

    const { data, error } = await supabase
      .from('businesses')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  }

  // Community admin can only request featured
  // Verify business belongs to their community
  const { data: business } = await supabase
    .from('businesses')
    .select('community_id')
    .eq('id', id)
    .single()

  if (!business || business.community_id !== profile.community_id) {
    return NextResponse.json({ error: 'Forbidden - Business not in your community' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('businesses')
    .update({
      featured_requested: true,
      featured_requested_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}
