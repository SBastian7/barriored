import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { Breadcrumbs } from '@/components/shared/breadcrumbs'
import { DirectoryView } from '@/components/directory/directory-view'
import { BannerRotator } from '@/components/banners/banner-rotator'

const getDirectoryData = unstable_cache(
  async (slug: string) => {
    const admin = createAdminClient()

    const { data: community } = await (admin as any)
      .from('communities')
      .select('id, name')
      .eq('slug', slug)
      .single()

    if (!community) return null

    const { data: categories } = await (admin as any)
      .from('categories')
      .select('id, name, slug')
      .order('sort_order')

    const { data: businesses } = await (admin as any)
      .from('businesses')
      .select('id, name, slug, description, photos, whatsapp, address, location, created_at, is_featured, categories(name, slug)')
      .eq('community_id', community.id)
      .eq('status', 'approved')
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false })

    return { community, categories: categories ?? [], businesses: businesses ?? [] }
  },
  ['directory-data'],
  { revalidate: 3600 }
)

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

  // No search — use cached data
  if (!q) {
    const cached = await getDirectoryData(slug)
    if (!cached) return null
    const { community, categories, businesses } = cached

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
            Directorio <span className="text-primary italic">Local</span>
          </h1>
        </div>

        <div className="mb-8">
          <BannerRotator placement="directory" communityId={community.id} />
        </div>

        <DirectoryView
          businesses={businesses}
          categories={categories}
          communitySlug={slug}
          initialQuery={undefined}
        />
      </div>
    )
  }

  // With search — use request-scoped client (cookies needed for RLS)
  const supabase = await createClient()

  const { data: community } = await supabase
    .from('communities').select('id, name').eq('slug', slug).single<{ id: string; name: string }>()

  if (!community) return null

  const { data: categories } = await supabase
    .from('categories').select('id, name, slug').order('sort_order')

  let businesses: any[] = []
  const { data } = await (supabase.rpc as any)('search_businesses', { query: q, comm_id: community.id })
  // RPC returns raw rows - fetch with category join
  if (data && data.length > 0) {
    const ids = data.map((b: any) => b.id)
    const { data: full } = await supabase
      .from('businesses')
      .select('id, name, slug, description, photos, whatsapp, address, location, created_at, is_featured, categories(name, slug)')
      .in('id', ids)
      .eq('status', 'approved')
    businesses = full ?? []
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
          Resultados para <span className="text-primary underline">&ldquo;{q}&rdquo;</span>
        </h1>
      </div>

      <div className="mb-8">
        <BannerRotator placement="directory" communityId={community.id} />
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
