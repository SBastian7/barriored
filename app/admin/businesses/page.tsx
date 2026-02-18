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
    <div>
      <h1 className="text-2xl font-bold mb-6">Negocios</h1>

      {pending.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Pendientes de aprobacion ({pending.length})</h2>
          <div className="space-y-2">
            {pending.map((biz) => (
              <Card key={biz.id}>
                <CardContent className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">{biz.name}</p>
                    <p className="text-sm text-gray-500">{(biz.categories as any)?.name} - por {(biz.profiles as any)?.full_name}</p>
                  </div>
                  <Link href={`/admin/businesses/${biz.id}`}>
                    <Button size="sm"><Eye className="h-4 w-4 mr-1" /> Revisar</Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <h2 className="text-lg font-semibold mb-3">Aprobados ({approved.length})</h2>
      <div className="space-y-2">
        {approved.map((biz) => (
          <Card key={biz.id}>
            <CardContent className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium">{biz.name}</p>
                <p className="text-sm text-gray-500">{(biz.categories as any)?.name}</p>
              </div>
              <Badge>Aprobado</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
