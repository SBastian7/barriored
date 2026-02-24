import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Breadcrumbs } from '@/components/shared/breadcrumbs'
import { DirectoryView } from '@/components/directory/directory-view'

export async function generateMetadata({ params }: { params: Promise<{ community: string; category: string }> }) {
  const { category: catSlug } = await params
  const supabase = await createClient()
  const { data: cat } = await supabase.from('categories').select('name').eq('slug', catSlug).single()
  return { title: cat ? `${cat.name} | BarrioRed` : 'Categoria' }
}

export default async function CategoryPage({ params }: { params: Promise<{ community: string; category: string }> }) {
  const { community: slug, category: catSlug } = await params
  const supabase = await createClient()

  const [communityRes, categoryRes, categoriesRes] = await Promise.all([
    supabase.from('communities').select('id, name').eq('slug', slug).single(),
    supabase.from('categories').select('id, name').eq('slug', catSlug).single(),
    supabase.from('categories').select('id, name, slug').order('sort_order'),
  ])

  if (!communityRes.data || !categoryRes.data) notFound()

  const { data: businesses } = await supabase
    .from('businesses')
    .select('id, name, slug, description, photos, whatsapp, address, location, created_at, categories(name, slug)')
    .eq('community_id', communityRes.data.id)
    .eq('category_id', categoryRes.data.id)
    .eq('status', 'approved')
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

      <DirectoryView
        businesses={businesses ?? []}
        categories={categoriesRes.data ?? []}
        communitySlug={slug}
        initialCategory={catSlug}
      />
    </div>
  )
}
