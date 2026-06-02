import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { whatsappOtpLinkSchema } from '@/lib/validations/auth'
import { verifyOTP } from '@/lib/whatsapp-otp'

export async function POST(request: Request) {
  const body = await request.json()
  const parsed = whatsappOtpLinkSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos invalidos' }, { status: 400 })
  }

  const { phone, otp } = parsed.data

  // Verify caller is authenticated
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Verify OTP
  const valid = await verifyOTP(phone, otp)
  if (!valid) {
    return NextResponse.json({ error: 'Codigo invalido o expirado' }, { status: 400 })
  }

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  )

  // Check phone not already taken by another account
  const { data: existing } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('phone', phone)
    .neq('id', user.id)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Este numero ya esta registrado en otra cuenta' }, { status: 409 })
  }

  // Link phone to current user's profile
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ phone })
    .eq('id', user.id)

  if (error) {
    return NextResponse.json({ error: 'Error vinculando numero' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
