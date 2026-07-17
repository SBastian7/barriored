import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { CommunityEditTabs } from '@/components/admin/community-edit-tabs'
import type { Database } from '@/lib/types/database'

type CommunityRow = Database['public']['Tables']['communities']['Row']

export default async function CommunityEditPage({
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

  // Fetch community details
  // TypeScript workaround: explicit cast to handle Supabase type inference issue
  const { data: rawData, error } = await (supabase
    .from('communities')
    .select(
      'id, name, slug, municipality, department, description, logo_url, primary_color, is_active, created_at, cover_image_url, primary_admin_id, boundary:boundary::json'
    )
    .eq('id', id)
    .single() as any)

  if (error || !rawData) {
    redirect('/admin/communities')
  }

  const community = rawData as CommunityRow

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href={`/admin/communities/${id}`}>
          <Button variant="outline" className="brutalist-button" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>

        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-2">
            Editar Comunidad
          </h1>
          <p className="text-muted-foreground">{community.name}</p>
        </div>
      </div>

      <CommunityEditTabs communityId={id} initialData={community} />
    </div>
  )
}
