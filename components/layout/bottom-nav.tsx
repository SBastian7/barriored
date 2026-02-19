'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCommunity } from '@/components/community/community-provider'
import { Home, Store, Users, ShoppingBag, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'Inicio', icon: Home, path: '', enabled: true },
  { label: 'Directorio', icon: Store, path: '/directory', enabled: true },
  { label: 'Comunidad', icon: Users, path: '/community', enabled: false },
  { label: 'Marketplace', icon: ShoppingBag, path: '/marketplace', enabled: false },
  { label: 'Servicios', icon: Info, path: '/services', enabled: false },
]

export function BottomNav() {
  const community = useCommunity()
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t-4 border-black md:hidden z-50 p-1">
      <div className="flex justify-around items-center">
        {navItems.map((item) => {
          const href = `/${community.slug}${item.path}`
          const isActive = item.path === ''
            ? pathname === `/${community.slug}`
            : pathname.startsWith(href)

          return (
            <Link
              key={item.path || 'home'}
              href={item.enabled ? href : '#'}
              onClick={!item.enabled ? (e) => e.preventDefault() : undefined}
              className={cn(
                'flex flex-col items-center py-2 px-1 transition-all relative',
                isActive
                  ? 'text-primary bg-secondary/20 border-2 border-black -translate-y-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                  : item.enabled
                    ? 'text-black/60 hover:text-black'
                    : 'text-black/20'
              )}
            >
              <item.icon className={cn("h-5 w-5 mb-0.5", isActive && "stroke-[3px]")} />
              <span className={cn(
                "text-[10px] font-black uppercase tracking-widest",
                isActive && "italic"
              )}>
                {item.label}
              </span>
              {!item.enabled && (
                <span className="absolute -top-1 -right-1 bg-secondary text-secondary-foreground text-[6px] font-black px-1 border border-black/20 leading-tight">
                  PRONTO
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
