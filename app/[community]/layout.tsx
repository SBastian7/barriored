import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CommunityProvider } from '@/components/community/community-provider'
import { TopBar } from '@/components/layout/top-bar'
import { BottomNav } from '@/components/layout/bottom-nav'

export async function generateMetadata({ params }: { params: Promise<{ community: string }> }) {
  const { community: slug } = await params
  const supabase = await createClient()
  const { data: community } = await supabase
    .from('communities')
    .select('name, municipality')
    .eq('slug', slug)
    .single()

  if (!community) return {}
  return {
    title: `${community.name} | BarrioRed`,
    description: `Directorio comercial y red vecinal de ${community.name}, ${community.municipality}`,
  }
}

export default async function CommunityLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ community: string }>
}) {
  const { community: slug } = await params
  const supabase = await createClient()
  const { data: community } = await supabase
    .from('communities')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (!community) notFound()

  return (
    <CommunityProvider community={community}>
      <div className="min-h-screen pb-16 md:pb-0">
        <TopBar />
        <main>{children}</main>
        <BottomNav />
      </div>
    </CommunityProvider>
  )
}
