import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Store, Tag, Users, AlertTriangle, Siren } from 'lucide-react'

export const metadata = { title: 'Admin | BarrioRed' }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?returnUrl=/admin')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/')

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b-4 border-black px-4 h-16 flex items-center gap-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-50 sticky top-0">
        <Link href="/"><Button variant="outline" size="icon" className="border-2 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <span className="font-heading font-black uppercase tracking-tighter italic text-2xl">
          Admin<span className="text-primary italic">Red</span>
        </span>
        <nav className="flex gap-4 ml-6">
          <Link href="/admin/businesses">
            <Button variant="ghost" size="sm" className="font-black uppercase tracking-widest text-[10px] hover:bg-primary/10 transition-colors">
              <Store className="h-4 w-4 mr-1" /> Negocios
            </Button>
          </Link>
          <Link href="/admin/categories">
            <Button variant="ghost" size="sm" className="font-black uppercase tracking-widest text-[10px] hover:bg-secondary/10 transition-colors">
              <Tag className="h-4 w-4 mr-1" /> Categorías
            </Button>
          </Link>
          <Link href="/admin/community">
            <Button variant="ghost" size="sm" className="font-black uppercase tracking-widest text-[10px] hover:bg-accent/10 transition-colors">
              <Users className="h-4 w-4 mr-1" /> Comunidad
            </Button>
          </Link>
          <Link href="/admin/alerts">
            <Button variant="ghost" size="sm" className="font-black uppercase tracking-widest text-[10px] hover:bg-red-100 transition-colors">
              <AlertTriangle className="h-4 w-4 mr-1" /> Alertas
            </Button>
          </Link>
          <Link href="/admin/services">
            <Button variant="ghost" size="sm" className="font-black uppercase tracking-widest text-[10px] hover:bg-emerald-100 transition-colors">
              <Siren className="h-4 w-4 mr-1" /> Servicios
            </Button>
          </Link>
        </nav>
      </header>
      <main className="container mx-auto max-w-5xl px-4 py-12">{children}</main>
    </div>
  )
}
