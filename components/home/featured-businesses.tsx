import Link from 'next/link'
import { BusinessCard } from '@/components/directory/business-card'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

type Business = {
  id: string; name: string; slug: string; description: string | null
  photos: string[] | null; whatsapp: string | null; address: string | null
  categories: { name: string; slug: string } | null
}

export function FeaturedBusinesses({ businesses, communitySlug }: { businesses: Business[]; communitySlug: string }) {
  if (businesses.length === 0) return null
  return (
    <section className="py-12 px-4 bg-muted/30">
      <div className="container mx-auto max-w-5xl">
        <div className="flex items-end justify-between mb-8">
          <h2 className="text-3xl font-heading font-black uppercase italic tracking-tight">
            Negocios <span className="text-primary underline decoration-4 underline-offset-4">Recientes</span>
          </h2>
          <Link href={`/${communitySlug}/directory`}>
            <Button variant="ghost" className="font-black uppercase text-[11px] tracking-widest gap-1">
              Ver todos <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {businesses.map((biz) => (
            <BusinessCard key={biz.id} business={biz} communitySlug={communitySlug} />
          ))}
        </div>
        <div className="text-center mt-12">
          <Link href={`/${communitySlug}/directory`}>
            <Button size="lg" className="h-14 px-10 text-base border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all font-black uppercase tracking-tight">
              Ver directorio completo <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
