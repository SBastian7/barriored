import { createClient } from '@supabase/supabase-js'
import { sendWhatsAppMessage, normalizeColombianPhone } from './twilio'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  )
}

export async function sendOTP(phone: string): Promise<void> {
  const supabase = adminClient()
  const e164 = normalizeColombianPhone(phone)

  // Rate limit: max 3 active OTPs in 10 minutes
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
  const { count } = await supabase
    .from('whatsapp_otps')
    .select('*', { count: 'exact', head: true })
    .eq('phone', e164)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .gt('created_at', tenMinutesAgo)

  if ((count ?? 0) >= 3) {
    const err = new Error('Demasiados intentos. Espera antes de pedir otro codigo.') as any
    err.status = 429
    throw err
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString()
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()

  const { error } = await supabase.from('whatsapp_otps').insert({
    phone: e164,
    code,
    expires_at: expiresAt,
  })
  if (error) throw new Error('Error guardando OTP')

  await sendWhatsAppMessage(
    e164,
    `Tu código de verificación BarrioRed es: *${code}*. Válido por 5 minutos.`
  )
}

// Max wrong guesses per issued OTP before it is invalidated (anti-brute-force).
// Combined with the 3-codes-per-10-min send limit, this caps total guesses far
// below the 1,000,000 keyspace of a 6-digit code.
const MAX_OTP_ATTEMPTS = 5

export async function verifyOTP(phone: string, code: string): Promise<boolean> {
  const supabase = adminClient()
  const e164 = normalizeColombianPhone(phone)

  const { data: row } = await supabase
    .from('whatsapp_otps')
    .select('id, code, attempts')
    .eq('phone', e164)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!row) return false

  // Lockout: this code already exhausted its attempts — invalidate and reject.
  if ((row.attempts ?? 0) >= MAX_OTP_ATTEMPTS) {
    await supabase
      .from('whatsapp_otps')
      .update({ used_at: new Date().toISOString() })
      .eq('id', row.id)
    return false
  }

  if (row.code !== code) {
    // Wrong code: increment the counter and burn the code once the cap is hit.
    const attempts = (row.attempts ?? 0) + 1
    await supabase
      .from('whatsapp_otps')
      .update({
        attempts,
        used_at: attempts >= MAX_OTP_ATTEMPTS ? new Date().toISOString() : null,
      })
      .eq('id', row.id)
    return false
  }

  // Correct code: consume it so it cannot be replayed.
  await supabase
    .from('whatsapp_otps')
    .update({ used_at: new Date().toISOString() })
    .eq('id', row.id)

  return true
}
