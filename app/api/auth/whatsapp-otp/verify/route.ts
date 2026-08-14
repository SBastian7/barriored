import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { whatsappOtpVerifySchema } from '@/lib/validations/auth'
import { verifyOTP } from '@/lib/whatsapp-otp'
import { normalizeColombianPhone } from '@/lib/twilio'

export async function POST(request: Request) {
  const body = await request.json()
  const parsed = whatsappOtpVerifySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos invalidos' }, { status: 400 })
  }

  const { phone, otp, full_name, community_id } = parsed.data

  const valid = await verifyOTP(phone, otp)
  if (!valid) {
    return NextResponse.json({ error: 'Codigo invalido o expirado' }, { status: 400 })
  }

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  )

  // Canonical storage format for profiles.phone is digits-only (57XXXXXXXXXX, no leading +),
  // matching what PhoneInput emits and what the email-signup trigger stores.
  const e164 = normalizeColombianPhone(phone)
  const storedPhone = e164.replace('+', '')

  // Check if user exists with this phone (try both formats for legacy rows)
  const { data: existingProfile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .or(`phone.eq.${storedPhone},phone.eq.${e164},phone.eq.${phone}`)
    .limit(1)
    .single()

  let userId: string

  if (existingProfile) {
    userId = existingProfile.id
  } else {
    const email = `${phone}@phone.barriored.co`
    const { data: newUser, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: full_name || '', phone },
    })
    if (error || !newUser.user) {
      return NextResponse.json({ error: 'Error creando usuario' }, { status: 500 })
    }
    userId = newUser.user.id

    // Populate profile with signup metadata if provided
    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: userId,
      phone: storedPhone,
      full_name: full_name || null,
      community_id: community_id || null,
    }, { onConflict: 'id' })
    if (profileError) console.error('[whatsapp-otp/verify] profile upsert failed', profileError)
  }

  // Look up the user's actual auth email (may differ from phone-based synthetic email)
  const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(userId)
  const email = authUser?.email ?? `${phone}@phone.barriored.co`

  // Generate session via magic link → verifyOtp
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })
  if (linkError) {
    return NextResponse.json({ error: 'Error generando sesion' }, { status: 500 })
  }

  const tokenHash = linkData.properties.hashed_token
  if (!tokenHash) {
    return NextResponse.json({ error: 'Error generando sesion' }, { status: 500 })
  }

  const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.verifyOtp({
    token_hash: tokenHash,
    type: 'email',
  })
  if (sessionError || !sessionData.session) {
    return NextResponse.json({ error: 'Error generando sesion' }, { status: 500 })
  }

  return NextResponse.json({
    access_token: sessionData.session.access_token,
    refresh_token: sessionData.session.refresh_token,
  })
}
