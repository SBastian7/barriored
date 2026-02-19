import { createClient } from '@/lib/supabase/server'
import { BusinessCard } from '@/components/directory/business-card'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Breadcrumbs } from '@/components/shared/breadcrumbs'

export async function generateMetadata({ params }: { params: Promise<{ community: string; category: string }> }) {
  const { category: catSlug } = await params
  const supabase = await createClient()
  const { data: cat } = await supabase.from('categories').select('name').eq('slug', catSlug).single()
  return { title: cat ? `${cat.name} | BarrioRed` : 'Categoria' }
}

export default async function CategoryPage({ params }: { params: Promise<{ community: string; category: string }> }) {
  const { community: slug, category: catSlug } = await params
  const supabase = await createClient()

  const [communityRes, categoryRes] = await Promise.all([
    supabase.from('communities').select('id, name').eq('slug', slug).single(),
    supabase.from('categories').select('id, name').eq('slug', catSlug).single(),
  ])

  if (!communityRes.data || !categoryRes.data) notFound()

  const { data: businesses } = await supabase
    .from('businesses')
    .select('id, name, slug, description, photos, whatsapp, address, categories(name, slug)')
    .eq('community_id', communityRes.data.id)
    .eq('category_id', categoryRes.data.id)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <Breadcrumbs
        items={[
          { label: communityRes.data.name, href: `/${slug}` },
          { label: 'Directorio', href: `/${slug}/directory` },
          { label: categoryRes.data.name, active: true }
        ]}
      />
      <h1 className="text-5xl md:text-7xl font-heading font-black uppercase tracking-tighter italic text-shadow-md mb-12">
        {categoryRes.data.name}
      </h1>

      {(!businesses || businesses.length === 0) ? (
        <p className="text-gray-500 text-center py-12">No hay negocios en esta categoria.</p>
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
