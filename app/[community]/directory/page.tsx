import { createClient } from '@/lib/supabase/server'
import { Breadcrumbs } from '@/components/shared/breadcrumbs'
import { DirectoryView } from '@/components/directory/directory-view'

export async function generateMetadata({ params }: { params: Promise<{ community: string }> }) {
  const { community: slug } = await params
  return { title: `Directorio | BarrioRed` }
}

export default async function DirectoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ community: string }>
  searchParams: Promise<{ q?: string }>
}) {
  const { community: slug } = await params
  const { q } = await searchParams
  const supabase = await createClient()

  const { data: community } = await supabase
    .from('communities').select('id, name').eq('slug', slug).single<{ id: string; name: string }>()

  if (!community) return null

  const { data: categories } = await supabase
    .from('categories').select('id, name, slug').order('sort_order')

  // Fetch businesses - either search or all
  let businesses: any[] = []
  if (q) {
    const { data } = await (supabase.rpc as any)('search_businesses', { query: q, comm_id: community.id })
    // RPC returns raw rows - fetch with category join
    if (data && data.length > 0) {
      const ids = data.map((b: any) => b.id)
      const { data: full } = await supabase
        .from('businesses')
        .select('id, name, slug, description, photos, whatsapp, address, location, created_at, categories(name, slug)')
        .in('id', ids)
        .eq('status', 'approved')
      businesses = full ?? []
    } else {
      businesses = []
    }
  } else {
    const { data } = await supabase
      .from('businesses')
      .select('id, name, slug, description, photos, whatsapp, address, location, created_at, categories(name, slug)')
      .eq('community_id', community.id)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(50)
    businesses = data ?? []
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <Breadcrumbs
        items={[
          { label: community.name, href: `/${slug}` },
          { label: 'Directorio', active: true }
        ]}
      />
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <h1 className="text-5xl md:text-7xl font-heading font-black uppercase tracking-tighter italic text-shadow-md">
          {q ? (
            <>Resultados para <span className="text-primary underline">&ldquo;{q}&rdquo;</span></>
          ) : (
            <>Directorio <span className="text-primary italic">Local</span></>
          )}
        </h1>
      </div>

      <DirectoryView
        businesses={businesses}
        categories={categories ?? []}
        communitySlug={slug}
        initialQuery={q}
      />
    </div>
  )
}
