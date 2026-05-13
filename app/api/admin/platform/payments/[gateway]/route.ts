import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logAuditAction } from '@/lib/utils/audit-logger'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ gateway: string }> }
) {
  const { gateway } = await params
  const VALID_GATEWAYS = ['wompi', 'nequi', 'mercadopago'] as const
  if (!(VALID_GATEWAYS as readonly string[]).includes(gateway)) {
    return NextResponse.json({ error: 'Gateway inválido' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('is_super_admin').eq('id', user.id).single()
  if (!profile?.is_super_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const allowed = ['is_enabled', 'environment', 'public_key', 'private_key', 'webhook_secret', 'account_identifier', 'commission_rate']
  const updates: Record<string, any> = { updated_at: new Date().toISOString(), updated_by: user.id }

  for (const key of allowed) {
    if (key in body) {
      // Skip masked placeholder values (user did not change the secret)
      if (typeof body[key] === 'string' && (body[key] as string).startsWith('...')) continue
      updates[key] = body[key]
    }
  }

  const { data: oldGateway } = await supabase.from('platform_payment_config').select('*').eq('gateway', gateway).single()

  const { data, error } = await supabase
    .from('platform_payment_config')
    .update(updates)
    .eq('gateway', gateway)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Mask sensitive keys in audit log new data
  const auditNewData = { ...data, private_key: data.private_key ? '***' : null, webhook_secret: data.webhook_secret ? '***' : null }
  await logAuditAction({ action: 'update_payment_gateway', entityType: 'platform_payment_config', entityId: data.id, oldData: { ...oldGateway, private_key: '***', webhook_secret: '***' }, newData: auditNewData })

  // Return masked version to client
  return NextResponse.json({
    gateway: {
      ...data,
      private_key: data.private_key ? `...${data.private_key.slice(-4)}` : null,
      webhook_secret: data.webhook_secret ? `...${data.webhook_secret.slice(-4)}` : null,
    }
  })
}
