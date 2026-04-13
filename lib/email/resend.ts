import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM_EMAIL ?? 'noreply@barriored.co'

export async function sendBusinessSubmittedEmail(ownerEmail: string, businessName: string) {
  await resend.emails.send({
    from: FROM,
    to: ownerEmail,
    subject: `Tu negocio "${businessName}" está en revisión — BarrioRed`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px;">
          Barrio<span style="color: #c0392b;">Red</span>
        </h1>
        <p>Hola,</p>
        <p>Recibimos el registro de tu negocio <strong>${businessName}</strong>. Nuestro equipo lo revisará en las próximas 24-48 horas.</p>
        <p>Te notificaremos por correo cuando sea aprobado.</p>
        <p style="color: #666; font-size: 12px; margin-top: 32px;">BarrioRed — Comunidad Parque Industrial, Pereira</p>
      </div>
    `,
  })
}

export async function sendBusinessApprovedEmail(
  ownerEmail: string,
  businessName: string,
  communitySlug: string
) {
  await resend.emails.send({
    from: FROM,
    to: ownerEmail,
    subject: `¡Tu negocio "${businessName}" fue aprobado! — BarrioRed`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px;">
          Barrio<span style="color: #c0392b;">Red</span>
        </h1>
        <p>¡Felicidades!</p>
        <p>Tu negocio <strong>${businessName}</strong> fue aprobado y ya aparece en el directorio de BarrioRed.</p>
        <p>
          <a href="https://barriored.co/${communitySlug}/directory" style="background: #c0392b; color: white; padding: 10px 20px; text-decoration: none; font-weight: bold; text-transform: uppercase;">
            Ver mi negocio
          </a>
        </p>
        <p style="color: #666; font-size: 12px; margin-top: 32px;">BarrioRed — Comunidad Parque Industrial, Pereira</p>
      </div>
    `,
  })
}

export async function sendBusinessRejectedEmail(
  ownerEmail: string,
  businessName: string,
  reason?: string
) {
  await resend.emails.send({
    from: FROM,
    to: ownerEmail,
    subject: `Actualización sobre tu negocio "${businessName}" — BarrioRed`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px;">
          Barrio<span style="color: #c0392b;">Red</span>
        </h1>
        <p>Hola,</p>
        <p>Tu registro de <strong>${businessName}</strong> no pudo ser aprobado en este momento.</p>
        ${reason ? `<p><strong>Motivo:</strong> ${reason}</p>` : ''}
        <p>Si tienes dudas, responde a este correo o contáctanos por WhatsApp.</p>
        <p style="color: #666; font-size: 12px; margin-top: 32px;">BarrioRed — Comunidad Parque Industrial, Pereira</p>
      </div>
    `,
  })
}
