import Link from 'next/link'
import { ArrowLeft, LayoutDashboard } from 'lucide-react'
import { UserMenu } from '@/components/layout/user-menu'
import { Button } from '@/components/ui/button'

export function DesktopHeader() {
  return (
    <header className="hidden lg:block sticky top-0 z-50 bg-background border-b-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between gap-4">
        {/* Left: Back to site + Admin branding */}
        <div className="flex items-center gap-4">
          <Link href="/parqueindustrial">
            <Button
              variant="outline"
              size="sm"
              className="brutalist-button flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden xl:inline">Volver al sitio</span>
            </Button>
          </Link>

          <div className="flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6 text-primary" />
            <h1 className="font-heading font-black text-2xl uppercase tracking-tighter italic">
              <span className="text-primary">Admin</span> Panel
            </h1>
          </div>
        </div>

        {/* Right: User menu */}
        <div className="flex items-center gap-2 shrink-0">
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
