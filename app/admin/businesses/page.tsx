import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye } from 'lucide-react'

export default async function AdminBusinessesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('community_id').eq('id', user!.id).single()

  const { data: businesses } = await supabase
    .from('businesses')
    .select('id, name, status, created_at, categories(name), profiles(full_name)')
    .eq('community_id', profile!.community_id!)
    .order('created_at', { ascending: false })

  const pending = businesses?.filter((b) => b.status === 'pending') ?? []
  const approved = businesses?.filter((b) => b.status === 'approved') ?? []

  return (
    <div className="space-y-12">
      <div className="flex items-end justify-between border-b-4 border-black pb-4">
        <h1 className="text-4xl font-heading font-black uppercase italic tracking-tighter">
          Gestión de <span className="text-primary italic">Negocios</span>
        </h1>
      </div>

      {pending.length > 0 && (
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight italic mb-6 flex items-center gap-3">
            <span className="bg-primary text-white px-3 py-1 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">{pending.length}</span>
            Pendientes de Aprobación
          </h2>
          <div className="grid gap-4">
            {pending.map((biz) => (
              <Card key={biz.id} className="border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white rounded-none hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all overflow-hidden group">
                <CardContent className="flex items-center justify-between p-6">
                  <div>
                    <p className="text-2xl font-heading font-black uppercase italic tracking-tighter group-hover:text-primary transition-colors">{biz.name}</p>
                    <p className="text-xs font-black uppercase tracking-widest text-black/50 italic">
                      {(biz.categories as any)?.name} — Por <span className="text-black">{(biz.profiles as any)?.full_name}</span>
                    </p>
                  </div>
                  <Link href={`/admin/businesses/${biz.id}`}>
                    <Button size="lg" className="border-2 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-black uppercase tracking-widest text-xs h-12 px-6">
                      <Eye className="h-5 w-5 mr-2" /> Revisar
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-2xl font-black uppercase tracking-tight italic mb-6 flex items-center gap-3 text-black/40">
          Aprobados ({approved.length})
        </h2>
        <div className="grid gap-4">
          {approved.map((biz) => (
            <Card key={biz.id} className="border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-white/50 rounded-none grayscale hover:grayscale-0 transition-all">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-xl font-heading font-black uppercase italic tracking-tighter">{biz.name}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-black/40 italic">{(biz.categories as any)?.name}</p>
                </div>
                <Badge variant="outline" className="opacity-50">Activo</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
