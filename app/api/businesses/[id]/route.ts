import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateBusinessSchema } from '@/lib/validations/business'
import { getPermissions } from '@/lib/auth/permissions'
import { requirePermission } from '@/lib/auth/api-protection'
import { logAuditAction } from '@/lib/utils/audit-logger'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  // Check permission or ownership
  const { data: business } = await supabase
    .from('businesses')
    .select('owner_id')
    .eq('id', id)
    .single() as { data: any }

  if (!business) {
    return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_super_admin')
    .eq('id', user.id)
    .single() as { data: any }

  const permissions = getPermissions(profile?.role as any, profile?.is_super_admin)
  const isOwner = business.owner_id === user.id

  if (!isOwner && !permissions.canEditAnyBusiness) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = updateBusinessSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const updateData: Record<string, unknown> = { ...parsed.data }
  if (parsed.data.latitude && parsed.data.longitude) {
    updateData.location = `POINT(${parsed.data.longitude} ${parsed.data.latitude})`
    delete updateData.latitude
    delete updateData.longitude
  }

  // Update business
  const { data, error } = await (supabase as any)
    .from('businesses')
    .update({
      ...updateData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  // Check permission (admin only)
  const auth = await requirePermission('canDeleteBusinesses', supabase)
  if (!auth.authorized) return auth.error

  // Get business data for cleanup and audit log
  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', id)
    .single() as { data: any }

  if (!business) {
    return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })
  }

  // Delete photos from storage
  if (business.photos && Array.isArray(business.photos)) {
    for (const photoUrl of business.photos) {
      try {
        // Extract file path from URL
        const urlParts = photoUrl.split('/')
        const fileName = urlParts[urlParts.length - 1]

        await supabase.storage
          .from('business-photos')
          .remove([fileName])
      } catch (error) {
        console.error('Error deleting photo:', error)
        // Continue with business deletion even if photo deletion fails
      }
    }
  }

  // Delete business record
  const { error } = await supabase
    .from('businesses')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting business:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Log audit action
  await logAuditAction({
    action: 'delete_business',
    entityType: 'business',
    entityId: id,
    oldData: business,
    communityId: business?.community_id,
  })

  return NextResponse.json({ success: true })
}
