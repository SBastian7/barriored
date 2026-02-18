import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { whatsappOtpVerifySchema } from '@/lib/validations/auth'

export async function POST(request: Request) {
  const body = await request.json()
  const parsed = whatsappOtpVerifySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos invalidos' }, { status: 400 })
  }

  const { phone, otp, request_id } = parsed.data

  // Verify with GetOTP.co
  const verifyRes = await fetch('https://otp.dev/api/verify/check', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GETOTP_API_KEY}`,
    },
    body: JSON.stringify({ request_id, otp }),
  })

  const verifyData = await verifyRes.json()
  if (!verifyRes.ok || !verifyData.valid) {
    return NextResponse.json({ error: 'Codigo invalido o expirado' }, { status: 400 })
  }

  // Use service role to manage users
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Check if user exists with this phone
  const { data: existingProfile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('phone', phone)
    .single()

  let userId: string

  if (existingProfile) {
    userId = existingProfile.id
  } else {
    // Create new user with phone-based email placeholder
    const email = `${phone}@whatsapp.barriored.co`
    const { data: newUser, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      phone,
      email_confirm: true,
      user_metadata: { full_name: '', phone },
    })
    if (error || !newUser.user) {
      return NextResponse.json({ error: 'Error creando usuario' }, { status: 500 })
    }
    userId = newUser.user.id
    await supabaseAdmin.from('profiles').update({ phone }).eq('id', userId)
  }

  // Generate a magic link for the user
  const email = `${phone}@whatsapp.barriored.co`
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })

  if (linkError) {
    return NextResponse.json({ error: 'Error generando sesion' }, { status: 500 })
  }

  // Extract token_hash from the action_link and verify it to get a session
  const url = new URL(linkData.properties.action_link)
  const tokenHash = url.searchParams.get('token')
  const type = url.searchParams.get('type') as 'magiclink'

  if (!tokenHash) {
    return NextResponse.json({ error: 'Error generando sesion' }, { status: 500 })
  }

  // Verify the OTP server-side to obtain session tokens
  const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  })

  if (sessionError || !sessionData.session) {
    return NextResponse.json({ error: 'Error generando sesion' }, { status: 500 })
  }

  return NextResponse.json({
    access_token: sessionData.session.access_token,
    refresh_token: sessionData.session.refresh_token,
  })
}
