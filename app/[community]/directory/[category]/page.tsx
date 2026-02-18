import { createClient } from '@/lib/supabase/server'
import { BusinessCard } from '@/components/directory/business-card'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

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
    supabase.from('communities').select('id').eq('slug', slug).single(),
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
    <div className="container mx-auto max-w-4xl px-4 py-6">
      <Link href={`/${slug}/directory`}>
        <Button variant="ghost" size="sm" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> Directorio
        </Button>
      </Link>
      <h1 className="text-2xl font-bold mb-6">{categoryRes.data.name}</h1>

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
