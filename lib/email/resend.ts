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

export async function sendSubscriptionRenewalReminderEmail(
  ownerEmail: string,
  businessName: string,
  expiresAt: string,
  daysLeft: number
) {
  const expiryDate = new Date(expiresAt).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  await resend.emails.send({
    from: FROM,
    to: ownerEmail,
    subject: `Tu suscripción Premium de "${businessName}" vence en ${daysLeft} días — BarrioRed`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px;">
          Barrio<span style="color: #c0392b;">Red</span>
        </h1>
        <p>Hola,</p>
        <p>Tu suscripción Premium para <strong>${businessName}</strong> vence el <strong>${expiryDate}</strong> (en ${daysLeft} días).</p>
        <p>Para continuar apareciendo como negocio destacado, contacta a tu administrador de comunidad para renovar tu suscripción.</p>
        <p>
          <a href="https://barriored.co/dashboard" style="background: #c0392b; color: white; padding: 10px 20px; text-decoration: none; font-weight: bold; text-transform: uppercase; display: inline-block;">
            Ver mi Panel
          </a>
        </p>
        <p style="color: #666; font-size: 12px; margin-top: 32px;">BarrioRed — Comunidad Parque Industrial, Pereira</p>
      </div>
    `,
  })
}

export async function sendSubscriptionExpirationWarningEmail(
  ownerEmail: string,
  businessName: string,
  expiresAt: string
) {
  const expiryDate = new Date(expiresAt).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  await resend.emails.send({
    from: FROM,
    to: ownerEmail,
    subject: `⚠️ Tu suscripción Premium de "${businessName}" vence mañana — BarrioRed`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px;">
          Barrio<span style="color: #c0392b;">Red</span>
        </h1>
        <p>Hola,</p>
        <p>⚠️ Tu suscripción Premium para <strong>${businessName}</strong> vence el <strong>${expiryDate}</strong>.</p>
        <p>Si no se renueva antes de esa fecha, tu negocio dejará de aparecer como destacado en el directorio.</p>
        <p>Contacta a tu administrador de comunidad para renovar tu suscripción a la brevedad.</p>
        <p>
          <a href="https://barriored.co/dashboard" style="background: #c0392b; color: white; padding: 10px 20px; text-decoration: none; font-weight: bold; text-transform: uppercase; display: inline-block;">
            Ver mi Panel
          </a>
        </p>
        <p style="color: #666; font-size: 12px; margin-top: 32px;">BarrioRed — Comunidad Parque Industrial, Pereira</p>
      </div>
    `,
  })
}

export async function sendAlertNotificationEmail(
  email: string,
  alert: {
    title: string
    description: string | null
    type: string
    severity: string
    communitySlug: string
  }
): Promise<void> {
  const severityColor =
    alert.severity === 'critical' ? '#c0392b'
    : alert.severity === 'warning' ? '#e67e22'
    : '#2980b9'

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `⚠️ Alerta en tu comunidad: ${alert.title}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px;">
          Barrio<span style="color: #c0392b;">Red</span>
        </h1>
        <div style="background: ${severityColor}; color: white; padding: 8px 12px; display: inline-block; font-weight: bold; text-transform: uppercase; margin-bottom: 16px; letter-spacing: 1px;">
          ${alert.type.toUpperCase()} — ${alert.severity.toUpperCase()}
        </div>
        <h2 style="margin: 0 0 12px; font-size: 20px;">${alert.title}</h2>
        ${alert.description ? `<p style="color: #333;">${alert.description}</p>` : ''}
        <p>
          <a href="https://barriored.co/${alert.communitySlug}/community"
             style="background: #c0392b; color: white; padding: 10px 20px; text-decoration: none; font-weight: bold; text-transform: uppercase; display: inline-block; margin-top: 8px;">
            Ver en BarrioRed
          </a>
        </p>
        <p style="color: #666; font-size: 12px; margin-top: 32px;">BarrioRed — Tu comunidad digital</p>
      </div>
    `,
  })
}

export async function sendAdminFlaggedContentEmail(
  adminEmail: string,
  content: {
    type: 'post' | 'review'
    title: string
    reason: string
    adminPanelUrl: string
  }
): Promise<void> {
  const typeLabel = content.type === 'post' ? 'publicación' : 'reseña'

  await resend.emails.send({
    from: FROM,
    to: adminEmail,
    subject: `🚩 Contenido reportado en tu comunidad`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px;">
          Barrio<span style="color: #c0392b;">Red</span>
        </h1>
        <p>Se ha reportado una ${typeLabel} en tu comunidad que requiere revisión:</p>
        <div style="background: #f5f5f5; border-left: 4px solid #c0392b; padding: 12px 16px; margin: 16px 0;">
          <strong style="display: block; margin-bottom: 4px;">${content.title}</strong>
          <span style="color: #666; font-size: 14px;">Motivo del reporte: ${content.reason}</span>
        </div>
        <p>
          <a href="${content.adminPanelUrl}"
             style="background: #c0392b; color: white; padding: 10px 20px; text-decoration: none; font-weight: bold; text-transform: uppercase; display: inline-block;">
            Revisar en Panel Admin
          </a>
        </p>
        <p style="color: #666; font-size: 12px; margin-top: 32px;">BarrioRed — Panel de Administración</p>
      </div>
    `,
  })
}

export async function sendClassifiedSoldEmail(
  ownerEmail: string,
  classifiedTitle: string,
  communitySlug: string
) {
  await resend.emails.send({
    from: FROM,
    to: ownerEmail,
    subject: `¡Vendido! "${classifiedTitle}" — BarrioRed`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px;">
          Barrio<span style="color: #c0392b;">Red</span>
        </h1>
        <p>¡Felicitaciones!</p>
        <p>Tu clasificado <strong>"${classifiedTitle}"</strong> fue marcado como vendido.</p>
        <p>Si tienes más artículos, publica otro clasificado en el marketplace.</p>
        <p>
          <a href="https://barriored.co/${communitySlug}/marketplace"
             style="background: #c0392b; color: white; padding: 10px 20px; text-decoration: none; font-weight: bold; text-transform: uppercase; display: inline-block;">
            Ver Marketplace
          </a>
        </p>
        <p style="color: #666; font-size: 12px; margin-top: 32px;">BarrioRed — Tu comunidad digital</p>
      </div>
    `,
  })
}

export async function sendClassifiedExpiryReminderEmail(
  ownerEmail: string,
  classifiedTitle: string,
  communitySlug: string
) {
  await resend.emails.send({
    from: FROM,
    to: ownerEmail,
    subject: `Tu clasificado "${classifiedTitle}" vence en 3 días — BarrioRed`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px;">
          Barrio<span style="color: #c0392b;">Red</span>
        </h1>
        <p>Tu clasificado <strong>"${classifiedTitle}"</strong> vence en <strong>3 días</strong>.</p>
        <p>Si aún no lo has vendido, actualiza tu publicación para renovar los 30 días automáticamente.</p>
        <p>
          <a href="https://barriored.co/dashboard?tab=marketplace"
             style="background: #c0392b; color: white; padding: 10px 20px; text-decoration: none; font-weight: bold; text-transform: uppercase; display: inline-block;">
            Actualizar Clasificado
          </a>
        </p>
        <p style="color: #666; font-size: 12px; margin-top: 32px;">BarrioRed — Tu comunidad digital</p>
      </div>
    `,
  })
}
