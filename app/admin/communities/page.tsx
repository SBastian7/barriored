import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, MapPin, Users, Building2 } from 'lucide-react'

export default async function CommunitiesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .single<{ is_super_admin: boolean }>()

  if (!profile?.is_super_admin) {
    redirect('/admin')
  }

  // Fetch communities with stats (server-side via Supabase)
  const { data: communitiesData } = await supabase
    .from('communities')
    .select('*')
    .order('created_at', { ascending: false })

  // Get stats for each community
  const communities = await Promise.all(
    (communitiesData || []).map(async (community: any) => {
      const { data: stats } = await (supabase as any).rpc(
        'get_community_stats',
        { community_uuid: community.id }
      )

      return {
        ...community,
        stats: stats?.[0] || {
          businesses_count: 0,
          users_count: 0,
          admins_count: 0,
          posts_count: 0,
          alerts_count: 0,
        },
      }
    })
  )

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-2">
            Comunidades
          </h1>
          <p className="text-muted-foreground">
            Gestiona todas las comunidades de la plataforma
          </p>
        </div>
        <Link href="/admin/communities/new">
          <Button className="brutalist-button">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Comunidad
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {communities?.map((community: any) => (
          <Link
            key={community.id}
            href={`/admin/communities/${community.id}`}
            className="brutalist-card hover:translate-x-1 hover:translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all"
          >
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter italic">
                    {community.name}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <MapPin className="h-4 w-4" />
                    {community.municipality}, {community.department}
                  </div>
                </div>
                {community.is_active ? (
                  <Badge className="bg-green-500">Activa</Badge>
                ) : (
                  <Badge variant="outline">Inactiva</Badge>
                )}
              </div>

              <p className="text-sm line-clamp-2">{community.description}</p>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t-2 border-black">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-widest font-bold">
                    <Building2 className="h-3 w-3" />
                    Negocios
                  </div>
                  <div className="text-2xl font-black">
                    {community.stats?.businesses_count || 0}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-widest font-bold">
                    <Users className="h-3 w-3" />
                    Usuarios
                  </div>
                  <div className="text-2xl font-black">
                    {community.stats?.users_count || 0}
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {communities?.length === 0 && (
        <div className="brutalist-card p-12 text-center">
          <p className="text-muted-foreground mb-4">
            No hay comunidades creadas aún
          </p>
          <Link href="/admin/communities/new">
            <Button className="brutalist-button">Crear Primera Comunidad</Button>
          </Link>
        </div>
      )}
    </div>
  )
}
