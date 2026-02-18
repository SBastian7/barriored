'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCommunity } from '@/components/community/community-provider'
import { Home, Grid3X3, Map, PlusCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'Inicio', icon: Home, path: '' },
  { label: 'Directorio', icon: Grid3X3, path: '/directory' },
  { label: 'Mapa', icon: Map, path: '/map' },
  { label: 'Registrar', icon: PlusCircle, path: '/register' },
]

export function BottomNav() {
  const community = useCommunity()
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t md:hidden z-50">
      <div className="flex justify-around">
        {navItems.map((item) => {
          const href = `/${community.slug}${item.path}`
          const isActive = item.path === ''
            ? pathname === `/${community.slug}`
            : pathname.startsWith(href)

          return (
            <Link
              key={item.path}
              href={href}
              className={cn(
                'flex flex-col items-center py-2 px-3 text-xs',
                isActive ? 'text-blue-600' : 'text-gray-500'
              )}
            >
              <item.icon className="h-5 w-5 mb-1" />
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
