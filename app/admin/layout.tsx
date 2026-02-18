import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Store, Tag } from 'lucide-react'

export const metadata = { title: 'Admin | BarrioRed' }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?returnUrl=/admin')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-4 h-14 flex items-center gap-4">
        <Link href="/"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <span className="font-bold text-blue-900">Admin</span>
        <nav className="flex gap-2 ml-4">
          <Link href="/admin/businesses"><Button variant="ghost" size="sm"><Store className="h-4 w-4 mr-1" /> Negocios</Button></Link>
          <Link href="/admin/categories"><Button variant="ghost" size="sm"><Tag className="h-4 w-4 mr-1" /> Categorias</Button></Link>
        </nav>
      </header>
      <main className="container mx-auto max-w-4xl px-4 py-6">{children}</main>
    </div>
  )
}
