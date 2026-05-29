import type { PublicService } from '@/lib/types'

export function generateVcf(services: PublicService[]): string {
  return services
    .filter(s => Boolean(s.phone))
    .map(s =>
      [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `FN:${s.name}`,
        `ORG:${s.name}`,
        `TEL;TYPE=WORK:${s.phone}`,
        s.address ? `ADR;TYPE=WORK:;;${s.address};;;;` : null,
        'END:VCARD',
      ]
        .filter(Boolean)
        .join('\r\n')
    )
    .join('\r\n')
}

export function downloadVcf(services: PublicService[], filename: string): void {
  const content = generateVcf(services)
  if (!content) return
  const blob = new Blob([content], { type: 'text/vcard;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
