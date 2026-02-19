import { createClient } from '@/lib/supabase/server'
import { BusinessCard } from '@/components/directory/business-card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Breadcrumbs } from '@/components/shared/breadcrumbs'

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
    .from('communities').select('id, name').eq('slug', slug).single()

  if (!community) return null

  const { data: categories } = await supabase
    .from('categories').select('id, name, slug').order('sort_order')

  let businessesQuery = supabase
    .from('businesses')
    .select('id, name, slug, description, photos, whatsapp, address, categories(name, slug)')
    .eq('community_id', community.id)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(20)

  // If search query, use RPC
  let businesses
  if (q) {
    const { data } = await supabase.rpc('search_businesses', { query: q, comm_id: community.id })
    businesses = data ?? []
  } else {
    const { data } = await businessesQuery
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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <h1 className="text-5xl md:text-7xl font-heading font-black uppercase tracking-tighter italic text-shadow-md">
          {q ? (
            <>Resultados para <span className="text-primary underline">"{q}"</span></>
          ) : (
            <>Directorio <span className="text-primary italic">Local</span></>
          )}
        </h1>
      </div>

      <div className="flex flex-wrap gap-3 mb-12">
        <Link href={`/${slug}/directory`}>
          <Badge variant={!q ? 'default' : 'outline'} className="text-sm px-6 py-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            Todos
          </Badge>
        </Link>
        {categories?.map((cat) => (
          <Link key={cat.id} href={`/${slug}/directory/${cat.slug}`}>
            <Badge variant="secondary" className="text-sm px-6 py-2">
              {cat.name}
            </Badge>
          </Link>
        ))}
      </div>

      {businesses.length === 0 ? (
        <div className="text-center py-20 border-4 border-dashed border-black bg-white/50">
          <p className="text-2xl font-black uppercase italic tracking-tighter text-black/40">No se encontraron negocios</p>
          <p className="font-bold text-black/60 mt-2">Intenta con otra búsqueda o categoría.</p>
        </div>
      ) : (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {businesses.map((biz: any) => (
            <BusinessCard key={biz.id} business={biz} communitySlug={slug} />
          ))}
        </div>
      )}
    </div>
  )
}
