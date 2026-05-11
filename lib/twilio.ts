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
