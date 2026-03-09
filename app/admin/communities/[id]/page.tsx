import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CommunityStatsPanel } from '@/components/admin/community-stats-panel'
import { CommunityStaffPanel } from '@/components/admin/community-staff-panel'
import { Edit, ArrowLeft } from 'lucide-react'

export default async function CommunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
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

  // Fetch community details (server-side via Supabase)
  const communityResult = await supabase
    .from('communities')
    .select('*')
    .eq('id', id)
    .single()

  if (!communityResult.data) {
    redirect('/admin/communities')
  }

  const communityData = communityResult.data

  // Get staff members
  const { data: staff } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, role, created_at')
    .eq('community_id', id)
    .in('role', ['admin', 'moderator'])
    .order('created_at', { ascending: false })

  // Get stats
  const { data: stats } = await (supabase as any).rpc(
    'get_community_stats',
    { community_uuid: id }
  )

  const community = {
    id: communityData.id,
    name: communityData.name,
    slug: communityData.slug,
    municipality: communityData.municipality,
    department: communityData.department,
    description: communityData.description,
    logo_url: communityData.logo_url,
    primary_color: communityData.primary_color,
    cover_image_url: communityData.cover_image_url,
    is_active: communityData.is_active,
    created_at: communityData.created_at,
    staff: staff || [],
    stats: stats?.[0] || {
      businesses_count: 0,
      users_count: 0,
      admins_count: 0,
      posts_count: 0,
      alerts_count: 0,
    },
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/admin/communities">
          <Button variant="outline" className="brutalist-button" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>

        <div className="flex-1">
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-4xl font-black uppercase tracking-tighter italic">
              {community.name}
            </h1>
            {community.is_active ? (
              <Badge className="bg-green-500">Activa</Badge>
            ) : (
              <Badge variant="outline">Inactiva</Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            {community.municipality}, {community.department}
          </p>
        </div>

        <Link href={`/admin/communities/${id}/edit`}>
          <Button className="brutalist-button">
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="stats" className="space-y-6">
        <TabsList className="brutalist-card inline-flex">
          <TabsTrigger
            value="stats"
            className="uppercase tracking-widest font-bold text-xs"
          >
            Estadísticas
          </TabsTrigger>
          <TabsTrigger
            value="staff"
            className="uppercase tracking-widest font-bold text-xs"
          >
            Staff
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stats">
          <CommunityStatsPanel community={community} />
        </TabsContent>

        <TabsContent value="staff">
          <CommunityStaffPanel
            communityId={id}
            staff={community.staff || []}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
