import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Breadcrumbs } from '@/components/shared/breadcrumbs'
import { DirectoryView } from '@/components/directory/directory-view'
import { BannerRotator } from '@/components/banners/banner-rotator'

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

export async function generateMetadata({ params }: { params: Promise<{ community: string; category: string }> }) {
  const { category: catSlug } = await params
  const supabase = await createClient()
  const { data: cat } = await supabase.from('categories').select('name').eq('slug', catSlug).single<{ name: string }>()
  return { title: cat ? `${cat.name} | BarrioRed` : 'Categoria' }
}

export default async function CategoryPage({ params }: { params: Promise<{ community: string; category: string }> }) {
  const { community: slug, category: catSlug } = await params
  const supabase = await createClient()

  const [communityRes, categoryRes, categoriesRes] = await Promise.all([
    supabase.from('communities').select('id, name, boundary').eq('slug', slug).single<{ id: string; name: string; boundary: any }>(),
    supabase.from('categories').select('id, name').eq('slug', catSlug).single<{ id: string; name: string }>(),
    supabase.from('categories').select('id, name, slug').order('sort_order'),
  ])

  if (!communityRes.data || !categoryRes.data) notFound()

  const { data: businesses } = await supabase
    .from('businesses')
    .select('id, name, slug, description, photos, whatsapp, address, location, created_at, is_featured, categories(name, slug)')
    .eq('community_id', communityRes.data.id)
    .eq('category_id', categoryRes.data.id)
    .eq('status', 'approved')
    .order('is_featured', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <Breadcrumbs
        items={[
          { label: communityRes.data.name, href: `/${slug}` },
          { label: 'Directorio', href: `/${slug}/directory` },
          { label: categoryRes.data.name, active: true }
        ]}
      />
      <h1 className="text-5xl md:text-7xl font-heading font-black uppercase tracking-tighter italic text-shadow-md mb-8">
        {categoryRes.data.name}
      </h1>

      <div className="mb-8">
        <BannerRotator placement="directory" communityId={communityRes.data.id} />
      </div>

      <DirectoryView
        businesses={businesses ?? []}
        categories={categoriesRes.data ?? []}
        communitySlug={slug}
        initialCategory={catSlug}
        communityBoundary={parseBoundary(communityRes.data.boundary)}
        communityCenter={boundaryCentroid(parseBoundary(communityRes.data.boundary))}
      />
    </div>
  )
}
