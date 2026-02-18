import { NextResponse } from 'next/server'
import { whatsappOtpSendSchema } from '@/lib/validations/auth'

export async function POST(request: Request) {
  const body = await request.json()
  const parsed = whatsappOtpSendSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Numero invalido' }, { status: 400 })
  }

  const { phone } = parsed.data

  // Call GetOTP.co API
  const res = await fetch('https://otp.dev/api/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GETOTP_API_KEY}`,
    },
    body: JSON.stringify({
      phone,
      channel: 'whatsapp',
      expiry: 300, // 5 minutes
      length: 6,
    }),
  })

  const data = await res.json()
  if (!res.ok) {
    return NextResponse.json({ error: 'Error enviando OTP' }, { status: 500 })
  }

  return NextResponse.json({ request_id: data.request_id })
}
