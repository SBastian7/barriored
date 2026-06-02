import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { DirectoryView } from '@/components/directory/directory-view'

function parseBoundary(boundary: any): [number, number][] {
  const coords = boundary?.coordinates?.[0]
  if (!Array.isArray(coords) || !coords.length) return []
  return coords.map(([lng, lat]: number[]) => [lat, lng] as [number, number])
}

function boundaryCentroid(pts: [number, number][]): { lat: number; lng: number } | undefined {
  if (!pts.length) return undefined
  const n = pts.length
  return { lat: pts.reduce((s, [lat]) => s + lat, 0) / n, lng: pts.reduce((s, [, lng]) => s + lng, 0) / n }
}

function getDirectoryData(slug: string) {
  return unstable_cache(
    async () => {
      const admin = createAdminClient()

      const { data: community } = await (admin as any)
        .from('communities')
        .select('id, name, slug, boundary')
        .eq('slug', slug)
        .single()

      if (!community) return null

      const communityBoundary = parseBoundary(community.boundary)
      const communityCenter = boundaryCentroid(communityBoundary)

      const { data: categories } = await (admin as any)
        .from('categories')
        .select('id, name, slug')
        .order('sort_order')

      const { data: businesses } = await (admin as any)
        .from('businesses')
        .select('id, name, slug, description, photos, whatsapp, address, latitude, longitude, location, created_at, is_featured, categories(name, slug)')
        .eq('community_id', community.id)
        .eq('status', 'approved')
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false })

      return { community, categories: categories ?? [], businesses: businesses ?? [], communityBoundary, communityCenter }
    },
    [`directory-${slug}`],
    { revalidate: 3600, tags: [`businesses-${slug}`] }
  )()
}

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

  if (!q) {
    const cached = await getDirectoryData(slug)
    if (!cached) return null
    const { community, categories, businesses, communityBoundary, communityCenter } = cached

    return (
      <>
        {/* Title bar */}
        <div className="px-6 md:px-8 py-5 border-b-3 border-black bg-[#FFF7ED]">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="flex gap-1.5 items-center flex-wrap mb-1">
                <span className="font-mono text-[10px] tracking-widest uppercase text-black/50">INICIO</span>
                <span className="text-black/30">›</span>
                <span className="font-mono text-[10px] tracking-widest uppercase text-black/50">{community.name.toUpperCase()}</span>
                <span className="text-black/30">›</span>
                <span className="inline-block bg-[#E11D48] text-white font-mono text-[10px] tracking-widest uppercase px-2 py-0.5">DIRECTORIO</span>
              </div>
              <h1 className="font-heading font-black italic uppercase text-[clamp(32px,5vw,56px)] leading-[0.9] tracking-tight">
                DIRECTORIO <span className="text-[#E11D48]">LOCAL</span>
                <span className="font-mono text-xs not-italic ml-3 align-middle tracking-widest opacity-50">
                  {businesses.length} NEGOCIOS
                </span>
              </h1>
            </div>
          </div>
        </div>

        <DirectoryView
          businesses={businesses}
          categories={categories}
          communitySlug={slug}
          communityBoundary={communityBoundary}
          communityCenter={communityCenter}
        />
      </>
    )
  }

  // Search mode
  const supabase = await createClient()
  const { data: community } = await supabase
    .from('communities').select('id, name, slug, boundary').eq('slug', slug).single<{ id: string; name: string; slug: string; boundary: any }>()

  if (!community) return null

  const { data: categories } = await supabase
    .from('categories').select('id, name, slug').order('sort_order')

  let businesses: any[] = []
  const { data } = await (supabase.rpc as any)('search_businesses', { query: q, comm_id: community.id })
  if (data && data.length > 0) {
    const ids = data.map((b: any) => b.id)
    const { data: full } = await supabase
      .from('businesses')
      .select('id, name, slug, description, photos, whatsapp, address, latitude, longitude, location, created_at, is_featured, categories(name, slug)')
      .in('id', ids)
      .eq('status', 'approved')
    businesses = full ?? []
  }

  return (
    <>
      <div className="px-6 md:px-8 py-5 border-b-3 border-black bg-[#FFF7ED]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex gap-1.5 items-center flex-wrap mb-1">
              <span className="font-mono text-[10px] tracking-widest uppercase text-black/50">INICIO</span>
              <span className="text-black/30">›</span>
              <span className="font-mono text-[10px] tracking-widest uppercase text-black/50">{community.name.toUpperCase()}</span>
              <span className="text-black/30">›</span>
              <span className="inline-block bg-[#E11D48] text-white font-mono text-[10px] tracking-widest uppercase px-2 py-0.5">DIRECTORIO</span>
            </div>
            <h1 className="font-heading font-black italic uppercase text-[clamp(28px,4vw,48px)] leading-[0.9] tracking-tight">
              RESULTADOS PARA{' '}
              <span className="text-[#E11D48] underline decoration-[3px] underline-offset-4">&ldquo;{q}&rdquo;</span>
            </h1>
          </div>
        </div>
      </div>

      <DirectoryView
        businesses={businesses}
        categories={categories ?? []}
        communitySlug={slug}
        initialQuery={q}
        communityBoundary={parseBoundary(community.boundary)}
        communityCenter={boundaryCentroid(parseBoundary(community.boundary))}
      />
    </>
  )
}
