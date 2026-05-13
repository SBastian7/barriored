import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logAuditAction } from '@/lib/utils/audit-logger'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('is_super_admin').eq('id', user.id).single()
  if (!profile?.is_super_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: { content?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }
  if (typeof body.content !== 'string') {
    return NextResponse.json({ error: 'El campo content es requerido y debe ser texto' }, { status: 400 })
  }

  const { data: oldPolicy } = await supabase.from('platform_policies').select('*').eq('type', type).single()

  const { data, error } = await supabase
    .from('platform_policies')
    .update({ content: body.content, updated_at: new Date().toISOString(), updated_by: user.id })
    .eq('type', type)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAuditAction({ action: 'update_platform_policy', entityType: 'platform_policies', entityId: data.id, oldData: oldPolicy, newData: data })

  return NextResponse.json({ policy: data })
}
