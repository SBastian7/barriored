import { BusinessCard } from '@/components/directory/business-card'

type Business = {
  id: string; name: string; slug: string; description: string | null
  photos: string[] | null; whatsapp: string | null; address: string | null
  categories: { name: string; slug: string } | null
}

export function FeaturedBusinesses({ businesses, communitySlug }: { businesses: Business[]; communitySlug: string }) {
  if (businesses.length === 0) return null
  return (
    <section className="py-8 px-4">
      <div className="container mx-auto max-w-4xl">
        <h2 className="text-xl font-semibold mb-4">Negocios recientes</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {businesses.map((biz) => (
            <BusinessCard key={biz.id} business={biz} communitySlug={communitySlug} />
          ))}
        </div>
      </div>
    </section>
  )
}
