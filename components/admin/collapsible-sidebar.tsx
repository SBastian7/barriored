'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
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
  FileText,
  Globe,
  Settings,
  ShoppingBag,
  Crown,
  Image as ImageIcon,
  DollarSign,
  AlertCircle,
  Star,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/admin', label: 'Panel', icon: BarChart3 },
  { href: '/admin/businesses', label: 'Negocios', icon: Building2, adminOnly: true },
  { href: '/admin/users', label: 'Usuarios', icon: Users, adminOnly: true },
  { href: '/admin/categories', label: 'Categorías', icon: FolderTree, adminOnly: true },
  { href: '/admin/community', label: 'Comunidad', icon: MessageSquare },
  { href: '/admin/alerts', label: 'Alertas', icon: Bell },
  { href: '/admin/reports', label: 'Reportes', icon: Flag },
  { href: '/admin/services', label: 'Servicios', icon: Briefcase, adminOnly: true },
  { href: '/admin/marketplace', label: 'Marketplace', icon: ShoppingBag, adminOnly: true },
  { href: '/admin/subscriptions', label: 'Suscripciones', icon: Crown, divider: true, section: 'monetization', adminOnly: true },
  { href: '/admin/banners', label: 'Banners', icon: ImageIcon, section: 'monetization', adminOnly: true },
  { href: '/admin/payments', label: 'Pagos', icon: DollarSign, section: 'monetization', adminOnly: true },
  { href: '/admin/review-flags', label: 'Reseñas Reportadas', icon: AlertCircle, section: 'monetization', adminOnly: true },
  { href: '/admin/reviews', label: 'Reseñas', icon: Star, section: 'monetization' },
  { href: '/admin/statistics', label: 'Estadísticas', icon: BarChart3, divider: true, adminOnly: true },
  { href: '/admin/engagement', label: 'Engagement', icon: Activity, adminOnly: true },
  { href: '/admin/communities', label: 'Comunidades', icon: Globe, roles: ['super_admin'], divider: true },
  { href: '/admin/platform/settings', label: 'Config. Plataforma', icon: Settings, roles: ['super_admin'], section: 'platform', divider: true },
  { href: '/admin/platform/policies', label: 'Políticas', icon: FileText, roles: ['super_admin'], section: 'platform' },
  { href: '/admin/platform/payments', label: 'Pasarelas Pago', icon: DollarSign, roles: ['super_admin'], section: 'platform' },
  { href: '/admin/platform/service-categories', label: 'Cat. Servicios', icon: Briefcase, roles: ['super_admin'], section: 'platform' },
  { href: '/admin/logs', label: 'Logs', icon: FileText },
  { href: '/admin/tools', label: 'Herramientas', icon: Settings, adminOnly: true },
]

export function CollapsibleSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const pathname = usePathname()

  useEffect(() => {
    async function checkRole() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_super_admin, role')
          .eq('id', user.id)
          .single<{ is_super_admin: boolean; role: string }>()

        setIsSuperAdmin(profile?.is_super_admin || false)
        setUserRole(profile?.role || null)
      }
    }

    checkRole()
  }, [])

  const sectionLabels: Record<string, string> = {
    monetization: 'Monetización',
    platform: 'Plataforma',
  }

  const isAdmin = isSuperAdmin || userRole === 'admin'

  // Filter nav items based on role
  const visibleNavItems = navItems.filter((item) => {
    if (item.roles?.includes('super_admin') && !isSuperAdmin) return false
    if (item.adminOnly && !isAdmin) return false
    return true
  })

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
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="brutalist-button shrink-0 w-full"
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
          {visibleNavItems.map((item, index) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            const prevItem = index > 0 ? visibleNavItems[index - 1] : null
            const showSectionLabel = item.section && (!prevItem || prevItem.section !== item.section)

            return (
              <div key={item.href}>
                {item.divider && (
                  <div className="border-t-2 border-black my-4" />
                )}
                {showSectionLabel && !isCollapsed && (
                  <div className="px-3 py-2">
                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">
                      {sectionLabels[item.section!] || item.section}
                    </h3>
                  </div>
                )}
                <Link href={item.href}>
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
              </div>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
