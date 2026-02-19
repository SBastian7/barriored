import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

import { Breadcrumbs } from '@/components/shared/breadcrumbs'

export const metadata = { title: 'Mi Panel | BarrioRed' }

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?returnUrl=/dashboard')

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b-4 border-black px-4 h-16 flex items-center gap-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-50 sticky top-0">
        <Link href="/">
          <Button variant="outline" size="icon" className="border-2 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-secondary">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <span className="font-heading font-black uppercase tracking-tighter italic text-2xl">
          Mi<span className="text-primary italic">Panel</span>
        </span>
      </header>
      <main className="container mx-auto max-w-5xl px-4 py-8">
        {children}
      </main>
    </div>
  )
}
