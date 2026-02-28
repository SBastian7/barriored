import { Suspense } from 'react'
import Link from 'next/link'
import { Building2, Users, BarChart3, FolderTree, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const navItems = [
    { href: '/admin', label: 'Panel', icon: BarChart3 },
    { href: '/admin/businesses', label: 'Negocios', icon: Building2 },
    { href: '/admin/users', label: 'Usuarios', icon: Users },
    { href: '/admin/categories', label: 'Categorías', icon: FolderTree },
    { href: '/admin/alerts', label: 'Alertas', icon: Bell },
    { href: '/admin/statistics', label: 'Estadísticas', icon: BarChart3 },
  ]

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r-4 border-black bg-background p-6 hidden lg:block">
        <div className="mb-8">
          <h2 className="text-2xl font-black uppercase tracking-tighter italic">
            Admin Panel
          </h2>
        </div>
        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant="ghost"
                  className="w-full justify-start brutalist-button"
                >
                  <Icon className="h-4 w-4 mr-3" />
                  {item.label}
                </Button>
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1">
        <Suspense fallback={<div className="p-8">Cargando...</div>}>
          {children}
        </Suspense>
      </main>
    </div>
  )
}
