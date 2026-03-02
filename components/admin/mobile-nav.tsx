'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, BarChart3, Building2, Users, FolderTree, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

const navItems = [
  { href: '/admin', label: 'Panel', icon: BarChart3 },
  { href: '/admin/businesses', label: 'Negocios', icon: Building2 },
  { href: '/admin/users', label: 'Usuarios', icon: Users },
  { href: '/admin/categories', label: 'Categorías', icon: FolderTree },
  { href: '/admin/alerts', label: 'Alertas', icon: Bell },
  { href: '/admin/statistics', label: 'Estadísticas', icon: BarChart3 },
]

export function MobileNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-background border-b-4 border-black">
      <div className="flex items-center justify-between p-4">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 border-2 border-black rounded-none"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Abrir menú de navegación</span>
            </Button>
          </SheetTrigger>

          <SheetContent
            side="left"
            className="w-64 p-0 border-r-4 border-black rounded-none"
          >
            <SheetHeader className="p-6 border-b-2 border-black">
              <SheetTitle className="text-2xl font-black uppercase tracking-tighter italic text-left">
                Admin Panel
              </SheetTitle>
            </SheetHeader>

            <nav className="p-4 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                  >
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      className={`w-full justify-start brutalist-button ${
                        isActive ? 'bg-primary text-white' : ''
                      }`}
                    >
                      <Icon className="h-4 w-4 mr-3" />
                      {item.label}
                    </Button>
                  </Link>
                )
              })}
            </nav>
          </SheetContent>
        </Sheet>

        <h1 className="text-lg font-black uppercase tracking-tighter italic">
          Admin Panel
        </h1>

        <div className="w-10"></div> {/* Spacer for centering */}
      </div>
    </div>
  )
}
