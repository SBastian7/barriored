'use client'

import Link from 'next/link'
import { useCommunity } from '@/components/community/community-provider'
import { Logo } from '@/components/layout/logo'
import { Heart } from 'lucide-react'

export function Footer() {
  const community = useCommunity()
  const currentYear = new Date().getFullYear()

  const discoverLinks = [
    { label: 'Directorio', href: `/${community.slug}/directory` },
    { label: 'Marketplace', href: `/${community.slug}/marketplace` },
    { label: 'Comunidad', href: `/${community.slug}/community` },
    { label: 'Servicios', href: `/${community.slug}/services` },
  ]

  const businessLinks = [
    { label: 'Registra tu negocio', href: `/${community.slug}/register` },
    { label: 'Planes', href: '#' },
    { label: 'Verificación', href: '#' },
    { label: 'Soporte', href: '#' },
  ]

  const barrioLinks = [
    { label: community.municipality ?? 'Pereira', href: '#' },
    { label: community.name, href: `/${community.slug}` },
    { label: 'Otros barrios', href: '#' },
  ]

  return (
    <footer className="hidden md:block bg-foreground text-white border-t-4 border-black">
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-4 gap-10">
          {/* Brand */}
          <div className="flex flex-col gap-4">
            <Link href={`/${community.slug}`} aria-label="BarrioRed · Inicio">
              <Logo markSize={34} colorway="reverse" reversed textClassName="text-2xl" />
            </Link>
            <p className="text-sm text-white/60 leading-relaxed max-w-52">
              Hecho para el barrio, por el barrio. Conectamos vecinos, negocios y servicios en una sola red local.
            </p>
          </div>

          {/* Descubre */}
          <div>
            <p className="font-heading font-black text-xs uppercase tracking-widest text-primary mb-4">
              Descubre
            </p>
            <ul className="flex flex-col gap-2">
              {discoverLinks.map(link => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-white/80 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Negocios */}
          <div>
            <p className="font-heading font-black text-xs uppercase tracking-widest text-primary mb-4">
              Negocios
            </p>
            <ul className="flex flex-col gap-2">
              {businessLinks.map(link => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-white/80 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* El Barrio */}
          <div>
            <p className="font-heading font-black text-xs uppercase tracking-widest text-primary mb-4">
              El Barrio
            </p>
            <ul className="flex flex-col gap-2">
              {barrioLinks.map(link => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-white/80 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/20">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <p className="font-mono text-xs uppercase tracking-widest text-white/40">
            © {currentYear} BarrioRed · {community.municipality ?? 'Pereira'} · Colombia
          </p>
          <p className="font-mono text-xs uppercase tracking-widest text-white/40 flex items-center gap-1">
            Hecho con <Heart className="w-3 h-3 fill-primary text-primary" /> para el barrio
          </p>
        </div>
      </div>
    </footer>
  )
}
