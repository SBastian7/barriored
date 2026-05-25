import { NextResponse } from 'next/server'
import { whatsappOtpSendSchema } from '@/lib/validations/auth'
import { sendOTP } from '@/lib/whatsapp-otp'

export async function POST(request: Request) {
  const body = await request.json()
  const parsed = whatsappOtpSendSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Numero invalido' }, { status: 400 })
  }

  try {
    await sendOTP(parsed.data.phone)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    if (err?.status === 429) {
      return NextResponse.json({ error: err.message }, { status: 429 })
    }
    console.error('[whatsapp-otp/send]', err)
    return NextResponse.json({ error: 'Error enviando OTP' }, { status: 500 })
  }
}
