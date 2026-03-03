'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  Building2,
  Users,
  FolderTree,
  Bell,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Flag,
  Briefcase,
  Activity,
  FileText
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/admin', label: 'Panel', icon: BarChart3 },
  { href: '/admin/businesses', label: 'Negocios', icon: Building2 },
  { href: '/admin/users', label: 'Usuarios', icon: Users },
  { href: '/admin/categories', label: 'Categorías', icon: FolderTree },
  { href: '/admin/community', label: 'Comunidad', icon: MessageSquare },
  { href: '/admin/alerts', label: 'Alertas', icon: Bell },
  { href: '/admin/reports', label: 'Reportes', icon: Flag },
  { href: '/admin/services', label: 'Servicios', icon: Briefcase },
  { href: '/admin/statistics', label: 'Estadísticas', icon: BarChart3 },
  { href: '/admin/engagement', label: 'Engagement', icon: Activity },
  { href: '/admin/logs', label: 'Logs', icon: FileText },
]

export function CollapsibleSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        'hidden lg:block sticky top-[64px] h-[calc(100vh-64px)] overflow-y-auto',
        'border-r-4 border-black bg-background',
        'transition-all duration-300 ease-in-out',
        isCollapsed ? 'w-20' : 'w-64'
      )}
    >
      <div className="p-6 space-y-6">
        {/* Header with toggle */}
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <h2 className="text-2xl font-black uppercase tracking-tighter italic truncate">
              Navegación
            </h2>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="brutalist-button shrink-0"
            aria-label={isCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Navigation items */}
        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? 'default' : 'ghost'}
                  className={cn(
                    'w-full brutalist-button transition-all duration-200',
                    isCollapsed ? 'justify-center px-0' : 'justify-start',
                    isActive && 'bg-primary text-white hover:bg-primary/90'
                  )}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon className={cn('h-4 w-4', !isCollapsed && 'mr-3')} />
                  {!isCollapsed && (
                    <span className="uppercase tracking-widest text-xs font-black">
                      {item.label}
                    </span>
                  )}
                </Button>
              </Link>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
