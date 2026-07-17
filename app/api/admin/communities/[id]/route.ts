import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logAuditAction } from '@/lib/utils/audit-logger'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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
    .single<{ is_super_admin: boolean }>()

  if (!profile?.is_super_admin) {
    return NextResponse.json(
      { error: 'Forbidden - Super admin only' },
      { status: 403 }
    )
  }

  // Get community with stats
  const { data: community, error } = await supabase
    .from('communities')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Get community staff
  const { data: staff } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, role, created_at')
    .eq('community_id', id)
    .in('role', ['admin', 'moderator'])

  // Get stats
  const { data: stats } = await (supabase as any).rpc('get_community_stats', {
    community_uuid: id,
  })

  return NextResponse.json({
    community: {
      ...(community as any),
      staff: staff || [],
      stats: stats?.[0] || {},
    },
  })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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
    .single<{ is_super_admin: boolean }>()

  if (!profile?.is_super_admin) {
    return NextResponse.json(
      { error: 'Forbidden - Super admin only' },
      { status: 403 }
    )
  }

  const body = await request.json()

  // Whitelist allowed fields
  const {
    name,
    slug,
    description,
    location,
    logo_url,
    cover_image_url,
    is_active,
    primary_admin_id,
  } = body

  const updateData: Record<string, unknown> = {}
  if (name !== undefined) updateData.name = name
  if (slug !== undefined) updateData.slug = slug
  if (description !== undefined) updateData.description = description
  if (location !== undefined) updateData.location = location
  if (logo_url !== undefined) updateData.logo_url = logo_url
  if (cover_image_url !== undefined) updateData.cover_image_url = cover_image_url
  if (is_active !== undefined) updateData.is_active = is_active
  // Validate and set primary_admin_id if provided
  if (primary_admin_id !== undefined) {
    if (primary_admin_id === null) {
      // Explicit clear is allowed
      updateData.primary_admin_id = null
    } else {
      const { data: targetProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, role, community_id')
        .eq('id', primary_admin_id)
        .single<{ id: string; role: string; community_id: string }>()

      if (profileError || !targetProfile) {
        return NextResponse.json(
          { error: 'Target profile not found' },
          { status: 400 }
        )
      }

      if (targetProfile.role !== 'admin') {
        return NextResponse.json(
          { error: 'Target profile must have role = admin' },
          { status: 400 }
        )
      }

      if (targetProfile.community_id !== id) {
        return NextResponse.json(
          { error: 'Target profile does not belong to this community' },
          { status: 400 }
        )
      }

      updateData.primary_admin_id = primary_admin_id
    }
  }

  // Get old data for audit log
  const { data: oldCommunity } = await supabase
    .from('communities')
    .select('*')
    .eq('id', id)
    .single()

  // Update community
  const { data: community, error } = await (supabase as any)
    .from('communities')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Log audit action
  await logAuditAction({
    action: 'update_community',
    entityType: 'community',
    entityId: id,
    oldData: oldCommunity,
    newData: community,
  })

  return NextResponse.json({ community })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('is_super_admin').eq('id', user.id).single<{ is_super_admin: boolean }>()

  if (!profile?.is_super_admin) {
    return NextResponse.json({ error: 'Forbidden - Super admin only' }, { status: 403 })
  }

  const url = new URL(request.url)
  const permanent = url.searchParams.get('permanent') === 'true'

  if (permanent) {
    // Verify community exists
    const { data: existing } = await supabase
      .from('communities')
      .select('id')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 })
    }

    // Safety check: block if community has associated data
    const [{ count: bizCount }, { count: userCount }, { count: postCount }, { count: bannerCount }] =
      await Promise.all([
        supabase.from('businesses').select('id', { count: 'exact', head: true }).eq('community_id', id),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('community_id', id),
        supabase.from('community_posts').select('id', { count: 'exact', head: true }).eq('community_id', id),
        supabase.from('banner_ads').select('id', { count: 'exact', head: true }).eq('community_id', id),
      ])

    if (
      (bizCount ?? 0) > 0 ||
      (userCount ?? 0) > 0 ||
      (postCount ?? 0) > 0 ||
      (bannerCount ?? 0) > 0
    ) {
      return NextResponse.json(
        {
          error: `No se puede eliminar: ${bizCount} negocio(s), ${userCount} usuario(s), ${postCount} publicación(es), ${bannerCount} banner(es)`,
        },
        { status: 409 }
      )
    }

    const { error } = await supabase.from('communities').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await logAuditAction({ action: 'delete_community', entityType: 'community', entityId: id })
    return NextResponse.json({ success: true })
  }

  // Soft delete (existing behavior)
  const { error } = await (supabase as any).from('communities').update({ is_active: false }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await logAuditAction({ action: 'archive_community', entityType: 'community', entityId: id })
  return NextResponse.json({ success: true })
}
