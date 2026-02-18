import { createClient } from '@/lib/supabase/server'
import { BusinessCard } from '@/components/directory/business-card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

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
    .from('communities').select('id').eq('slug', slug).single()

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
    <div className="container mx-auto max-w-4xl px-4 py-6">
      <h1 className="text-2xl font-bold mb-4">
        {q ? `Resultados para "${q}"` : 'Directorio'}
      </h1>

      <div className="flex flex-wrap gap-2 mb-6">
        <Link href={`/${slug}/directory`}>
          <Badge variant={!q ? 'default' : 'secondary'}>Todos</Badge>
        </Link>
        {categories?.map((cat) => (
          <Link key={cat.id} href={`/${slug}/directory/${cat.slug}`}>
            <Badge variant="secondary">{cat.name}</Badge>
          </Link>
        ))}
      </div>

      {businesses.length === 0 ? (
        <p className="text-gray-500 text-center py-12">No se encontraron negocios.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {businesses.map((biz: any) => (
            <BusinessCard key={biz.id} business={biz} communitySlug={slug} />
          ))}
        </div>
      )}
    </div>
  )
}
