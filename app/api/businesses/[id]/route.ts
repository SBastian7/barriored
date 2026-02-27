import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateBusinessSchema } from '@/lib/validations/business'
import { getPermissions } from '@/lib/auth/permissions'

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
    .single()

  if (!business) {
    return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_super_admin')
    .eq('id', user.id)
    .single()

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
  const { data, error } = await supabase
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
