import { Suspense } from 'react'
import { MobileNav } from '@/components/admin/mobile-nav'
import { DesktopHeader } from '@/components/admin/desktop-header'
import { CollapsibleSidebar } from '@/components/admin/collapsible-sidebar'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Mobile Navigation */}
      <MobileNav />

      {/* Desktop Header */}
      <DesktopHeader />

      <div className="flex flex-1 pt-[72px] lg:pt-0">
        {/* Desktop Collapsible Sidebar */}
        <CollapsibleSidebar />

        {/* Main Content */}
        <main className="flex-1 bg-gray-50">
          <div className="container mx-auto px-4 lg:px-8 py-6 lg:py-8 max-w-7xl">
            <Suspense fallback={<div className="p-8">Cargando...</div>}>
              {children}
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  )
}
