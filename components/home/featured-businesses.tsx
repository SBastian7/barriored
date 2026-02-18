import { BusinessCard } from '@/components/directory/business-card'

type Business = {
  id: string; name: string; slug: string; description: string | null
  photos: string[] | null; whatsapp: string | null; address: string | null
  categories: { name: string; slug: string } | null
}

export function FeaturedBusinesses({ businesses, communitySlug }: { businesses: Business[]; communitySlug: string }) {
  if (businesses.length === 0) return null
  return (
    <section className="py-20 px-4">
      <div className="container mx-auto max-w-5xl">
        <h2 className="text-3xl font-heading font-black uppercase italic mb-10 tracking-tight">
          Negocios <span className="text-primary underline decoration-4 underline-offset-4">Destacados</span>
        </h2>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {businesses.map((biz) => (
            <BusinessCard key={biz.id} business={biz} communitySlug={communitySlug} />
          ))}
        </div>
      </div>
    </section>
  )
}
