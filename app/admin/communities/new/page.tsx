import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CommunityForm } from '@/components/admin/community-form'

export default async function NewCommunityPage() {
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
    .single()

  if (!profile?.is_super_admin) {
    redirect('/admin')
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-2">
          Nueva Comunidad
        </h1>
        <p className="text-muted-foreground">
          Crea una nueva comunidad en la plataforma
        </p>
      </div>

      <CommunityForm mode="create" />
    </div>
  )
}
