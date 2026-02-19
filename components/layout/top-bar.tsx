'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCommunity } from '@/components/community/community-provider'
import { UserMenu } from '@/components/layout/user-menu'
import { Store, Users, ShoppingBag, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

const navSections = [
  { label: 'Directorio', icon: Store, path: '/directory', active: true },
  { label: 'Comunidad', icon: Users, path: '/community', active: false },
  { label: 'Marketplace', icon: ShoppingBag, path: '/marketplace', active: false },
  { label: 'Servicios', icon: Info, path: '/services', active: false },
]

export function TopBar() {
  const community = useCommunity()
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 bg-background border-b-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      <div className="container mx-auto px-4 h-16 flex items-center gap-4">
        <Link href={`/${community.slug}`} className="group flex items-center gap-1 shrink-0">
          <span className="font-heading font-black text-2xl uppercase tracking-tighter italic">
            {community.name.split(' ').map((word, i) => (
              <span key={i} className={i % 2 !== 0 ? 'text-primary' : undefined}>
                {word}{' '}
              </span>
            ))}
          </span>
        </Link>

        {/* Desktop navigation sections */}
        <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
          {navSections.map((section) => {
            const href = `/${community.slug}${section.path}`
            const isActive = pathname.startsWith(href)

            return (
              <Link
                key={section.path}
                href={section.active ? href : '#'}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 font-black uppercase text-xs tracking-widest transition-all border-2',
                  isActive
                    ? 'bg-primary text-primary-foreground border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                    : section.active
                      ? 'border-black bg-background hover:bg-secondary/30 hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                      : 'border-black/20 text-black/30 cursor-default'
                )}
                onClick={!section.active ? (e) => e.preventDefault() : undefined}
                title={!section.active ? 'Proximamente' : undefined}
              >
                <section.icon className="h-3.5 w-3.5" />
                {section.label}
                {!section.active && (
                  <span className="text-[8px] bg-secondary text-secondary-foreground px-1 py-0.5 border border-black/20 font-black tracking-normal normal-case">
                    Pronto
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
