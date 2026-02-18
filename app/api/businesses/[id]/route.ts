import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateBusinessSchema } from '@/lib/validations/business'

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

  const { data, error } = await supabase
    .from('businesses')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
