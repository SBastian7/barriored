import { NextResponse } from 'next/server'
import { whatsappOtpSendSchema } from '@/lib/validations/auth'
import { sendWhatsAppOTP } from '@/lib/twilio'

export async function POST(request: Request) {
  const body = await request.json()
  const parsed = whatsappOtpSendSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Numero invalido' }, { status: 400 })
  }

  try {
    await sendWhatsAppOTP(parsed.data.phone)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    // Twilio rate limit
    if (err?.status === 429) {
      return NextResponse.json({ error: 'Demasiados intentos. Espera antes de pedir otro codigo.' }, { status: 429 })
    }
    console.error('[whatsapp-otp/send]', err)
    return NextResponse.json({ error: 'Error enviando OTP' }, { status: 500 })
  }
}
