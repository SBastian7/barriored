import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: business } = await (supabase as any)
    .from('businesses')
    .select('id, owner_id, status')
    .eq('id', id)
    .single()

  if (!business) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })
  if (business.owner_id !== user.id) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  if (business.status !== 'rejected') return NextResponse.json({ error: 'El negocio no está rechazado' }, { status: 400 })

  const { error } = await (supabase as any)
    .from('businesses')
    .update({
      status: 'pending',
      rejection_reason: null,
      rejection_details: null,
      rejected_by: null,
      rejected_at: null,
    })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
