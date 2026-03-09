import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { CommunityEditTabs } from '@/components/admin/community-edit-tabs'

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
  const { data: community } = await supabase
    .from('communities')
    .select('*')
    .eq('id', id)
    .single()

  if (!community) {
    redirect('/admin/communities')
  }

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
