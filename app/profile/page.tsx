import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfileView } from './profile-view'

export const metadata = {
  title: 'Mi Perfil | BarrioRed',
  description: 'Administra tu perfil de usuario',
}

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, phone, avatar_url, community_id, role')
    .eq('id', user.id)
    .single() as { data: any }

  const { data: communities } = await supabase
    .from('communities')
    .select('id, name')
    .order('name') as { data: any }

  return (
    <ProfileView
      profile={{
        full_name: profile?.full_name || null,
        phone: profile?.phone || null,
        avatar_url: profile?.avatar_url || null,
        community_id: profile?.community_id || null,
        email: user.email || '',
        role: profile?.role || 'user',
      }}
      communities={communities || []}
    />
  )
}
