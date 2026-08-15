import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CommunityProvider } from '@/components/community/community-provider'
import { TopBar } from '@/components/layout/top-bar'
import { BottomNav } from '@/components/layout/bottom-nav'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import type { CommunityData } from '@/lib/types'

export const metadata = {
  title: 'Mi Perfil | BarrioRed',
  description: 'Administra tu perfil de usuario',
}

export default async function ProfileLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('community_id')
    .eq('id', user.id)
    .single() as { data: { community_id: string | null } | null }

  let community: CommunityData | null = null
  if (profile?.community_id) {
    const { data } = await supabase
      .from('communities')
      .select('id, name, slug, municipality, department, description, logo_url, primary_color, cover_image_url')
      .eq('id', profile.community_id)
      .eq('is_active', true)
      .single<CommunityData>()
    community = data
  }

  if (community) {
    return (
      <CommunityProvider community={community}>
        <div className="min-h-screen pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
          <TopBar />
          <main>{children}</main>
          <BottomNav />
        </div>
      </CommunityProvider>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b-4 border-black px-4 h-16 flex items-center gap-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-50 sticky top-0">
        <Link href="/">
          <Button variant="outline" size="icon" className="border-2 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-secondary">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <span className="font-heading font-black uppercase tracking-tighter italic text-2xl">
          Barrio<span className="text-primary italic">Red</span>
        </span>
      </header>
      <main>{children}</main>
    </div>
  )
}
