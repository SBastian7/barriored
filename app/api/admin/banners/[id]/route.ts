import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Database } from '@/lib/types/database'
import { isValidUUID } from '@/lib/validations/common'

type BannerUpdate = Database['public']['Tables']['banner_ads']['Update']
type BannerStatus = 'requested' | 'active' | 'paused' | 'expired' | 'rejected'

interface UpdateBannerStatusRequest {
  status: BannerStatus
  rejection_reason?: string
}

// Type guard for banner with community_id
interface BannerWithCommunity {
  id: string
  community_id: string
  status: string
}

function hasBannerCommunity(data: unknown): data is BannerWithCommunity {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'community_id' in data &&
    'status' in data &&
    typeof (data as { community_id: unknown }).community_id === 'string'
  )
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: bannerId } = await params

    // Validate UUID format
    if (!isValidUUID(bannerId)) {
      return NextResponse.json(
        { error: 'ID de banner inválido' },
        { status: 400 }
      )
    }

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    // Verify user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_super_admin, community_id')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'admin' && !profile.is_super_admin)) {
      return NextResponse.json(
        { error: 'Acceso denegado - Se requieren permisos de administrador' },
        { status: 403 }
      )
    }

    // Parse and validate request body
    const body = await request.json() as Partial<UpdateBannerStatusRequest>

    if (!body.status) {
      return NextResponse.json(
        { error: 'El campo status es requerido' },
        { status: 400 }
      )
    }

    const allowedStatuses: BannerStatus[] = ['requested', 'active', 'paused', 'expired', 'rejected']

    if (!allowedStatuses.includes(body.status)) {
      return NextResponse.json(
        { error: `Estado inválido. Debe ser uno de: ${allowedStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    if (body.status === 'rejected' && !body.rejection_reason?.trim()) {
      return NextResponse.json(
        { error: 'Se requiere una razón de rechazo' },
        { status: 400 }
      )
    }

    const { status, rejection_reason } = body as UpdateBannerStatusRequest

    // Get banner and verify community access
    const { data: banner, error: fetchError } = await supabase
      .from('banner_ads')
      .select('id, community_id, status')
      .eq('id', bannerId)
      .single()

    if (fetchError || !banner) {
      return NextResponse.json(
        { error: 'Banner no encontrado' },
        { status: 404 }
      )
    }

    // Type guard for banner community access
    if (!hasBannerCommunity(banner)) {
      console.error('Invalid banner data structure:', banner)
      return NextResponse.json(
        { error: 'Error de estructura de datos' },
        { status: 500 }
      )
    }

    const bannerCommunityId = banner.community_id

    // Verify community access for non-super admins
    if (!profile.is_super_admin && profile.community_id !== bannerCommunityId) {
      return NextResponse.json(
        { error: 'Acceso denegado - No puedes gestionar banners de otra comunidad' },
        { status: 403 }
      )
    }

    // Update banner status
    const bannerUpdate: BannerUpdate = {
      status,
      updated_at: new Date().toISOString(),
      ...(status === 'rejected' && {
        rejection_reason: rejection_reason!.trim(),
        rejected_at: new Date().toISOString(),
        rejected_by: user.id
      })
    }

    const { data: updated, error: updateError } = await supabase
      .from('banner_ads')
      .update(bannerUpdate)
      .eq('id', bannerId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating banner status:', updateError)
      return NextResponse.json(
        { error: 'Error al actualizar el estado del banner' },
        { status: 500 }
      )
    }

    // Log to audit trail (failure should not block update)
    await supabase.from('audit_logs').insert({
      community_id: bannerCommunityId,
      user_id: user.id,
      action: 'update_banner_status',
      entity_type: 'banner_ad',
      entity_id: bannerId,
      old_data: { status: banner.status },
      new_data: { status },
      metadata: { admin_role: profile.role, is_super_admin: profile.is_super_admin }
    })

    return NextResponse.json({ banner: updated })
  } catch (error) {
    console.error('Update banner status error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
