import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus, Edit } from 'lucide-react'

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  pending: { label: 'Pendiente', variant: 'secondary' },
  approved: { label: 'Aprobado', variant: 'default' },
  rejected: { label: 'Rechazado', variant: 'destructive' },
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles').select('community_id, communities(slug)').eq('id', user!.id).single()

  const { data: businesses } = await supabase
    .from('businesses')
    .select('id, name, status, created_at, categories(name)')
    .eq('owner_id', user!.id)
    .order('created_at', { ascending: false })

  const communitySlug = (profile?.communities as any)?.slug

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Mis negocios</h1>
        {communitySlug && (
          <Link href={`/${communitySlug}/register`}>
            <Button><Plus className="h-4 w-4 mr-2" /> Registrar negocio</Button>
          </Link>
        )}
      </div>

      {(!businesses || businesses.length === 0) ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            No tienes negocios registrados aun.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {businesses.map((biz) => {
            const s = STATUS_LABELS[biz.status] ?? STATUS_LABELS.pending
            return (
              <Card key={biz.id}>
                <CardHeader className="flex flex-row items-center justify-between py-4">
                  <div>
                    <CardTitle className="text-lg">{biz.name}</CardTitle>
                    <p className="text-sm text-gray-500">{(biz.categories as any)?.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={s.variant}>{s.label}</Badge>
                    <Link href={`/dashboard/business/${biz.id}/edit`}>
                      <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                    </Link>
                  </div>
                </CardHeader>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
