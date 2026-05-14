import twilio from 'twilio'

export function normalizeColombianPhone(phone: string): string {
  if (phone.startsWith('+')) {
    return phone.replace(/[^\d+]/g, '')
  }
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('57') && digits.length === 12) return `+${digits}`
  if (digits.length === 10 && digits.startsWith('3')) return `+57${digits}`
  return `+${digits}`
}

function getClient() {
  return twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!)
}

export async function sendWhatsAppMessage(to: string, body: string): Promise<void> {
  await getClient().messages.create({
    from: process.env.TWILIO_WHATSAPP_FROM!,
    to: `whatsapp:${normalizeColombianPhone(to)}`,
    body,
  })
}

export async function sendWhatsAppOTP(phone: string): Promise<void> {
  const e164 = normalizeColombianPhone(phone)
  await getClient().verify.v2
    .services(process.env.TWILIO_VERIFY_SERVICE_SID!)
    .verifications.create({ to: e164, channel: 'whatsapp' })
}

export async function checkWhatsAppOTP(phone: string, code: string): Promise<boolean> {
  const e164 = normalizeColombianPhone(phone)
  try {
    const check = await getClient().verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID!)
      .verificationChecks.create({ to: e164, code })
    return check.status === 'approved'
  } catch {
    return false
  }
}
